/**
 * Parse @mentions from message text.
 * Returns lowercase agent names found after @ symbols.
 */
export function parseMentions(text: string): string[] {
  const mentions: string[] = [];
  for (const match of text.matchAll(/@(\w+)/g)) {
    mentions.push(match[1].toLowerCase());
  }
  return mentions;
}
