# Orbstera Desktop (Electron, cloud mode)

The desktop app is a **secure shell** around the live Next.js deployment. It does not bundle the web app; it loads your production URL (or localhost in development). Supabase, OpenRouter, and all APIs stay exactly as on the web.

## Local development

```bash
npm install
npm run electron:dev
```

This runs `next dev` and opens Electron when `http://127.0.0.1:3000` is ready. Override the target with `ORBSTERA_LOAD_URL` if needed.

## Production-style preview (local Next build)

```bash
npm run electron:preview
```

## Windows installer + portable `.exe`

1. Set **`ORBSTERA_LOAD_URL`** or **`NEXT_PUBLIC_APP_URL`** to your live site (e.g. `https://your-app.vercel.app`) so the packaged app knows which URL to open.
2. From the repo root on Windows:

```bash
npm run electron:pack
```

Artifacts are written to **`release/`** (NSIS installer and portable executable). Upload the installer to GitHub Releases, R2, or another CDN.

3. On Vercel, set **`NEXT_PUBLIC_WINDOWS_DESKTOP_INSTALLER_URL`** to the **direct HTTPS URL** of the NSIS installer so the homepage “Download for Windows” button works.

**Code signing:** Unsigned builds may show a SmartScreen prompt until you add a Windows signing certificate.

## Supabase

Keep your production origin in Supabase **Site URL** and **Redirect URLs**. The desktop client loads that same origin, so OAuth behaves like another browser profile.
