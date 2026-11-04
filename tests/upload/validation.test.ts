import assert from "node:assert/strict";
import test from "node:test";
import { verificationProofError } from "../../src/lib/verification-proof";
import { assertUserVerificationProofFile } from "../../src/lib/uploads";

for (const [name, type] of [["proof.pdf", "application/pdf"], ["צילום.jpeg", "image/jpeg"], ["proof.png", "image/png"], ["PROOF.JPG", ""], ["proof.PDF", "application/octet-stream"]]) {
  test(`accepts supported proof: ${name} (${type || "no MIME"})`, () => {
    const file = new File(["synthetic fixture"], name, { type });
    assert.equal(verificationProofError(file, 4), null);
    assert.doesNotThrow(() => assertUserVerificationProofFile(file));
  });
}
test("rejects HEIC, executables, empty files and oversized documents with Hebrew feedback", () => {
  for (const file of [new File(["fixture"], "photo.heic", {type:"image/heic"}), new File(["fixture"], "file.exe"), new File([], "empty.pdf"), {name:"large.pdf",type:"application/pdf",size:4 * 1024 * 1024 + 1}]) {
    assert.match(verificationProofError(file, 4)!, /[א-ת]/);
  }
});
test("honors a smaller configured limit and the existing 5MB maximum", () => {
  assert.match(verificationProofError({name:"proof.pdf",type:"application/pdf",size:2*1024*1024},1)!, /1MB/);
  assert.match(verificationProofError({name:"proof.pdf",type:"application/pdf",size:6*1024*1024},9)!, /5MB/);
});
