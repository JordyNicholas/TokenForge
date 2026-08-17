const DEFAULTS = {
  currency: "USD",
  region: "eu-west-1",
};

/** Tiny stand-in for reading config/app-settings.json at runtime. */
export function loadSettings() {
  return { ...DEFAULTS };
}
