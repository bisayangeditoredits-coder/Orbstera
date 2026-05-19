-- Supabase SQL Migration: Create Templates Table

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  theme_id TEXT NOT NULL, 
  color_gradient TEXT, 
  text_color TEXT,
  icon_name TEXT, 
  is_premium BOOLEAN DEFAULT false,
  base_prompt TEXT NOT NULL, 
  system_prompt TEXT, 
  variables JSONB DEFAULT '[]'::jsonb, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

-- Upsert the Billion Dollar SaaS Templates (safe to re-run)
INSERT INTO templates (slug, title, description, category, theme_id, color_gradient, text_color, icon_name, is_premium, base_prompt, system_prompt, variables) VALUES
(
  'seq-pitch', 
  'Series A Pitch Deck', 
  'The classic 12-slide VC structure. Market size, traction, team, and the ask — built to impress top-tier investors.', 
  'Frameworks', 
  'modern-dark', 
  'from-blue-500 to-indigo-600', 
  'text-white', 
  'Briefcase', 
  false, 
  'Create a professional 12-slide Series A pitch deck for {{companyName}}. The company solves {{problem}} and is raising {{ask}}. Follow the Sequoia Capital pitch structure: cover slide, company purpose, the problem (with data), our solution, why now, market size (TAM/SAM/SOM with real estimates), product (with visuals), business model, traction (MRR, users, growth %), team (names and relevant backgrounds), financials (18-month roadmap), and the ask (amount, use of funds breakdown). Use compelling investor-grade language, specific numbers, and a confident narrative. Generate FLUX images for the product mockup slide and the team slide. Use a dark navy color palette with blue accents.',
  'You are an elite pitch deck consultant who has helped startups raise over $500M in venture capital. Your decks are known for their clarity, compelling narrative, and data-driven insights. Follow the Sequoia Capital pitch deck structure rigorously. Every claim must be backed by numbers. Use active, confident language. Avoid buzzwords — use specifics. The deck must flow as a complete story: problem → solution → market → traction → team → ask.',
  '[{"id": "companyName", "label": "Company Name", "placeholder": "e.g. Acme Corp"}, {"id": "problem", "label": "Problem Being Solved", "placeholder": "e.g. Inefficient cross-border payments for SMBs"}, {"id": "ask", "label": "Funding Ask", "placeholder": "e.g. $5M Series A at $20M pre-money valuation"}]'
),
(
  'obsidian-cyber', 
  'Obsidian Cyber', 
  'Cyberpunk dark mode with neon glows and glassmorphism. Perfect for AI, Web3, DevTools, and cutting-edge tech.', 
  'Aesthetics', 
  'tech', 
  'from-zinc-900 to-black', 
  'text-white', 
  'Palette', 
  true, 
  'Create a visually stunning 10-slide presentation with a Cyberpunk aesthetic. Use deep black backgrounds (#000000 to #0d0d1a), neon violet and cyan accents, glassmorphism panels with glowing borders, and futuristic typography. Generate FLUX images in a cinematic cyberpunk art style — neon-lit cityscapes, glowing circuit boards, holographic interfaces — for at least 3 slides. The content should feel like a product launch from the year 2075: high-energy, bold headlines, and data visualizations that look like they came from a HUD display. Slides should include: Hero/Cover, The Problem (animated stat), Our Solution (holographic product visual), How It Works (3-step diagram), Market Map, Key Features (icon grid), Traction Dashboard, Vision/Mission, Team, and CTA.',
  'You are a world-class creative director specializing in cyberpunk and futuristic tech aesthetics. Your presentations are visual masterpieces — dark, neon, and powerful. Every slide must be visually striking. Use short, punchy copy (5 words max per headline). Image prompts must describe hyper-realistic cyberpunk scenes: neon city, dark lab, holographic data, glowing AI interfaces. Color palette is strictly: #000000, #7c3aed, #06b6d4, #ffffff. Every slide should feel like a movie poster.',
  '[]'
),
(
  'b2b-sales', 
  'Enterprise Sales Playbook', 
  'A high-conversion B2B sales deck with ROI calculator, competitor matrix, and real-world case studies.', 
  'Frameworks', 
  'corporate', 
  'from-sky-400 to-blue-600', 
  'text-white', 
  'TrendingUp', 
  false, 
  'Build a 12-slide Enterprise B2B sales deck for {{product}} targeting {{target}}. Structure the deck as follows: (1) Hero/Cover with a bold value proposition headline, (2) The Business Challenge — specific pain points for {{target}}, (3) The Cost of Inaction — quantify the cost of NOT solving this (in $ and hours lost), (4) Introducing {{product}} — product overview with a FLUX-generated product screenshot or mockup, (5) How It Works — 3-step visual process, (6) ROI Calculator — show exact savings/gains (e.g., "$X saved per year per team of 10"), (7) Feature Comparison Matrix vs. top 3 competitors (use a table), (8) Case Study 1 — specific customer win with before/after metrics, (9) Case Study 2 — second industry vertical win, (10) Security & Compliance — enterprise trust signals, (11) Pricing / Next Steps — clear CTA with pricing tiers or a discovery call ask, (12) Thank You + Contact. Use a professional blue and white palette with clean data visualizations.',
  'You are a Senior Enterprise Sales Director with 15 years of experience closing 7-figure B2B deals. Your decks are built for CFOs, CTOs, and procurement committees. Every slide must have a clear business value point. Lead with pain, reinforce with proof, close with ROI. Use specific numbers and real-world analogies. The competitor matrix must show honest differentiation — do not trash competitors, show clear advantages. The case studies must have a clear Problem → Solution → Result structure with quantified outcomes.',
  '[{"id": "product", "label": "Product Name", "placeholder": "e.g. TurboFlow Analytics"}, {"id": "target", "label": "Target Audience", "placeholder": "e.g. Enterprise HR teams at Fortune 500 companies"}]'
),
(
  'data-to-deck', 
  'URL to Pitch Deck', 
  'Paste your website URL and our AI reads your copy, extracts the key value props, and builds your company profile deck.', 
  'AI Powers', 
  'gradient', 
  'from-purple-500 to-fuchsia-600', 
  'text-white', 
  'Link', 
  true, 
  'Visit and analyze this website URL: {{url}}. Based on the website content, build a 10-slide company profile presentation. Extract: the company name, their core mission, main product or service, target audience, key features (at least 3), any mentioned social proof (testimonials, client logos, user numbers), team information, and contact details. Structure the deck as: (1) Company Cover (logo + tagline), (2) Mission & Vision, (3) The Problem They Solve, (4) Their Solution, (5) Key Features (visual grid with FLUX icons/illustrations), (6) How It Works (3-step process), (7) Social Proof / Traction, (8) Team, (9) Partners / Clients, (10) Contact / CTA. Generate FLUX images that match the company''s brand colors and industry aesthetic.',
  'You are an AI research analyst and brand storyteller. Your job is to read a company website and transform it into a compelling visual presentation. Extract real information — do not invent data. If something is not mentioned on the website, use intelligent assumptions based on the industry (and flag them as assumptions). The presentation must feel authentic to the brand''s voice. Match the color palette to what you infer from the website.',
  '[{"id": "url", "label": "Website URL", "placeholder": "https://yourcompany.com"}]'
),
(
  'swiss-minimal', 
  'Swiss Minimalist', 
  'High contrast, massive typography, zero clutter. The investor-grade aesthetic used by top design studios.', 
  'Aesthetics', 
  'minimal', 
  'from-gray-100 to-white', 
  'text-neutral-900', 
  'Layout', 
  false, 
  'Create a 10-slide presentation using Swiss International Style (Helvetica, grid-based, radical minimalism). Rules you MUST follow: (1) Maximum 8 words per headline, (2) Maximum 2 sentences of body copy per slide, (3) Black, white, and ONE accent color only — choose from red, electric blue, or forest green, (4) Every slide must have a strong visual hierarchy — one dominant element (large number, bold quote, or dramatic image), (5) Generate FLUX images in a clean, editorial photography style — black and white photography, high contrast, wide margins. Slide structure: Cover (company name + single powerful statement), Problem (one bold statistic), Solution (product name + one-line description), Market (TAM as a massive bold number), Product (clean product photo), Traction (single key metric, massive), Team (minimalist headshots), Differentiator (3-word statement), Vision (one powerful quote), CTA (simple, direct).',
  'You are a Swiss graphic design legend trained at the Basel School of Design. You believe in the power of whitespace. You follow Josef Müller-Brockmann''s grid system religiously. Simplicity IS the strategy. Every word must earn its place. If a slide has more than 10 words, it is a failure. Use dramatic scale contrast — make numbers and key words HUGE (4-5x bigger than body text). Do not use gradients. Do not use decorative elements. Only use geometry as decoration.',
  '[]'
),
(
  'yc-demo', 
  'Y-Combinator Demo Day', 
  'A 5-slide, 3-minute structure built for Demo Day. One metric, one team, one ask. Maximum impact, zero fluff.', 
  'Frameworks', 
  'warm', 
  'from-orange-500 to-red-600', 
  'text-white', 
  'Rocket', 
  true, 
  'Create a 5-slide Y-Combinator Demo Day pitch deck for a startup whose main traction metric is {{traction}}. This deck must be ruthlessly edited — every word counts. Structure: (1) COVER — Company name, one-liner (what you do in 10 words), and the traction metric in HUGE type ({{traction}}). Generate a FLUX hero image that shows the product in action. (2) THE PROBLEM — One powerful statistic that proves the problem is massive and urgent. No more than 2 sentences. (3) OUR SOLUTION + PRODUCT — Product name, one screenshot or FLUX-generated mockup, and 3 bullet points of core functionality. (4) TRACTION + GROWTH — Show a growth graph (describe it as rising steeply). List 3 key metrics: MRR/ARR, user count, month-over-month growth %. (5) TEAM + THE ASK — Founder names, one-sentence credential each, funding ask, and use of funds (3 line items only). Use a bold orange-to-red gradient, massive white typography, and a high-energy layout.',
  'You are a Y-Combinator partner preparing a batch company for Demo Day. You have seen 10,000 pitches. The best ones are brutal in their simplicity. You will CUT anything that is not essential. No "we are building a platform". Say what you do, show your numbers, prove your team can execute, make the ask. 5 slides. 3 minutes. No backup slides. This must be the best 5 slides of the founder''s life.',
  '[{"id": "traction", "label": "Main Traction Metric", "placeholder": "e.g. $47K MRR · 3x MoM growth"}]'
)
ON CONFLICT (slug) DO UPDATE SET
  title         = EXCLUDED.title,
  description   = EXCLUDED.description,
  category      = EXCLUDED.category,
  theme_id      = EXCLUDED.theme_id,
  color_gradient= EXCLUDED.color_gradient,
  text_color    = EXCLUDED.text_color,
  icon_name     = EXCLUDED.icon_name,
  is_premium    = EXCLUDED.is_premium,
  base_prompt   = EXCLUDED.base_prompt,
  system_prompt = EXCLUDED.system_prompt,
  variables     = EXCLUDED.variables;
