# Clinical Rotations Marketplace Operations

## Privacy

- Israeli ID numbers are accepted only by server-side Clinical Rotations endpoints.
- The raw ID is normalized, checksum-validated, converted to a keyed HMAC, and never stored.
- `studentAnonymousKey` is pseudonymous internal data. It is not anonymous data.
- Hospitals must never receive raw IDs, HMAC values, identity documents, or eligibility import rows.
- Identity documents are stored only while pending manual review, then the stored file row/blob is deleted and verified absent.
- Eligibility source files are deleted after processing; only HMAC entries and safe counts remain.

## Required Production Secrets

- `CLINICAL_ROTATIONS_ID_HMAC_SECRET`
- `CLINICAL_ROTATIONS_CLEANUP_SECRET`

Do not commit, print, log, expose to client bundles, or send these values to the browser.

## Key Rotation

The current key version is `1`.

Before changing `CLINICAL_ROTATIONS_ID_HMAC_SECRET`, choose one of these operational paths:

1. Keep legacy verification capability for old `keyVersion` values until all open applications and historical compliance checks have been migrated.
2. Re-import active eligibility lists and re-verify student identities under the new key version.

Never rotate the secret without preserving the ability to match existing `studentAnonymousKey` records for active applications, eligibility checks, cancellations, and completed rotations.

## Retention Cleanup

The server exposes a protected cleanup endpoint for a daily scheduler:

```text
GET /api/internal/clinical-rotations/cleanup
Authorization: Bearer <CLINICAL_ROTATIONS_CLEANUP_SECRET>
```

The project currently deploys through Vercel (`npm run vercel-build`). No live scheduler is committed or enabled in this branch.

Activation steps for production, after deployment approval:

1. Configure `CLINICAL_ROTATIONS_CLEANUP_SECRET` in the production environment.
2. Configure a daily Vercel Cron or external scheduler for `https://www.hitmachut.org/api/internal/clinical-rotations/cleanup`.
3. Send `Authorization: Bearer <CLINICAL_ROTATIONS_CLEANUP_SECRET>` or `x-clinical-rotations-cleanup-secret: <CLINICAL_ROTATIONS_CLEANUP_SECRET>`.
4. Use a daily schedule such as `0 2 * * *`.
5. Ensure scheduler request logs redact the authorization header and custom secret header.
6. Verify with one approved manual production call from a trusted operator and confirm the JSON response contains `ok: true`, `identityDocuments.deleted`, `eligibilitySources.deleted`, and `eligibilitySources.failed`.
7. Do not expose the endpoint in navigation, sitemap, robots-discoverable links, or public docs.

If using a committed `vercel.json` after approval, use this shape and inject the secret header through a provider-side secure header mechanism rather than committing a value:

```json
{
  "crons": [
    {
      "path": "/api/internal/clinical-rotations/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Do not add this route to public navigation or sitemap.

For local manual cleanup:

```bash
npm run cleanup:clinical-rotations-identity-documents
```

For local scheduled-handler verification:

```bash
CLINICAL_ROTATIONS_CLEANUP_SECRET=local-cleanup-handler-test-secret npm run verify:clinical-rotations-cleanup-handler
```

The cleanup deletes pending Clinical Rotations identity documents older than 30 days, marks the verification request expired, and retries deletion of eligibility source uploads that previously failed deletion verification.
