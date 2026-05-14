# Orbstera Desktop (Electron, cloud mode)

The desktop app is a **secure shell** around the live Next.js deployment. It does not bundle the web app; it loads your production URL (or localhost in development). Supabase, OpenRouter, and all APIs stay exactly as on the web.

**Tagalog / kung “ikaw na ang gumawa”:** Hindi namin ma-set ang Vercel dashboard, GitHub Releases, o R2 bucket mula dito (kailangan ng account mo). Ang maipapamana namin sa repo: (1) workflow sa GitHub na magbu-build ng `.exe` sa cloud, (2) mga script sa `package.json`. Kung `npm install` sa PC mo ay `ENOSPC` (punong disk), magbakante muna ng space **o** gamitin ang workflow sa ibaba — doon may libreng disk ang runner.

---

## Sunod-sunod (Tagalog) — para hindi mahirap intindihin

### Ano ba ang pinaguusapan natin?

May **dalawang hiwalay na bagay**:

1. **Orbstera Desktop (.exe)** — parang “Chrome window” na dedicated lang sa Orbstera. Bubuksan niya ang **parehong live website** mo (Vercel), kaya pareho pa rin ang login at data (Supabase).
2. **“Download for Windows” sa homepage** — isang **link** lang iyan sa installer na naka-host mo (halimbawa sa GitHub).

Kailangan mo lang gawin ang **Part A** tapos **Part B** sa ibaba.

---

### Part A: Paano makukuha ang `.exe` (build sa GitHub)

**Handa ka muna:** alamin ang **eksaktong URL** ng live Orbstera mo sa browser — halimbawa `https://orbstera.vercel.app` (palitan ng totoo sa iyo).

1. **I-upload ang code sa GitHub**  
   Kung nandiyan na ang project mo sa GitHub, okay na ito.

2. **Maglagay ng secret (isang beses lang)**  
   - Buksan ang repo sa GitHub → **Settings** (taas, tab ng repo).  
   - Sa kaliwang menu: **Secrets and variables** → **Actions**.  
   - **New repository secret**  
   - **Name:** `ORBSTERA_LOAD_URL`  
   - **Secret:** i-paste ang live URL mo (dapat may `https://`, walang slash sa dulo kung hindi mo kailangan), hal. `https://orbstera.vercel.app`  
   - **Add secret**

3. **Patakbuhin ang workflow**  
   - **Actions** (taas ng repo)  
   - Sa kaliwa, piliin ang **Electron Windows**  
   - **Run workflow** (dropdown sa kanan) → **Run workflow** (button)  
   - Hintayin matapos (green check). Kung pula, buksan ang run at basahin ang error.

4. **Kunin ang file**  
   - Click ang **tapos na** run (yung may green check)  
   - Sa baba ng page may **Artifacts** → i-download ang zip (hal. `orbstera-windows-123`)  
   - I-unzip mo sa PC. Makikita mo doon ang **dalawang `.exe`** (isa = installer na may wizard, isa = portable).

**Tandaan:** Ang `ORBSTERA_LOAD_URL` = “anong site ang bubuksan ng desktop app.” Dapat **pareho** sa URL na ginagamit ng users sa browser.

---

### Part B: Paano gagana ang “Download for Windows” sa website

Kailangan ng homepage ng **direktang download link** sa isang `.exe` na naka-host sa internet.

**Pinakasimple na paraan (GitHub Release):**

1. Sa GitHub repo mo → **Releases** (o **Releases** mula sa kanan) → **Create a new release**  
2. **Tag:** hal. `v0.1.0-desktop` (basta bago / unique)  
3. **Title:** kahit ano, hal. `Orbstera Desktop Windows`  
4. **Attach binaries:** i-drag ang **installer** na `.exe` (kadalasan may pangalan na parang `Orbstera Setup …` o NSIS — huwag yung portable kung gusto mo ng “install like normal app”).  
5. **Publish release**  
6. Pagkatapos mag-publish, **right-click** sa file na in-upload mo → **Copy link address** (o buksan ang file sa release page at kopyahin ang URL sa address bar ng download). Dapat **https** at diretso sa `.exe`.

**Ilagay sa Vercel:**

1. Buksan **Vercel** → piliin ang project ng Orbstera  
2. **Settings** → **Environment Variables**  
3. **Add New**  
   - **Key:** `NEXT_PUBLIC_WINDOWS_DESKTOP_INSTALLER_URL`  
   - **Value:** i-paste ang link na kinopya mo mula sa GitHub Release (yung direktang download ng `.exe`)  
   - **Environment:** Production (at Preview kung gusto mo rin doon)  
4. **Save**  
5. **Redeploy** ang latest deployment (Deployments → … → Redeploy) para ma-load ng site ang bagong env.

Pagkatapos niyan, dapat gumana na ang download button sa homepage (kung naka-set ang URL).

---

### Kung gusto mo lang subukan sa PC (hindi pa installer)

Pag may space na ang disk at tumakbo na ang `npm install`:

```bash
npm run electron:dev
```

Bubuksan nito ang Orbstera mula sa `http://127.0.0.1:3000` kasabay ng Next dev server.

---

## Build sa GitHub (kapag puno ang disk sa laptop o gusto ng CI)

1. I-push ang repo sa GitHub.
2. Sa **Settings → Secrets and variables → Actions**:
   - **Secret** na `ORBSTERA_LOAD_URL` = buong production URL (hal. `https://iyong-app.vercel.app`), **o**
   - **Variable** na `ORBSTERA_LOAD_URL` = parehong URL (pwede ring secret lang).
3. Pumunta sa **Actions → “Electron Windows” → Run workflow**. Puwede mong i-override ang URL sa field na `load_url`.
4. Pagkatapos, i-download ang **Artifacts** (`orbstera-windows-*`) — nandoon ang NSIS installer at portable `.exe`.
5. I-upload ang installer sa pinili mong host (GitHub Release asset, R2 public URL, atbp.), tapos i-set sa Vercel ang `NEXT_PUBLIC_WINDOWS_DESKTOP_INSTALLER_URL` sa direktang link ng file.

Workflow file: `.github/workflows/electron-windows.yml` (repo root).

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
