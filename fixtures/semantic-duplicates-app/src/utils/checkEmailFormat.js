export function checkEmailFormat(input) {
  if (!input || typeof input !== "string") {
    return false;
  }
  const trimmed = input.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf("@")) {
    return false;
  }
  const domain = trimmed.slice(atIndex + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}
