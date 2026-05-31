---
name: deck-generation
description: Orbstera AI deck generation — creative director orchestration and composer prompts. Use when improving deck prompts, orchestration, compose quality, or presentation JSON output.
---

# Deck Generation

## Pipeline

```
User prompt → Director (intent) → Architect (slideSpine blueprint) → Composer (JSON) → normalize → layout/images
```

## Source of truth

All prompt text lives in **`src/lib/ai/deck-generation-skill.ts`**.

Supporting files:
- `src/lib/ai/prompt-chain.ts` — orchestration steps
- `src/lib/ai/orchestration.ts` — composer messages + light normalization

## Principles

- **Creative freedom:** AI owns slide types, colors, backgrounds, and layout rhythm.
- **slideSpine is advisory** — composer may refine the architect blueprint.
- **Light normalization** — fix broken JSON only; do not rewrite creative choices.

## When editing prompts

1. Update `deck-generation-skill.ts`
2. Test: varied slide types, readable text on photos, distinct imagePrompts per slide
