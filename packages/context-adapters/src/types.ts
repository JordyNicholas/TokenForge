/** Soft shields provider indexing; hard shields full context access. */
export type ShieldMode = "soft" | "hard";

/** How reliably the provider honors a shield for the given path. */
export type EffectivenessTier = "full" | "partial" | "advisory";

export type ContextProviderId =
  | "generic"
  | "cursor"
  | "copilot"
  | "gemini"
  | "claude";

export type ContextCapabilities = {
  id: ContextProviderId;
  displayName: string;
  effectiveness: EffectivenessTier;
  supportsSoftShield: boolean;
  supportsHardShield: boolean;
};

export type ShieldResult = {
  path: string;
  mode: ShieldMode;
  effectiveness: EffectivenessTier;
  /** Repo-relative paths written or updated by this operation. */
  modifiedFiles: string[];
  shielded: boolean;
};

export type SessionShieldEntry = {
  path: string;
  mode: ShieldMode;
  provider: ContextProviderId;
  shieldedAt: string;
};

export type SessionShieldFile = {
  version: 1;
  entries: SessionShieldEntry[];
};

export interface ProviderContextAdapter {
  readonly id: ContextProviderId;
  readonly capabilities: ContextCapabilities;
  shield(root: string, path: string, mode: ShieldMode): Promise<ShieldResult>;
  unshield(root: string, path: string): Promise<ShieldResult>;
}
