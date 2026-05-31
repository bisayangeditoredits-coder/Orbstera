require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function test() {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('Key exists:', !!key);
  if (!key) return;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'Say hello!' }],
      temperature: 0.25,
      max_tokens: 8192,
      stream: false,
    }),
  });

  const text = await res.text();
  console.log(res.status, text);
}

test();
