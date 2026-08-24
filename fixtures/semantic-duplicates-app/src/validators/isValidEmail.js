const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  if (typeof value !== "string") {
    return false;
  }
  return EMAIL_PATTERN.test(value.trim());
}
