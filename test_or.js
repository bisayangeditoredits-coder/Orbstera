const fetch = require('node-fetch');

async function getModels() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const freeModels = data.data.filter(m => m.pricing.prompt === '0' && m.pricing.completion === '0');
  
  console.log("Valid Free Models:");
  freeModels.forEach(m => console.log(m.id));
}

getModels();
