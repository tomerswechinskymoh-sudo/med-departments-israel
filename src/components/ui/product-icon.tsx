import type { SVGProps } from "react";

/** Original interface pictograms; not institutional marks. */
export type ProductIconName =
  | "search"
  | "compare"
  | "document"
  | "people"
  | "database"
  | "shield"
  | "bookmark"
  | "mail"
  | "compass"
  | "building"
  | "location" | "clock" | "calendar" | "award" | "pulse" | "wallet"
  | "trend" | "trash" | "lock" | "eye" | "eye-off" | "login" | "phone";
const paths: Record<ProductIconName, string> = {
  location: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  clock: "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0ZM12 6v6l4 2",
  calendar: "M4 5h16v16H4V5ZM8 2v6M16 2v6M4 11h16M8 15h2m4 0h2M8 18h2",
  award: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM8 12l-2 9 6-3 6 3-2-9",
  pulse: "M2 12h5l3-8 4 16 3-8h5",
  wallet: "M20 7V3H5a3 3 0 0 0 0 6h16v12H5a3 3 0 0 1-3-3V6M21 12h-6v6h6M17 15h1",
  trend: "M3 20V4M3 20h18M6 15l4-5 4 3 6-8M16 5h4v4",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  lock: "M5 11h14v11H5V11ZM8 11V7a4 4 0 0 1 8 0v4M12 15v3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  "eye-off": "M3 3l18 18M10 5h2c6 0 10 7 10 7a22 22 0 0 1-4 5M6 6a24 24 0 0 0-4 6s4 7 10 7h2M9 9a4 4 0 0 0 6 6",
  login: "M14 3h7v18h-7M3 12h13M11 7l5 5-5 5",
  phone: "M7 3H3c-1 10 8 19 18 18v-4l-5-2-2 3a17 17 0 0 1-8-8l3-2-2-5Z",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  compare: "M5 20V12M12 20V4M19 20V8",
  document:
    "M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-6-6Zm0 0v6h6M8 12h8M8 16h8M8 19h4",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M15 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  database:
    "M21 5c0 2-4 3-9 3S3 7 3 5s4-3 9-3 9 1 9 3ZM3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3",
  shield: "m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4Zm-4 10 3 3 5-6",
  bookmark: "M6 3h12v19l-6-4-6 4V3Z",
  mail: "M3 4h18v16H3V4Zm0 1 9 8 9-8",
  compass: "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Zm-6-4-3 5-5 3 3-5 5-3Z",
  building:
    "M5 22V2h14v20M2 22h20M9 6h1m4 0h1M9 10h1m4 0h1M9 14h1m4 0h1M10 22v-4h4v4",
};
export function ProductIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: ProductIconName }) {
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
