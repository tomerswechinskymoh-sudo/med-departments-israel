import { RoleKey, ReviewSourceType, OpeningType, OpeningApplicationStatus } from "@prisma/client";
import { APPLICATION_STATUS_LABELS, OPENING_TYPE_LABELS } from "@/lib/constants";
export function userRoleLabel(roleKey: RoleKey) {
  switch (roleKey) {
    case RoleKey.ADMIN:
      return "אדמין";
    case RoleKey.REPRESENTATIVE:
      return "נציג/ת מחלקה";
    case RoleKey.RESIDENT:
      return "מתמחה";
    case RoleKey.STUDENT:
    default:
      return "סטודנט/ית / סטאז'ר/ית";
  }
}

export function reviewerTypeLabel(reviewerType: ReviewSourceType) {
  switch (reviewerType) {
    case ReviewSourceType.RESIDENT:
      return "מתמחה";
    case ReviewSourceType.STUDENT:
      return "סטודנט/ית";
    case ReviewSourceType.INTERN:
    default:
      return "סטאז'ר/ית";
  }
}

export function openingTypeLabel(openingType: OpeningType) {
  return OPENING_TYPE_LABELS[openingType];
}

export function openingApplicationStatusLabel(status: OpeningApplicationStatus) {
  return APPLICATION_STATUS_LABELS[status];
}
