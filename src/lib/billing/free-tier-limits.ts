/** Strict free-tier caps — server must enforce every path. */

export const FREE_TIER = {
  /** Lifetime full AI deck generations (not monthly). */
  lifetimeAiDecks: 5,
  maxSlidesPerDeck: 6,
  /** Max slide images generated on free taste decks (COGS guard). */
  maxImagesPerDeck: 3,
  /** Monthly Gen-Fill + Magic Edit images (Pollinations) — enforced via Redis. */
  genfillImageUses: 15,
} as const;
