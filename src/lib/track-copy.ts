// display copy for each track (Home/Center), shared between the compare
// view and the pathway detail view so both show the same high-level facts
export type TrackCopy = {
  label: string;
  tagline: string;
  accent: string;
  location: string;
  registeredWith: string;
};

export const TRACK_COPY: Record<string, TrackCopy> = {
  Home: {
    label: "Home-Based Child Care",
    tagline: "Care provided from your home.",
    accent: "border-brand-green",
    location: "Personal residence, such as a one- or two-family dwelling or an apartment unit in a legally classified residential building",
    registeredWith: "-",
  },
  Center: {
    label: "Center-Based Child Care",
    tagline: "Care provided from a dedicated facility.",
    accent: "border-navy",
    location: "Dedicated non-residential facility",
    registeredWith: "-",
  },
};
