const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Keeps temporary UI identifiers out of write DTOs. */
export const uuidOrUndefined = (value: string | undefined): string | undefined =>
  value && UUID_PATTERN.test(value) ? value : undefined;
