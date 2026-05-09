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

const payload = JSON.stringify({
  model: 'google/gemini-2.0-pro-exp-02-05:free',
  messages: [{ role: 'user', content: 'Say hello in JSON { "message": "hello" }' }]
});

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Orvixes PPT Maker',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("BODY:", data);
  });
});

req.on('error', (e) => {
  console.error('Network Error:', e.message);
});

req.write(payload);
req.end();
