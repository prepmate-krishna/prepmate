// lib/openai.js
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn("lib/openai: OPENAI_API_KEY not set. Falling back to null (local fallback will be used).");
}

export default openai;
