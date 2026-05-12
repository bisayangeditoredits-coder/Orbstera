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

-- Insert the Billion Dollar SaaS Templates
INSERT INTO templates (slug, title, description, category, theme_id, color_gradient, text_color, icon_name, is_premium, base_prompt, system_prompt, variables) VALUES
(
  'seq-pitch', 
  'Series A Pitch Deck', 
  'The classic 12-slide structure. Optimized for VCs, highlighting traction, market size, and the ask.', 
  'Frameworks', 
  'modern-dark', 
  'from-blue-500 to-indigo-600', 
  'text-white', 
  'Briefcase', 
  false, 
  'Create a 12-slide Series A pitch deck using the Sequoia structure.', 
  'Strictly follow the Sequoia Capital pitch deck structure. Use a highly professional tone aimed at venture capitalists. Focus extensively on metrics, TAM, and the team.', 
  '[{"id": "companyName", "label": "Company Name", "placeholder": "e.g. Acme Corp"}, {"id": "problem", "label": "Problem Solved", "placeholder": "e.g. Inefficient data routing"}, {"id": "ask", "label": "Funding Ask", "placeholder": "e.g. $5M Series A"}]'
),
(
  'obsidian-cyber', 
  'Obsidian Cyber', 
  'Deep dark mode with glassmorphism and neon accents. Perfect for AI, Web3, and DevTools.', 
  'Aesthetics', 
  'tech', 
  'from-zinc-900 to-black', 
  'text-white', 
  'Palette', 
  true, 
  'Create a presentation with a Cyber-dark theme, neon accents, and deep black backgrounds.', 
  'You must adopt a dark, cyberpunk, high-tech aesthetic. Use futuristic language, neon glowing concepts, and emphasize AI or advanced technology.', 
  '[]'
),
(
  'b2b-sales', 
  'Enterprise Sales Playbook', 
  'A high-conversion B2B sales deck focusing on ROI, competitor comparison, and case studies.', 
  'Frameworks', 
  'corporate', 
  'from-sky-400 to-blue-600', 
  'text-white', 
  'TrendingUp', 
  false, 
  'Build an Enterprise B2B sales deck. Include competitor matrix, ROI calculation, and 2 case studies.', 
  'Structure the presentation as a B2B sales deck. Include slides for the value proposition, a clear ROI breakdown, a feature comparison matrix against top competitors, and detailed success case studies.', 
  '[{"id": "product", "label": "Product Name", "placeholder": "e.g. TurboFlow"}, {"id": "target", "label": "Target Audience", "placeholder": "e.g. Enterprise HR teams"}]'
),
(
  'data-to-deck', 
  'URL to Pitch Deck', 
  'Paste your website link and let our AI extract the copy to build your company profile deck.', 
  'AI Powers', 
  'gradient', 
  'from-purple-500 to-fuchsia-600', 
  'text-white', 
  'Link', 
  true, 
  'Generate a company profile presentation based on the following website URL: [Paste URL here]', 
  'Extract the core value proposition, team, and services from the provided text or URL. Output a company profile presentation.', 
  '[{"id": "url", "label": "Website URL", "placeholder": "https://"}]'
),
(
  'swiss-minimal', 
  'Swiss Minimalist', 
  'High contrast, massive typography, very clean. The ultimate investor-grade aesthetic.', 
  'Aesthetics', 
  'minimal', 
  'from-gray-100 to-white', 
  'text-neutral-900', 
  'Layout', 
  false, 
  'Use a Swiss minimalist aesthetic with massive typography, black and white contrast, and a grid layout.', 
  'Use extremely minimalist formatting. Very few words per slide. Focus on stark contrast and modern Swiss design principles.', 
  '[]'
),
(
  'yc-demo', 
  'Y-Combinator Demo Day', 
  'A 3-minute, high-impact structure designed for fast angel investor pitches.', 
  'Frameworks', 
  'warm', 
  'from-orange-500 to-red-600', 
  'text-white', 
  'Rocket', 
  true, 
  'Build a Y-Combinator Demo Day pitch deck. Max 5 slides, huge text, single metric focus.', 
  'The presentation must be extremely punchy. Limit to 5 slides. Focus entirely on traction, growth graph, and the core team.', 
  '[{"id": "traction", "label": "Main Traction Metric", "placeholder": "e.g. $10k MRR"}]'
);
