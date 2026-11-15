# Administrator control for the career-fit questionnaire

The experimental “בחירת התמחות (Beta)” questionnaire is hidden by default. A single control at the top of `/admin` shows or hides it without a deployment. The state persists in `SiteFeature`, with the administrator action recorded transactionally in the existing audit log.

When disabled, its header/home/FAQ/about promotions and comparison methodology link are absent. The home cards fill the remaining width. The `/career-fit` page and all nested pages return not-found content, and its catalog API returns 404. Missing or unreadable configuration fails closed. Only administrators can mutate the strict boolean setting through the same-origin API; guests and other users cannot see the control or change it.

The additive migration creates one table and a disabled `career_fit` row. Existing survey responses, ratings, approval/source settings and respondent data are unchanged. The questionnaire and locally stored drafts are not deleted by hiding it.

Validation: 66 unit/source regression checks passed, TypeScript and production build passed. Isolated migration verified unchanged existing records. Browser checks exercised both toggle directions, persistence after reload, direct route/API denial and restoration, invalid/cross-origin/non-admin requests, audit records and mobile/desktop layout/accessibility. The final tested state is hidden. Release uses the established immutable source, staged verification, promotion and main synchronization process.
