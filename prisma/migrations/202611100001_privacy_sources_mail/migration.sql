-- Atomic DDL; a busy production database fails safely before a partial schema.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
-- Additive migration. Does NOT run historical cleanup or infer legacy consent.
ALTER TABLE "User"
  ADD COLUMN marketing_consent_source TEXT,
  ADD COLUMN marketing_consent_version TEXT,
  ADD COLUMN marketing_revoked_at TIMESTAMP(3);
CREATE TABLE "MarketingConsentEvent" (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  consent BOOLEAN NOT NULL, source TEXT NOT NULL, version TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MarketingConsentEvent_user_id_created_at_idx" ON "MarketingConsentEvent"(user_id, created_at);
CREATE TABLE "SourceVisibility" (
  id TEXT PRIMARY KEY DEFAULT 'global', ima BOOLEAN NOT NULL DEFAULT true,
  duns100 BOOLEAN NOT NULL DEFAULT true, revision INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT source_visibility_singleton CHECK (id = 'global')
);
INSERT INTO "SourceVisibility" (id) VALUES ('global');
CREATE TABLE "SignupDocumentDeletion" (
  user_id TEXT PRIMARY KEY, status TEXT NOT NULL,
  deleted_count INTEGER NOT NULL, deleted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Check ALL relational references, plus the legacy URL pointer. Never delete a
-- review proof merely because its owner also has a registration decision.
CREATE FUNCTION signup_document_is_exclusive(f "UploadedFile", uid TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT f.category = 'USER_VERIFICATION_PROOF' AND f.uploaded_by_user_id = uid
    AND NOT f.is_public AND f.department_id IS NULL AND f.opening_id IS NULL
    AND f.opening_application_id IS NULL AND f.review_submission_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM "ClinicalRotationStudentIdentity" WHERE pending_document_file_id = f.id)
    AND NOT EXISTS (SELECT 1 FROM "ClinicalRotationEligibilityImport" WHERE source_file_id = f.id)
    AND NOT EXISTS (SELECT 1 FROM "User" WHERE id <> uid AND verification_proof_url = '/api/files/' || f.id)
$$;
CREATE FUNCTION delete_signup_documents(uid TEXT) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE u "User"; n INTEGER;
BEGIN
  SELECT * INTO u FROM "User" WHERE id = uid FOR UPDATE;
  IF NOT FOUND OR u.verification_status::TEXT NOT IN ('VERIFIED','REJECTED') THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM "UploadedFile" f WHERE f.uploaded_by_user_id = uid
      AND f.category = 'USER_VERIFICATION_PROOF' AND NOT signup_document_is_exclusive(f, uid))
    OR (u.verification_proof_url IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM "UploadedFile" f WHERE '/api/files/' || f.id = u.verification_proof_url
       AND signup_document_is_exclusive(f, uid))) THEN
    RAISE EXCEPTION USING MESSAGE = 'SIGNUP_DOCUMENT_REQUIRES_REVIEW', ERRCODE = 'P0001';
  END IF;
  DELETE FROM "UploadedFile" f WHERE signup_document_is_exclusive(f, uid);
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE "User" SET verification_proof_url = NULL WHERE id = uid;
  INSERT INTO "SignupDocumentDeletion" (user_id, status, deleted_count)
    VALUES (uid, u.verification_status::TEXT, n)
    ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status,
      deleted_count = "SignupDocumentDeletion".deleted_count + EXCLUDED.deleted_count,
      deleted_at = CASE WHEN EXCLUDED.deleted_count > 0 THEN CURRENT_TIMESTAMP ELSE "SignupDocumentDeletion".deleted_at END;
  RETURN n;
END $$;
CREATE FUNCTION signup_decision_cleanup() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_status::TEXT IN ('VERIFIED','REJECTED') THEN
    PERFORM delete_signup_documents(NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER signup_decision_cleanup AFTER UPDATE OF verification_status ON "User"
  FOR EACH ROW EXECUTE FUNCTION signup_decision_cleanup();
-- Serializes upload completion against the same user row as the decision.
CREATE FUNCTION guard_signup_document_upload() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE s TEXT;
BEGIN
  IF NEW.category = 'USER_VERIFICATION_PROOF' THEN
    SELECT verification_status::TEXT INTO s FROM "User" WHERE id = NEW.uploaded_by_user_id FOR UPDATE;
    IF s IS NULL OR s IN ('VERIFIED','REJECTED') THEN
      RAISE EXCEPTION USING MESSAGE = 'SIGNUP_DOCUMENT_UPLOAD_CLOSED', ERRCODE = 'P0001';
    END IF;
    IF NEW.is_public OR NEW.review_submission_id IS NOT NULL OR NEW.department_id IS NOT NULL
      OR NEW.opening_id IS NOT NULL OR NEW.opening_application_id IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'SIGNUP_DOCUMENT_INVALID_PURPOSE', ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_signup_document_upload BEFORE INSERT OR UPDATE ON "UploadedFile"
  FOR EACH ROW EXECUTE FUNCTION guard_signup_document_upload();

COMMIT;
