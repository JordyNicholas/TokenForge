/** JSON Schema fragment for Codex context-index recommendations (#189). */
export const CONTEXT_INDEX_RECOMMENDATIONS_JSON_SCHEMA = {
  type: "array",
  maxItems: 8,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["path", "purpose", "summary"],
    properties: {
      path: { type: "string", minLength: 1 },
      purpose: { type: "string", minLength: 1 },
      summary: { type: "string", minLength: 1 },
    },
  },
} as const;
