/** JSON Schema fragment for Tier-2 single-pass enricher output (#206). */
export const LLM_ANALYSIS_OVERVIEW_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string", minLength: 1 },
    themes: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 1 },
    },
    caveats: {
      type: "array",
      maxItems: 4,
      items: { type: "string", minLength: 1 },
    },
  },
} as const;
