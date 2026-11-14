import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupRequestSchema } from '../../src/lib/validation';
import {getExperienceContributionEligibility} from '../../src/lib/onboarding-contribution';
import {signupExperienceMatches} from '../../src/lib/server/signup-experience';
import {signupWorkplaceLabel} from '../../src/lib/signup-workplace';
const base={fullName:'Synthetic test',email:'synthetic@example.invalid',password:'Synthetic-test-123',confirmPassword:'Synthetic-test-123',proofConfirmed:true,privacyVerificationConsent:true};
test('post-intern is a distinct physician status with a real internship experience requirement',()=>{
 assert.ok(signupRequestSchema.safeParse({...base,roleStatus:'post_intern',onboardingInstitutionId:'hospital'}).success);
 assert.equal(signupRequestSchema.safeParse({...base,roleStatus:'post_intern'}).success,false);
 assert.equal(getExperienceContributionEligibility({roleStatus:'post_intern'}).reviewerType,'INTERN');
 assert.equal(signupExperienceMatches({roleStatus:'post_intern',email:base.email},null),false);
});
test('community specialists do not need hospital/department; combined workplace retains both',()=>{
 assert.ok(signupRequestSchema.safeParse({...base,roleStatus:'specialist',specialistWorkplace:'community',communityWorkplace:'Synthetic clinic'}).success);
 for(const specialistWorkplace of [undefined,'hospital','both']){
  assert.equal(signupRequestSchema.safeParse({...base,roleStatus:'specialist',specialistWorkplace}).success,false);
  assert.ok(signupRequestSchema.safeParse({...base,roleStatus:'specialist',specialistWorkplace,onboardingInstitutionId:'hospital',onboardingDepartmentId:'department'}).success);
 }
 assert.equal(signupRequestSchema.safeParse({...base,roleStatus:'resident',specialistWorkplace:'community'}).success,false);
 assert.equal(signupRequestSchema.safeParse({...base,roleStatus:'specialist',specialistWorkplace:'unrecognized'}).success,false);
 assert.equal(signupRequestSchema.safeParse({...base,roleStatus:'specialist',specialistWorkplace:'community',privacyVerificationConsent:false}).success,false);
});
test('stored registration context renders only the recognized workplace fields',()=>{
 assert.equal(signupWorkplaceLabel({onboarding:{workplace:'community',communityWorkplace:'Clinic'}}),'קהילה · Clinic');
 assert.equal(signupWorkplaceLabel({onboarding:{workplace:'hospital',communityWorkplace:'stale'}}),'בית חולים');
 assert.equal(signupWorkplaceLabel({onboarding:{workplace:'both',communityWorkplace:'Clinic'}}),'בית חולים וקהילה · Clinic');
 assert.equal(signupWorkplaceLabel(null),null);
});
