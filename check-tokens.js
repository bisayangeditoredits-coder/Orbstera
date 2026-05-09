const fs = require('fs');
const https = require('https');

// Helper to get env variable
function getEnvVar(name) {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(new RegExp(`^${name}=(.*)`, 'm'));
      if (match) {
        return match[1].trim();
      }
    }
  }
  return null;
}

const apiKey = getEnvVar('OPENROUTER_API_KEY');

if (!apiKey) {
  console.error('❌ ERROR: OPENROUTER_API_KEY not found in .env or .env.local');
  process.exit(1);
}

console.log('⏳ Checking OpenRouter API credits...\n');

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/auth/key',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.data) {
        const { label, limit, usage, is_free_tier } = json.data;
        console.log('=========================================');
        console.log(`🔑 OpenRouter Key Info`);
        console.log('=========================================');
        console.log(`   Label:       ${label || 'Default'}`);
        console.log(`   Usage:       $${usage.toFixed(4)}`);
        
        if (limit === null) {
           console.log(`   Limit:       No limit set`);
        } else {
           console.log(`   Limit:       $${limit.toFixed(4)}`);
           const remaining = parseFloat(limit) - parseFloat(usage);
           console.log(`   Remaining:   $${remaining.toFixed(4)}`);
           if (remaining <= 0) {
               console.log('\n❌ WARNING: YOU ARE OUT OF TOKENS/CREDITS!');
           }
        }
        
        console.log(`   Free Tier:   ${is_free_tier ? 'Yes' : 'No'}`);
        console.log('=========================================\n');
      } else if (json.error) {
        console.error('❌ API Error:', json.error.message);
      } else {
        console.log('Response:', json);
      }
    } catch (e) {
      console.log('Failed to parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network Error:', e.message);
});

req.end();
