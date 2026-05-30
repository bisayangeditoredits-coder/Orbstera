/** Stable fallbacks for Zustand selectors — never use `?? []` inline (new ref every call → infinite re-render). */
export const EMPTY_STRING_ARRAY: string[] = [];
