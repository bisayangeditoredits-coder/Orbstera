/**
 * Deck generation prompts ΓÇö re-exports from deck-generation-skill (Gamma-style pipeline).
 */
export {
  GAMMA_PHILOSOPHY,
  SLIDE_TYPE_PLAYBOOK,
  IMAGE_PROMPT_FORMULA,
  HEADLINE_RULES,
  DECK_JSON_SCHEMA,
  COMPOSER_EXECUTION_RULES,
  DIRECTOR_INTENT_SYSTEM,
  DIRECTOR_STRUCTURE_SYSTEM,
  DIRECTOR_REASON_SYSTEM,
  POLISH_SYSTEM,
  buildComposerSystemPrompt,
  buildComposerUserPrompt,
  buildDeckImagePrompt,
  buildFallbackImagePrompt,
} from '@/lib/ai/deck-generation-skill';

/** @deprecated Use DIRECTOR_INTENT_SYSTEM via prompt-chain */
export const PREFLIGHT_SYSTEM = `You are a strategic analyst. Output ONE raw JSON object only.

Schema:
{
  "presentationType": "startup_pitch | investor_deck | business_proposal | education | product_showcase | marketing | corporate | storytelling | futuristic | timeline | portfolio | data_story",
  "detectedIntent": "one sentence",
  "recommendedStyle": "apple_keynote | startup_pitch | minimal_dark | corporate | futuristic | luxury | glassmorphism | bento | editorial | creative | cinematic",
  "interviewAnswers": {
    "primaryAudience": "who this deck is for",
    "primaryOutcome": "what success looks like",
    "contentDepth": "summary | balanced | detailed",
    "visualDirection": "brand/visual direction",
    "toneDirection": "speaking/communication tone"
  },
  "narrativeArc": ["act labels"],
  "outline": [{"segment":"section name","slideIdeas":["idea 1","idea 2"]}],
  "visualRules": {
    "density": "sparse | balanced | rich",
    "maxBulletsPerSlide": 4,
    "imageryMood": "short phrase for consistent AI imagery"
  }
}

No markdown. JSON only.`;

/** Legacy alias ΓÇö kept for imports that reference DECK_JSON_RULES */
export { DECK_JSON_SCHEMA as DECK_JSON_RULES } from '@/lib/ai/deck-generation-skill';
