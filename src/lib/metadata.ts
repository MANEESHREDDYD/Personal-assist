/**
 * Safely parses a JSON string from a database metadata field.
 * Returns an empty object if parsing fails or if the string is null/empty.
 */
export function parseMetadata<T = Record<string, unknown>>(metadataStr: string | null | undefined): T {
  if (!metadataStr) return {} as T;
  try {
    const parsed = JSON.parse(metadataStr);
    return (typeof parsed === "object" && parsed !== null) ? (parsed as T) : ({} as T);
  } catch (error) {
    console.error("Failed to parse metadata JSON", error);
    return {} as T;
  }
}

/**
 * Stringifies an object to JSON for a database metadata field.
 * Safely handles nulls or undefined values, returning null if the input is not stringifiable.
 */
export function stringifyMetadata(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error("Failed to stringify metadata JSON", error);
    return null;
  }
}
