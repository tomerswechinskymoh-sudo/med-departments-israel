/** Internal product approval only. No hospital participation or live seats are asserted. */
export const pilotDesign = Object.freeze({
  version: '2026-10-01-v1', configuration: 'APPROVED',
  institutionConfirmation: 'PENDING', admission: 'DISABLED',
  hospital: 'Rabin Medical Center / Beilinson', department: 'Anesthesiology',
  learnerRoute: 'ISRAELI_MEDICAL_FACULTY_STUDENT', maxAccounts: 5, maxOfferings: 1,
  chief: 'PENDING_VERIFICATION', delegate: 'PENDING_VERIFICATION',
  participantAccounts: [] as readonly string[], offerings: [] as readonly string[],
  documentMethod: 'EXTERNAL_VERIFICATION', uploads: false, groups: false,
  payments: false, externalNotifications: false,
  activationBlockers: [
    'Institutional participation and workflow confirmation',
    'Verified chief and any delegate, explicit account allowlist',
    'Representative-entered dates, capacity and faculty-specific requirements',
    'Institution acceptance of external verification and metadata retention',
    'Reconciled schema, verified restore capability and isolated hosted preview',
    'Shared allocation and authorization integration against the deployed baseline'
  ]
});

const placementPrefixes = ['/api/placements', '/api/clinical-rotations', '/api/admin/clinical-rotations', '/api/electives', '/api/admin/electives'];
/** No environment variable can open admissions before the integration gates are implemented. */
export function isGuardedPlacementMutation(path: string, method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) &&
    placementPrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));
}
export function isPreservedPlacementOperation(path: string, action?: unknown) {
  if (['/api/electives/department/login', '/api/electives/department/logout', '/api/clinical-rotations/cancellations'].includes(path)) return true;
  return ['/api/clinical-rotations/hospital/applications', '/api/admin/clinical-rotations/applications'].includes(path) &&
    ['approveCancellation', 'rejectCancellation'].includes(String(action));
}
export const guardedPlacementMessage = 'ההרשמה והפעולה המבוקשת טרם נפתחו. נדרשים אישור מוסדי והשלמת בדיקות המערכת. בקשות קיימות אינן מבוטלות.';
