/**
 * Prints OpenRouter key usage (account credits) from OPENROUTER_API_KEY
 * in .env.local or .env in the project root (parent of this scripts folder).
 *
 * API: https://openrouter.ai/docs/use-cases/usage-accounting
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

function getEnvVar(name) {
  const root = path.join(__dirname, '..');
  for (const file of ['.env.local', '.env']) {
    const fp = path.join(root, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const apiKey = getEnvVar('OPENROUTER_API_KEY');

if (!apiKey) {
  console.error('[ERR] OPENROUTER_API_KEY not found in .env.local or .env (project root).');
  process.exit(1);
}

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/auth/key',
  method: 'GET',
  headers: { Authorization: `Bearer ${apiKey}` },
};

console.log('OpenRouter — key usage (this API key only, not per-end-user unless you use separate keys)\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.data) {
        const { label, limit, usage, is_free_tier: isFreeTier } = json.data;
        console.log('-----------------------------------------');
        console.log('Label:      ', label || 'Default');
        console.log('Usage:      ', typeof usage === 'number' ? `$${usage.toFixed(4)}` : usage);
        if (limit === null || limit === undefined) {
          console.log('Limit:       (none set)');
        } else {
          const lim = parseFloat(limit);
          const used = parseFloat(usage);
          console.log('Limit:      ', `$${lim.toFixed(4)}`);
          if (!Number.isNaN(lim) && !Number.isNaN(used)) {
            const remaining = lim - used;
            console.log('Remaining:  ', `$${remaining.toFixed(4)}`);
            if (remaining <= 0) console.log('\n[WARN] Limit reached or exceeded.');
          }
        }
        console.log('Free tier:  ', isFreeTier ? 'yes' : 'no');
        console.log('-----------------------------------------');
      } else if (json.error) {
        console.error('[ERR]', json.error.message || json.error);
      } else {
        console.log('Raw response:', data.slice(0, 2000));
      }
    } catch (e) {
      console.error('[ERR] Could not parse JSON. HTTP', res.statusCode);
      console.error(data.slice(0, 1500));
    }
  });
});

req.on('error', (e) => {
  console.error('[ERR] Network:', e.message);
  process.exit(1);
});

req.end();
