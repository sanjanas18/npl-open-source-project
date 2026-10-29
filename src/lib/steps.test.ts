import { describe, expect, it, vi } from "vitest";
import {
  findDanglingDependencies,
  groupIntoChains,
  mergeVariants,
  orderPhases,
  orderTracks,
  validateHeaders,
  type Step,
} from "./steps";

// minimal Step factory — only the fields each test actually cares about
// need to be set explicitly
function makeStep(overrides: Partial<Step> & Pick<Step, "id" | "track" | "phase" | "name">): Step {
  return {
    phaseNumber: Number.MAX_SAFE_INTEGER,
    description: "",
    dependsOn: [],
    formLinks: [],
    ...overrides,
  };
}

describe("orderPhases", () => {
  it("orders phases by dependency, even when it contradicts the phase number", () => {
    // Application is labeled phase 3, but depends on Compliance (labeled
    // phase 6), which depends on Facility Inspection (phase 5) and Staff
    // Preparation (phase 4) — the real NYC data bug this was built to fix.
    const steps = [
      makeStep({ id: "1", track: "Center", phase: "Determine Care Type", name: "a", phaseNumber: 1 }),
      makeStep({ id: "2", track: "Center", phase: "Process Initiation", name: "b", phaseNumber: 2, dependsOn: ["1"] }),
      makeStep({ id: "3", track: "Center", phase: "Facility Inspection", name: "c", phaseNumber: 5, dependsOn: ["2"] }),
      makeStep({ id: "4", track: "Center", phase: "Staff Preparation", name: "d", phaseNumber: 4 }),
      makeStep({ id: "5", track: "Center", phase: "Compliance", name: "e", phaseNumber: 6, dependsOn: ["3", "4"] }),
      makeStep({ id: "6", track: "Center", phase: "Application", name: "f", phaseNumber: 3, dependsOn: ["5"] }),
      makeStep({ id: "7", track: "Center", phase: "Post-Application", name: "g", phaseNumber: 7, dependsOn: ["6"] }),
    ];

    const order = orderPhases(steps);
    expect(order.indexOf("Application")).toBeGreaterThan(order.indexOf("Compliance"));
    expect(order.indexOf("Application")).toBeGreaterThan(order.indexOf("Facility Inspection"));
    expect(order.indexOf("Application")).toBeGreaterThan(order.indexOf("Staff Preparation"));
    expect(order[0]).toBe("Determine Care Type");
    expect(order[order.length - 1]).toBe("Post-Application");
  });

  it("falls back to the phase number when no dependency relates two phases", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "B", name: "x", phaseNumber: 2 }),
      makeStep({ id: "2", track: "Home", phase: "A", name: "y", phaseNumber: 1 }),
    ];
    expect(orderPhases(steps)).toEqual(["A", "B"]);
  });

  it("falls back to CSV row order when neither dependencies nor numbers differentiate", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "Second", name: "x" }),
      makeStep({ id: "2", track: "Home", phase: "First", name: "y" }),
    ];
    // no phaseNumber set (defaults to MAX_SAFE_INTEGER for both), no
    // dependency relationship — only row order can break the tie
    expect(orderPhases(steps)).toEqual(["Second", "First"]);
  });

  it("never hangs on a circular phase-level dependency and still returns every phase", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "A", name: "x", dependsOn: ["2"] }),
      makeStep({ id: "2", track: "Home", phase: "B", name: "y", dependsOn: ["1"] }),
    ];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const order = orderPhases(steps, "test/Home");
    warn.mockRestore();

    expect(new Set(order)).toEqual(new Set(["A", "B"]));
    expect(order).toHaveLength(2);
  });

  it("ignores dependencies within the same phase when building phase order", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "Only", name: "x" }),
      makeStep({ id: "2", track: "Home", phase: "Only", name: "y", dependsOn: ["1"] }),
    ];
    expect(orderPhases(steps)).toEqual(["Only"]);
  });

  it("returns an empty list for an empty step array", () => {
    expect(orderPhases([])).toEqual([]);
  });
});

describe("orderTracks", () => {
  it("always puts Center before Home, regardless of which appears first in the CSV", () => {
    const homeFirst = [
      makeStep({ id: "1", track: "Home", phase: "P", name: "a" }),
      makeStep({ id: "2", track: "Center", phase: "P", name: "b" }),
    ];
    const centerFirst = [
      makeStep({ id: "1", track: "Center", phase: "P", name: "a" }),
      makeStep({ id: "2", track: "Home", phase: "P", name: "b" }),
    ];
    expect(orderTracks(homeFirst)).toEqual(["Center", "Home"]);
    expect(orderTracks(centerFirst)).toEqual(["Center", "Home"]);
  });

  it("falls back to first-seen CSV order for an unrecognized track name", () => {
    const steps = [
      makeStep({ id: "1", track: "SchoolBased", phase: "P", name: "a" }),
      makeStep({ id: "2", track: "Center", phase: "P", name: "b" }),
    ];
    // Center is still prioritized; the unknown track falls in after it
    expect(orderTracks(steps)).toEqual(["Center", "SchoolBased"]);
  });
});

describe("mergeVariants", () => {
  it("merges same track+phase+name steps into one, unioning dependencies", () => {
    const steps = [
      makeStep({ id: "a", track: "Home", phase: "P", name: "Determine license type", providerType: "FCC", dependsOn: ["x"] }),
      makeStep({ id: "b", track: "Home", phase: "P", name: "Determine license type", providerType: "GFCC", dependsOn: ["y"] }),
    ];
    const merged = mergeVariants(steps);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("a+b");
    expect(merged[0].providerType).toBe("FCC / GFCC");
    expect(merged[0].dependsOn.sort()).toEqual(["x", "y"]);
  });

  it("repoints dependents of merged steps at the new combined id", () => {
    const steps = [
      makeStep({ id: "a", track: "Home", phase: "P", name: "Determine license type" }),
      makeStep({ id: "b", track: "Home", phase: "P", name: "Determine license type" }),
      makeStep({ id: "c", track: "Home", phase: "Q", name: "Next step", dependsOn: ["a"] }),
    ];
    const merged = mergeVariants(steps);
    const next = merged.find((s) => s.name === "Next step")!;
    expect(next.dependsOn).toEqual(["a+b"]);
  });

  it("leaves steps with no variant untouched", () => {
    const steps = [makeStep({ id: "a", track: "Home", phase: "P", name: "Solo step" })];
    expect(mergeVariants(steps)).toEqual(steps);
  });
});

describe("validateHeaders", () => {
  const fullHeader = [
    "Step ID (For Dependency List)",
    "Center/Home",
    "Phase",
    "Step",
    "Provider Type",
    "Department",
    "Description",
    "Dependency",
    "Cost",
    "Time to Complete",
    "Processing Time",
    "Renewal",
    "Link to Forms",
    "Government Level",
  ];

  it("passes silently for a complete header row", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => validateHeaders(fullHeader, "nyc")).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("throws a descriptive error when a required column is missing", () => {
    const broken = fullHeader.filter((c) => c !== "Dependency");
    expect(() => validateHeaders(broken, "chicago")).toThrowError(/chicago.*Dependency/);
  });

  it("warns but does not throw when only an optional column is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const missingOptional = fullHeader.filter((c) => c !== "Government Level");
    expect(() => validateHeaders(missingOptional, "chicago")).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("findDanglingDependencies", () => {
  it("flags a Dependency value that doesn't match any known step id", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "P", name: "a", dependsOn: ["2", "typo-3"] }),
      makeStep({ id: "2", track: "Home", phase: "P", name: "b" }),
    ];
    const dangling = findDanglingDependencies(steps);
    expect(dangling).toHaveLength(1);
    expect(dangling[0].depId).toBe("typo-3");
    expect(dangling[0].step.id).toBe("1");
  });

  it("returns an empty array when every dependency resolves", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "P", name: "a", dependsOn: ["2"] }),
      makeStep({ id: "2", track: "Home", phase: "P", name: "b" }),
    ];
    expect(findDanglingDependencies(steps)).toEqual([]);
  });
});

describe("groupIntoChains", () => {
  it("puts dependency-connected steps in one chain, ordered before their dependents", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "P", name: "a" }),
      makeStep({ id: "2", track: "Home", phase: "P", name: "b", dependsOn: ["1"] }),
      makeStep({ id: "3", track: "Home", phase: "P", name: "c", dependsOn: ["2"] }),
    ];
    const chains = groupIntoChains(steps);
    expect(chains).toHaveLength(1);
    expect(chains[0].map((s) => s.id)).toEqual(["1", "2", "3"]);
  });

  it("splits unconnected steps into separate chains", () => {
    const steps = [
      makeStep({ id: "1", track: "Home", phase: "P", name: "a" }),
      makeStep({ id: "2", track: "Home", phase: "P", name: "b" }),
    ];
    expect(groupIntoChains(steps)).toHaveLength(2);
  });

  it("ignores a dependency that points outside this phase", () => {
    const steps = [makeStep({ id: "1", track: "Home", phase: "P", name: "a", dependsOn: ["outside"] })];
    const chains = groupIntoChains(steps);
    expect(chains).toHaveLength(1);
    expect(chains[0].map((s) => s.id)).toEqual(["1"]);
  });

  it("returns an empty list for an empty phase", () => {
    expect(groupIntoChains([])).toEqual([]);
  });
});
