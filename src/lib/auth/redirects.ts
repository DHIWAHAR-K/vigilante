const defaultRedirectPath = "/app";

export function normalizeRedirectPath(
  value: FormDataEntryValue | string | null | undefined,
): string {
  if (typeof value !== "string") {
    return defaultRedirectPath;
  }

  const path = value.trim();

  if (
    path.length === 0 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return defaultRedirectPath;
  }

  return path;
}
