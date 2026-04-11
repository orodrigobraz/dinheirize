/**
 * Generates a unique, visually vibrant and consistent HSL color for a tag.
 *
 * Strategy:
 * - Hash the tag name to a stable number.
 * - Multiply by the golden angle (137.508°) to spread hues evenly across the full
 *   spectrum — this guarantees that nearby hash values land on very different hues,
 *   so two different tags almost never look the same.
 * - Fix saturation at 75% and lightness at 62% for vivid colors that pop on dark
 *   backgrounds without being harsh.
 * - Skip the yellow-green band (55°–85°) which looks muddy on dark UIs.
 */

import type { Tag } from '../types/finance';

const GOLDEN_ANGLE = 137.508; // degrees

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash, 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

function remapHue(rawHue: number): number {
  const SKIP_START = 55;
  const SKIP_END = 85;
  const SKIP_WIDTH = SKIP_END - SKIP_START;

  const h = rawHue % 360;
  if (h < SKIP_START) return h;
  return SKIP_END + ((h - SKIP_START) * (360 - SKIP_END)) / (360 - SKIP_START - SKIP_WIDTH);
}

export function getTagColor(tagName: string, allTags?: Tag[]): string {
  const normalizedName = tagName.toLowerCase().trim();
  let index = -1;

  if (allTags && allTags.length > 0) {
    // Sort stable by UUID to maintain exact same sequence permanently.
    const sortedTags = [...allTags].sort((a, b) => a.id.localeCompare(b.id));
    index = sortedTags.findIndex(t => t.name.toLowerCase().trim() === normalizedName);
  }

  // Fallback to random hash ONLY if tag not found in context (e.g. while typing a new one)
  if (index === -1) {
    const hash = hashString(normalizedName);
    index = Math.abs(hash >>> 0) % 1000 + (allTags ? allTags.length : 0);
  }

  // The golden angle multiplier works perfectly when index is sequential 0, 1, 2...
  // Each subsequent tag is spaced 137.5 degrees apart, mathematically preventing any clustering.
  const rawHue = (index * GOLDEN_ANGLE) % 360;
  const hue = remapHue(rawHue);

  const saturation = 80; // % — vivid but not neon
  const lightness = 65;  // % — bright enough for dark UI contrast

  return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
}
