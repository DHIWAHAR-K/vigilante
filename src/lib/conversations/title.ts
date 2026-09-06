const maxTitleLength = 64;

export function createConversationTitle(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxTitleLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxTitleLength - 3).trimEnd()}...`;
}
