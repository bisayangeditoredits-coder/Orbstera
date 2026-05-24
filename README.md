# Orbstera AI — Cinematic Presentation Generation

Orbstera is an elite, industrial-grade AI presentation platform designed to transform raw ideas into stunning, architecturally sound cinematic decks in seconds.

## 🚀 Vision

We believe that presentations should be more than just slides; they should be immersive experiences. Orbstera combines high-end design aesthetics with cutting-edge AI models to deliver professional results that traditionally take days of manual work.

## ✨ Core Features

- **Neural Prompt v4**: Transform single-sentence ideas into 30+ slide strategic presentations.
- **Cinematic AI Images**: Deeply integrated image generation using Flux/Stable Diffusion models.
- **Voice Protocol**: Professional hands-free presentation architecting.
- **AI Enhancer**: Upload legacy PPTX files and watch Orbstera redesign them into modern masterpieces.
- **Architectural Typography**: Perfectly balanced heading and body pairings (Space Grotesk + Inter).
- **Industrial Minimalist Design**: A premium dark-mode interface built for creative professionals.

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Database**: [Supabase](https://supabase.com/)
- **Intelligence**: [OpenRouter](https://openrouter.ai/) (DeepSeek R1, Claude 3.5 Sonnet, Llama 3.3)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- **Payments**: [Dodo Payments](https://dodopayments.com/)
- **Cache**: [Upstash Redis](https://upstash.com/)

## 🚦 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Environment Variables**: Copy `.env.example` to `.env.local` and fill in the secrets.
4. **Run development server**: `npm run dev`

## Production scale

Before going live with real traffic, follow **[docs/PRODUCTION_DEPLOY.md](docs/PRODUCTION_DEPLOY.md)**:

```bash
npm run verify:scale-env:strict
npm run worker:generate:bullmq   # separate process / Docker
npm run load-test:api -- https://your-domain.com 20
```

CI runs `npm run lint`, scale env logic checks, and `next build` on every push.

## 💎 Monetization Model

Orbstera utilizes a tiered subscription model managed via Dodo Payments:
- **Free**: 3 generations/mo, 5 slides max, Standard Intelligence.
- **Student Pro**: 30 generations/mo, 25 slides max, Fast Intelligence (Claude 3.5).
- **Creator Pro**: 100 generations/mo, 30 slides max, Elite Intelligence (DeepSeek R1).

## Cloud save, R2, and export

Deck JSON and exports stay small by **offloading large inline images** to Cloudflare R2 before calling `/api/presentations` or `/api/export/pptx`. Configure:

- `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`
- **`NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL`** — public base URL for objects (required for presigned URLs and for the same-origin `/api/presentations/upload-asset` fallback to return stable `https://…` image links). The **editor** rewrites those URLs to `GET /api/presentations/read-asset?key=…` so images load while you are signed in even if the bucket is not publicly readable; **public share links** still need objects readable at that HTTPS URL (or a custom public domain on the bucket).

**R2 bucket CORS**: allow `GET` and `PUT` from your web app origin (and `http://localhost:3000` for dev) so the browser can use presigned PUT URLs for **images** and for **large deck JSON** (staging uploads when the deck exceeds the Vercel request size limit). If CORS is wrong, the app falls back to **server-side upload** via `POST /api/presentations/upload-asset` for images under ~4 MB, but very large decks still require a successful presigned PUT to R2.

## Legacy `.ppt` import

Only **`.pptx`** is parsed in-app today. Legacy binary **`.ppt`** requires a conversion step. Practical options for a future pipeline:

1. **Dedicated worker/container** with **LibreOffice** (`soffice --headless --convert-to pptx`) then feed the buffer to the existing `convertPptxBufferToPresentation` importer.
2. **Third-party conversion API** (commercial) if you do not want to run LibreOffice.
3. **User workflow**: open in PowerPoint / LibreOffice, **Save As → .pptx**, then import (supported today).

## 🛡️ License

Private and Confidential. Built by the Orbstera Creative Team.
