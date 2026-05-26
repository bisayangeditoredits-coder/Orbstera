const fs = require('fs');

const analyzerString = `const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});\n\n`;

let c = fs.readFileSync('d:/pptmaker/next.config.js', 'utf8');

if (!c.includes('withBundleAnalyzer')) {
  c = analyzerString + c;

  c = c.replace(
    /module\.exports = process\.env\.SENTRY_DSN\n  \? withSentryConfig\(nextConfig,/g,
    'module.exports = process.env.SENTRY_DSN\n  ? withSentryConfig(withBundleAnalyzer(nextConfig),'
  );
  c = c.replace(
    /    \}\)\n  : nextConfig;/g,
    '    })\n  : withBundleAnalyzer(nextConfig);'
  );

  fs.writeFileSync('d:/pptmaker/next.config.js', c, 'utf8');
  console.log('Analyzer added');
} else {
  console.log('Already configured');
}
