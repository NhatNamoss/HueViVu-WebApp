const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log("No GEMINI_API_KEY found in .env.local");
    return;
  }
  const genAI = new GoogleGenerativeAI(key);
  try {
    const fetch = global.fetch;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } catch (e) {
    console.error(e);
  }
}

run();
