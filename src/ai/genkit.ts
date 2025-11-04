import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// The 'ai' instance is configured for the public Gemini API.
export const ai = genkit({
  plugins: [
    googleAI({
      // API version remains 'v1'
      apiVersion: 'v1',
      // API key lookup is correct, prioritizing GEMINI_API_KEY by Genkit convention
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
});
