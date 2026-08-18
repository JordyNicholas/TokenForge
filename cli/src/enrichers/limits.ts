/** Max files sent to an LLM enricher per hybrid scan. */
export const MAX_ENRICHMENT_CANDIDATES = 30;

/** Max bytes read from each candidate file for the model prompt. */
export const MAX_CANDIDATE_BYTES = 32 * 1024;

/** Default Ollama base URL when `--llm-endpoint` is omitted. */
export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";

/** Default OpenAI-compatible base URL when `--llm-endpoint` is omitted. */
export const DEFAULT_OPENAI_ENDPOINT = "https://api.openai.com/v1";

/** Default Anthropic base URL when `--llm-endpoint` is omitted. */
export const DEFAULT_ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1";
