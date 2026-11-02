import { getExternalSurveySummary } from "@/server/external-survey/summary";
import { ExternalSurveyView } from "./external-survey-view";
export async function ExternalSurveyPanel({ specialtyId, specialtyName, departmentContext = false }: { specialtyId: string; specialtyName: string; departmentContext?: boolean }) {
  const summary = await getExternalSurveySummary(specialtyId);
  return <ExternalSurveyView summary={summary} specialtyName={specialtyName} departmentContext={departmentContext} />;
}
