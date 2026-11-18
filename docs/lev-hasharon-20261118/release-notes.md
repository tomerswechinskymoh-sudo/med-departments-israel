# Lev Hasharon identity correction

Lev Hasharon was incorrectly canonicalized to Hasharon Hospital (Rabin) by substring matching. The fix gives the psychiatric hospital an independent display identity, survey scope, filter and branding identity. Original institution IDs, department IDs, slugs, URLs and imported source records remain intact. Rabin campus aggregation is unchanged.

The audit also found ten OpenAlex records whose recorded searches used Rabin and two DUNS100 records with Rabin aliases. The targeted, idempotent repair marks the former as needing mapping and the latter as unapproved. It preserves every stored value, query, raw response, ID and timestamp. No replacement research values are inferred. Future enrichment and crawler matching cannot borrow Rabin aliases for Lev Hasharon.

Validation: 69 tests passed; one optional original-workbook test skipped because its external fixture was not supplied. Existing effective-hospital checks passed, TypeScript and production build passed. A separate Neon branch verified the repair, exact record preservation and rerun safety. Integration verified directory options, search filters, profile identity, the original official link, comparison and all eight resident survey aggregate records. Both original department records remain; the existing public eligibility rule still hides the child psychiatry row with missing resident count.

The production audit and exact before/after repair evidence are retained locally in this directory and excluded from the source commit. Release uses the established Vercel staging, source verification and promotion workflow.
