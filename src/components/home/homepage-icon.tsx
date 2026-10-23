import type { SVGProps } from "react";

/** Original V5 homepage pictograms; no library dependency. */
export type HomepageIconName = "search" | "compare" | "document" | "people" | "database" | "shield" | "compass" | "building";
const paths: Record<HomepageIconName, string> = {
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  compare: "M5 20V12M12 20V4M19 20V8",
  document: "M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-6-6Zm0 0v6h6M8 12h8M8 16h8M8 19h4",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M15 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  database: "M21 5c0 2-4 3-9 3S3 7 3 5s4-3 9-3 9 1 9 3ZM3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3",
  shield: "m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4Zm-4 10 3 3 5-6",
  compass: "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Zm-6-4-3 5-5 3 3-5 5-3Z",
  building: "M5 22V2h14v20M2 22h20M9 6h1m4 0h1M9 10h1m4 0h1M9 14h1m4 0h1M10 22v-4h4v4",
};
export function HomepageIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: HomepageIconName }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
