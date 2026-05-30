const fs = require('fs');
let c = fs.readFileSync('src/lib/export/export-image.ts', 'utf8');

c = c.replace(
  /if \(key && !key\.includes\('\.\.'\)\) return decodeURIComponent\(key\);/,
  `if (key) {
        const decoded = decodeURIComponent(key);
        // BUG-39 fix: check for '..' AFTER decoding
        if (!decoded.includes('..')) return decoded;
      }`
);

c = c.replace(
  /try \{\r?\n\s+return decodeURIComponent\(m\[1\]\);\r?\n\s+\} catch \{/,
  `try {
          const decoded = decodeURIComponent(m[1]);
          if (!decoded.includes('..')) return decoded;
        } catch {`
);

c = c.replace(
  /const pathMatch = trimmed\.match\(\/presentations\\\\\/\[0-9a-f-\]\{8,\}\[^\\?#\]\*\/i\);\r?\n\s+if \(pathMatch\?\.\[0\] && !pathMatch\[0\]\.includes\('\.\.'\)\) \{\r?\n\s+return pathMatch\[0\];\r?\n\s+\}/,
  `// BUG-40 fix: only extract presentations/ if it's a relative path or our own host
  if (
    trimmed.startsWith('/') ||
    trimmed.includes('orbstera.local') ||
    trimmed.includes('orbstera.vercel.app') ||
    trimmed.includes('cdn.orbstera.com')
  ) {
    const pathMatch = trimmed.match(/presentations\\/[0-9a-f-]{8,}[^?#]*/i);
    if (pathMatch?.[0] && !pathMatch[0].includes('..')) {
      return pathMatch[0];
    }
  }`
);

c = c.replace(
  /if \(url\.startsWith\('blob:'\)\) return null;/,
  `if (url.startsWith('blob:')) {
    console.warn('[pptx-export] Cannot export blob: URL, skipping', url.slice(0, 80));
    return null;
  }`
);

c = c.replace(
  /if \(fetchUrl\.startsWith\('\/api\/'\)\) \{\r?\n\s+return null;\r?\n\s+\}/,
  `if (fetchUrl.startsWith('/api/')) {
    console.warn('[pptx-export] Unresolved internal API URL reached fetch, skipping', fetchUrl);
    return null;
  }`
);

c = c.replace(
  /const buf = await res\.arrayBuffer\(\);\r?\n\s+if \(buf\.byteLength < 16\) return null;\r?\n\s+const mime = \(res\.headers\.get\('content-type'\) \|\| 'image\/jpeg'\)\.split\(';'\)\[0\]\.trim\(\);/,
  `const buf = await res.arrayBuffer();
    // BUG-43 fix: 20MB limit for images to prevent memory exhaustion
    if (buf.byteLength < 16 || buf.byteLength > 20_000_000) {
      console.warn('[pptx-export] Image size out of bounds (16B - 20MB)', fetchUrl.slice(0, 120));
      return null;
    }
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();`
);

c = c.replace(
  /const buf = await res\.arrayBuffer\(\);\r?\n\s+if \(buf\.byteLength < 16\) return null;\r?\n\s+const mime = \(res\.headers\.get\('content-type'\) \|\| 'video\/mp4'\)\.split\(';'\)\[0\]\.trim\(\);/,
  `const buf = await res.arrayBuffer();
    // BUG-44 fix: 100MB limit for videos to prevent memory exhaustion
    if (buf.byteLength < 16 || buf.byteLength > 100_000_000) {
      console.warn('[pptx-export] Video size out of bounds (16B - 100MB)', fetchUrl.slice(0, 120));
      return null;
    }
    const mime = (res.headers.get('content-type') || 'video/mp4').split(';')[0].trim();`
);

fs.writeFileSync('src/lib/export/export-image.ts', c);
console.log('Success rewriting export-image.ts');
