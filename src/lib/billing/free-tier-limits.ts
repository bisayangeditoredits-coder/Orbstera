/** Strict free-tier caps — server must enforce every path. */

export const FREE_TIER = {
  /** Lifetime full AI deck generations (not monthly). */
  lifetimeAiDecks: 5,
  maxSlidesPerDeck: 6,
  /** Max slide images generated on free taste decks (COGS guard). */
  maxImagesPerDeck: 3,
  magicEditUses: 15,
  generativeFillUses: 8,
} as const;
