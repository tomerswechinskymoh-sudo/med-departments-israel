type IconProps = {
  className?: string;
};

function iconClassName(className?: string) {
  return className ?? "h-5 w-5";
}

export function GoogleLogoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)}>
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.8 0 5.1-.9 6.8-2.4l-3.2-2.6c-.9.6-2.1 1-3.6 1-2.8 0-5.1-1.9-5.9-4.4H2.8v2.8A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC04"
        d="M6.1 13.6A6 6 0 0 1 5.8 12c0-.6.1-1.1.3-1.6V7.6H2.8A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.4l3-2.8Z"
      />
      <path
        fill="#EA4335"
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.8-2.8A9.9 9.9 0 0 0 2.8 7.6l3.3 2.8C6.9 7.9 9.2 6 12 6Z"
      />
    </svg>
  );
}

export function FacebookLogoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)}>
      <path
        fill="currentColor"
        d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7v-3.4h3.1V9.6c0-3.1 1.9-4.8 4.6-4.8 1.3 0 2.6.2 2.6.2v3h-1.5c-1.5 0-2 .9-2 1.8v2.2h3.4l-.5 3.4h-2.9v8.3A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

export function LinkedInLogoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)}>
      <path
        fill="currentColor"
        d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v5.7H9.1V9h3.5v1.6h.1c.5-.9 1.7-1.9 3.5-1.9 3.8 0 4.5 2.5 4.5 5.8v6Zm-15.4-13a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1Zm1.8 13H3.2V9h3.6v11.5Z"
      />
    </svg>
  );
}

export function SearchPulseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 0v2m0 8v2m4-6h2M5 11H3m11.7 4.3 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HospitalBuildingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M5 20V6.8c0-.7.4-1.3 1-1.6l5-2.2c.6-.3 1.4-.3 2 0l5 2.2c.6.3 1 .9 1 1.6V20M9 20v-3.5c0-.8.7-1.5 1.5-1.5h3c.8 0 1.5.7 1.5 1.5V20M9 8h1m4 0h1M9 11h1m4 0h1M11.9 6.3v2.2m-1.1-1.1H13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DepartmentDirectoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8 9h8M8 12h5m-5 3h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClipboardHeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M9 4.5h6M9.8 7h4.4c.8 0 1.5-.7 1.5-1.5S15 4 14.2 4H9.8C9 4 8.3 4.7 8.3 5.5S9 7 9.8 7ZM8 20h8a2 2 0 0 0 2-2V7.7A1.7 1.7 0 0 0 16.3 6H7.7A1.7 1.7 0 0 0 6 7.7V18a2 2 0 0 0 2 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m12 15.2-.8-.7c-1.2-1-2-1.8-2-3a1.8 1.8 0 0 1 3.1-1.2l.7.7.7-.7a1.8 1.8 0 0 1 3.1 1.3c0 1.2-.8 2-2 3l-.8.6Z"
        fill="currentColor"
        opacity=".16"
      />
      <path
        d="m12 15.2-.8-.7c-1.2-1-2-1.8-2-3a1.8 1.8 0 0 1 3.1-1.2l.7.7.7-.7a1.8 1.8 0 0 1 3.1 1.3c0 1.2-.8 2-2 3l-.8.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M12 3 5.5 5.8v5.4c0 4 2.8 7.7 6.5 9 3.7-1.3 6.5-5 6.5-9V5.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 11.8 1.7 1.7 3.4-3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReviewBubbleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M7 18.5 3.5 20l1-3.5A7.5 7.5 0 1 1 7 18.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function QuestionSparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M12 17.5h.01M9.7 9.3a2.3 2.3 0 1 1 4.1 1.4c-.6.7-1.5 1.2-1.8 2.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.5 13 6l2.5 1-2.5 1-1 2.5L11 8 8.5 7 11 6l1-2.5ZM6 13l.6 1.4L8 15l-1.4.6L6 17l-.6-1.4L4 15l1.4-.6L6 13Zm12 2 .6 1.4L20 17l-1.4.6L18 19l-.6-1.4L16 17l1.4-.6L18 15Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoctorAvatarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={iconClassName(className)} fill="none">
      <circle cx="60" cy="60" r="59" fill="currentColor" opacity=".08" />
      <path
        d="M60 58c10.5 0 19-8.5 19-19S70.5 20 60 20 41 28.5 41 39s8.5 19 19 19Z"
        fill="currentColor"
        opacity=".18"
      />
      <path
        d="M34 95c4.3-13 15-20 26-20s21.7 7 26 20"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M52 32c2.3-3.2 5.1-5 8-5 3 0 5.8 1.8 8 5"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M50 66h20v20H50z"
        fill="currentColor"
        opacity=".15"
      />
      <path
        d="M60 68v16M52 76h16"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StudentAvatarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={iconClassName(className)} fill="none">
      <circle cx="60" cy="60" r="59" fill="currentColor" opacity=".08" />
      <path
        d="M37 45 60 33l23 12-23 12-23-12Z"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M47 52v13c0 7 26 7 26 0V52"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 81c4.5-8 12.3-12 22-12s17.5 4 22 12"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StethoscopeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(className)} fill="none">
      <path
        d="M8 3v5a4 4 0 1 0 8 0V3M8 6H6.5A1.5 1.5 0 0 0 5 7.5v.8A7 7 0 0 0 12 15.3a7 7 0 0 0 7-7v-.8A1.5 1.5 0 0 0 17.5 6H16M14 17.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
