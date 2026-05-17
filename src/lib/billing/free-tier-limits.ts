/** Strict free-tier caps — server must enforce every path. */

export const FREE_TIER = {
  /** Lifetime full AI deck generations (not monthly). */
  lifetimeAiDecks: 3,
  maxSlidesPerDeck: 5,
  /** Max slide images generated on free taste decks (COGS guard). */
  maxImagesPerDeck: 2,
  magicEditUses: 10,
  generativeFillUses: 5,
} as const;
