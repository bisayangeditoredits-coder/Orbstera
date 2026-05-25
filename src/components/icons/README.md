# Orbstera local icons

Premium toolbar icons from **Streamline Material — Rounded Line (free)** (`material-pro-rounded-line-free`).

- 100% offline React components in `generated/`
- Use `fill="currentColor"` for theme, hover, and dark mode
- **No** runtime API, CDN, or npm Streamline packages

To refresh icons (dev only):

```bash
STREAMLINE_API_KEY=your.key node scripts/fetch-streamline-icons.mjs
STREAMLINE_API_KEY=your.key node scripts/fetch-streamline-missing.mjs
```

Never commit API keys. Use `EditorIcons` from `@/components/icons/editor-icons` in editor chrome.
