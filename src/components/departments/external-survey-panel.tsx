import { getExternalSurveySummary } from "@/server/external-survey/summary";
import { ExternalSurveyView } from "./external-survey-view";
export async function ExternalSurveyPanel({ specialtyId, specialtyName }: { specialtyId: string; specialtyName: string }) {
  const summary = await getExternalSurveySummary(specialtyId);
  return <ExternalSurveyView summary={summary} specialtyName={specialtyName} />;
}
