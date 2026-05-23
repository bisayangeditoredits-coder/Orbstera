import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const freeModels = data.data.filter(m => m.id.endsWith(':free'));
  freeModels.forEach(m => console.log(m.id));
}

test();
