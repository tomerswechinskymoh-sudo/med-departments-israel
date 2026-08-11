# Clinical Rotations Local Demo Preview

This dataset is fully synthetic and local-only. It must never run against production, staging, preview deployments, or Neon.

## Seed

Start an isolated local Postgres instance for this worktree:

```bash
POSTGRES_PORT=55434 docker compose up -d postgres
export DATABASE_URL=postgresql://postgres:postgres@localhost:55434/med_departments_israel
export DIRECT_URL=postgresql://postgres:postgres@localhost:55434/med_departments_israel
npx prisma migrate deploy
```

```bash
NODE_ENV=development ALLOW_CLINICAL_ROTATIONS_DEMO_SEED=true CLINICAL_ROTATIONS_ID_HMAC_SECRET=local-demo-clinical-rotations-hmac-secret-32-chars npm run seed:clinical-rotations-demo
```

The seed hard-fails unless:

- `NODE_ENV` is `development` or `test`;
- `ALLOW_CLINICAL_ROTATIONS_DEMO_SEED=true`;
- `DATABASE_URL` points to localhost or a local Docker host;
- the database URL is not Neon.

## Reset

```bash
NODE_ENV=development ALLOW_CLINICAL_ROTATIONS_DEMO_SEED=true CLINICAL_ROTATIONS_ID_HMAC_SECRET=local-demo-clinical-rotations-hmac-secret-32-chars npm run reset:clinical-rotations-demo
```

The reset deletes only deterministic Clinical Rotations demo records: fake users, fake hospitals, fake offerings, fake applications, fake groups, fake payments, fake eligibility import metadata, fake coordinator access, and related safe audit rows.

## Fake Accounts

Password for every account:

```text
ClinicalDemo!2026
```

Admin with document-review permission:

```text
admin@clinical-rotations-demo.example.test
```

Admin without document-review permission:

```text
admin-no-docs@clinical-rotations-demo.example.test
```

Hospital coordinators:

```text
coordinator-north@clinical-rotations-demo.example.test
coordinator-center@clinical-rotations-demo.example.test
coordinator-south@clinical-rotations-demo.example.test
```

Students:

```text
student-one@clinical-rotations-demo.example.test
student-two@clinical-rotations-demo.example.test
student-three@clinical-rotations-demo.example.test
student-four@clinical-rotations-demo.example.test
student-ineligible@clinical-rotations-demo.example.test
student-pending@clinical-rotations-demo.example.test
```

## Key URLs

```text
/clinical-rotations
/clinical-rotations/my-rotations
/clinical-rotations/hospital
/clinical-rotations/hospital/offerings
/clinical-rotations/hospital/groups
/clinical-rotations/hospital/payments
/admin/clinical-rotations
/admin/clinical-rotations/verifications
/admin/clinical-rotations/eligibility-imports
/admin/clinical-rotations/audit
```

The seed output prints one private group invite URL for local inspection. The raw invite token is never stored in the database; only its hash is stored.

## Local Verification

```bash
NODE_ENV=development ALLOW_CLINICAL_ROTATIONS_DEMO_SEED=true CLINICAL_ROTATIONS_ID_HMAC_SECRET=local-demo-clinical-rotations-hmac-secret-32-chars npm run verify:clinical-rotations-demo-data
CLINICAL_ROTATIONS_CLEANUP_SECRET=local-cleanup-handler-test-secret npm run verify:clinical-rotations-cleanup-handler
```

## Privacy Notes

- No real names, emails, hospitals, payment links, identity documents, or Israeli ID numbers are used.
- Student keys are synthetic HMAC values generated from demo labels, not raw Israeli IDs.
- Demo payment links use `https://payments.example.test/...`.
- Preview-only offerings remain server-side application-blocked.
- A localhost-only Hebrew banner marks Clinical Rotations pages as `סביבת הדגמה`.
