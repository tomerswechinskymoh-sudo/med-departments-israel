export function signupWorkplaceLabel(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || !('onboarding' in metadata)) return null;
  const value = metadata.onboarding;
  if (!value || typeof value !== 'object' || !('workplace' in value)) return null;
  const labels: Record<string, string> = { hospital: 'בית חולים', community: 'קהילה', both: 'בית חולים וקהילה' };
  const label = typeof value.workplace === 'string' ? labels[value.workplace] : null;
  if (!label) return null;
  const detail = 'communityWorkplace' in value && typeof value.communityWorkplace === 'string' && value.workplace !== 'hospital' ? value.communityWorkplace.trim() : '';
  return detail ? `${label} · ${detail}` : label;
}
