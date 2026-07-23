/** Matches the backend's char/4 heuristic (services/anthropic_client.py count_tokens) — OpenRouter has no counting endpoint. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
