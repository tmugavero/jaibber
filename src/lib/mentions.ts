/**
 * Parse @mentions from message text.
 * Returns lowercase agent names found after @ symbols.
 * Supports multi-word names like "@Testing Agent" — captures word sequences
 * separated by single spaces (e.g. "@My Agent" → "my agent").
 */
export function parseMentions(text: string): string[] {
  const mentions: string[] = [];
  for (const match of text.matchAll(/@(\w+(?:\s+\w+)*)/g)) {
    mentions.push(match[1].toLowerCase());
  }
  return mentions;
}

/**
 * Check whether a message @mentions a specific agent by name.
 * Handles multi-word agent names that parseMentions may over- or under-capture.
 */
export function mentionsAgent(text: string, agentName: string): boolean {
  const pattern = new RegExp(`@${escapeRegex(agentName)}(?!\\w)`, "i");
  return pattern.test(text);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
