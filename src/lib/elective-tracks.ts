import { ElectiveTrackType } from "@prisma/client";

export const ELECTIVE_TRACK_TYPES = [
  ElectiveTrackType.ISRAELI_FACULTY_STUDENT,
  ElectiveTrackType.ABROAD_ISRAELI_STUDENT
] as const;

export const DEFAULT_ELECTIVE_TRACK_TYPE = ElectiveTrackType.ISRAELI_FACULTY_STUDENT;

export function getElectiveTrackLabel(trackType?: ElectiveTrackType | string | null) {
  if (trackType === ElectiveTrackType.ABROAD_ISRAELI_STUDENT) {
    return "ישראלים הלומדים בחו״ל";
  }

  return "סטודנטים לרפואה בישראל";
}

export function normalizeElectiveTrackType(value?: string | null) {
  return ELECTIVE_TRACK_TYPES.find((trackType) => trackType === value) ?? null;
}

type BaseElectiveSettings = {
  availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT";
  maxStudentsAtOnce: number | null;
  minDurationDays?: number | null;
  maxDurationDays?: number | null;
  allowApplications?: boolean | null;
  notes?: string | null;
} | null;

type TrackElectiveSettings = {
  trackType: ElectiveTrackType;
  allowApplications: boolean;
  maxStudentsAtOnce: number;
  minDurationDays?: number | null;
  maxDurationDays?: number | null;
  notes?: string | null;
  paymentRequired?: boolean | null;
  paymentAmount?: unknown;
  paymentCurrency?: string | null;
  paymentLink?: string | null;
  paymentInstructions?: string | null;
};

export function resolveElectiveTrackSettings(input: {
  baseSettings: BaseElectiveSettings;
  trackSettings?: TrackElectiveSettings[] | null;
  trackType?: ElectiveTrackType | null;
}) {
  const track = input.trackType
    ? input.trackSettings?.find((settings) => settings.trackType === input.trackType) ?? null
    : input.baseSettings
      ? null
      : input.trackSettings?.find((settings) => settings.allowApplications) ?? input.trackSettings?.[0] ?? null;
  const base = input.baseSettings;
  const canUseBaseFallback = !input.trackType || input.trackType === DEFAULT_ELECTIVE_TRACK_TYPE || Boolean(track);

  if ((!base || !canUseBaseFallback) && !track) {
    return null;
  }

  return {
    availabilityMode: canUseBaseFallback ? base?.availabilityMode ?? "CLOSED_BY_DEFAULT" : "CLOSED_BY_DEFAULT",
    allowApplications: track?.allowApplications ?? (canUseBaseFallback ? base?.allowApplications ?? false : false),
    maxStudentsAtOnce: track?.maxStudentsAtOnce ?? (canUseBaseFallback ? base?.maxStudentsAtOnce ?? null : null),
    minDurationDays: track?.minDurationDays ?? (canUseBaseFallback ? base?.minDurationDays ?? null : null),
    maxDurationDays: track?.maxDurationDays ?? (canUseBaseFallback ? base?.maxDurationDays ?? null : null),
    notes: track?.notes ?? (canUseBaseFallback ? base?.notes ?? null : null),
    paymentRequired: track?.paymentRequired ?? false,
    paymentAmount: track?.paymentAmount ?? null,
    paymentCurrency: track?.paymentCurrency ?? "ILS",
    paymentLink: track?.paymentLink ?? null,
    paymentInstructions: track?.paymentInstructions ?? null,
    source: track ? "track" as const : "base" as const
  };
}
