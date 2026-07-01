import {
  getHospitalInitials,
  getHospitalLogo,
  type HospitalLogoInput
} from "@/lib/hospital-logos";

export type InstitutionBrandingInput = HospitalLogoInput;

export function getInstitutionLogo(institution: InstitutionBrandingInput) {
  return getHospitalLogo(institution);
}

export function getInstitutionInitials(name?: string | null) {
  return getHospitalInitials(name);
}
