const token = '1ded889c-1e0d-4235-abb8-7b1589049d8b';
const reqBody = {
  prompt: 'A car with an airplane',
  modelId: 'b28b7468-15ab-43b9-a4c3-b4d24177265a',
  width: 1024,
  height: 1024,
  num_images: 1,
  alchemy: false,
  photoReal: false,
};

fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(reqBody)
}).then(res => res.text()).then(console.log).catch(console.error);
