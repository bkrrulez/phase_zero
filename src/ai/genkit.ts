import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',
      // CRITICAL CHANGE: Use the Vertex AI endpoint for Gemini
      // This is necessary because 'generativelanguage.googleapis.com' (the default) 
      // may not support all model formats or regions.
      useVertex: true, 
      
      // You must also specify a location (region) when using Vertex
      // 'us-central1' is a safe default.
      location: 'us-central1',

      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
});
