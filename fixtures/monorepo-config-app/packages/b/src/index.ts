/** Control: real source, genuinely distinct per package. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{{${key}}}`, value),
    template,
  );
}
