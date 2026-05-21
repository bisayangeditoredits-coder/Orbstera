export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readMinutes: number;
  body: string[];
  /** Hero / card image (Unsplash or /public path) */
  image: string;
  imageAlt: string;
  category: string;
  /** Tailwind gradient stops for card fallback [from, via, to] */
  accent: [string, string, string];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'designing-decks-that-close',
    title: 'Designing decks that close',
    date: '2026-04-02',
    excerpt:
      'Why narrative structure beats decoration, and how teams align on one storyline before a single slide is styled.',
    readMinutes: 6,
    category: 'Strategy',
    image:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=2000&q=85',
    imageAlt: 'Team reviewing a presentation on a large display in a modern office',
    accent: ['#0f172a', '#1e3a5f', '#3b82f6'],
    body: [
      'The best presentations are not collections of slides. They are arguments: a claim, evidence, and a clear ask. When teams start with layout, they optimize for aesthetics instead of outcomes.',
      'Begin with a one-page outline: audience, tension, resolution, and the single decision you need at the end of the room. Every slide should advance that arc. If a slide does not change what the audience believes or does next, cut it.',
      'Visual hierarchy exists to reduce cognitive load. Limit concurrent ideas on screen, align type to a strict scale, and let imagery support the sentence on the slide instead of repeating it.',
      'Orbstera is built to keep you in that discipline: fast iteration on structure first, cinematic visuals second, so your deck reads like a product narrative—not a template lottery.',
    ],
  },
  {
    slug: 'from-prompt-to-pitch-in-minutes',
    title: 'From prompt to pitch in minutes',
    date: '2026-04-18',
    excerpt:
      'A practical walkthrough of turning a rough idea into a coherent deck using AI orchestration without losing your voice.',
    readMinutes: 5,
    category: 'Workflow',
    image:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=85',
    imageAlt: 'Collaborators working together around a laptop in a bright workspace',
    accent: ['#1e1b4b', '#4338ca', '#818cf8'],
    body: [
      'Most founders lose time translating a brain dump into slide order. Large language models excel at sequencing: they can propose sections, slide titles, and supporting bullets faster than any blank canvas.',
      'The risk is homogenization. The fix is tight prompting: audience, tone, taboo topics, and examples of phrasing you like. Treat the first generation as scaffolding, not scripture.',
      'Iterate in passes: outline, then narrative, then visuals. Tools that separate those passes preserve your taste while automating grunt work.',
      'With Orbstera, that workflow is first-class—so you spend minutes aligning the story and hours polishing the delivery, not the reverse.',
    ],
  },
  {
    slug: 'motion-that-respects-the-room',
    title: 'Motion that respects the room',
    date: '2026-05-01',
    excerpt:
      'When animation helps retention—and when it becomes noise. Guidelines for teams presenting live and async.',
    readMinutes: 4,
    category: 'Craft',
    image:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=85',
    imageAlt: 'Abstract flowing gradient shapes suggesting motion and light',
    accent: ['#042f2e', '#0d9488', '#5eead4'],
    body: [
      'Motion should answer where to look next. If it does not, it competes with the speaker. Prefer short entrances and consistent direction so the audience builds a spatial model of your deck.',
      'Async viewers scrub. Design for pause frames: each slide should read as a poster for three seconds without audio.',
      'In live rooms, respect reduced-motion settings and rehearsal time. A reliable deck beats a flashy one when the stakes are high.',
      'Orbstera’s presenter layer is tuned for restraint: cinematic when you want it, disciplined when the room demands focus.',
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function formatBlogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
