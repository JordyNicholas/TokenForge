import type { ApiType0001 } from "./generated-types";

export function describeType(type: ApiType0001): string {
  return `type ${type.id}: ${type.label}`;
}
