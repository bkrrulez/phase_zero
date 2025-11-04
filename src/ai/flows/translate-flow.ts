'use server';
/**
 * @fileOverview A rule book translation AI flow.
 *
 * - translateText - A function that handles the rule book translation process.
 */
import { z } from 'zod';
// Import the shared 'ai' instance
import { ai } from '../genkit'; 

// --- SCHEMAS ---

// Input schema (used for Zod validation on prompt input)
const TranslationInputSchema = z.object({
  jsonString: z.string()
});

// Output schema (CRITICAL for Structured Output)
// This forces the model to return a valid JSON object matching the input structure.
const TranslationOutputSchema = z.record(z.string(), z.string());

// --- PROMPT DEFINITION ---

const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  input: { schema: TranslationInputSchema },
  // Use stable model name
  model: 'googleai/gemini-1.5-flash-latest', 
  output: { schema: TranslationOutputSchema },
  
  prompt: `
Translate the following JSON object from German to English.

Rules:
1. Translate all string values from German to English
2. Keep all keys exactly the same
3. Do not translate proper nouns, technical terms, or variable names
4. Maintain all special characters and formatting

Original JSON:
{{{jsonString}}}
`,
  config: {
    temperature: 0.1,
    responseMimeType: 'application/json',
  },
});

// --- FLOW FUNCTION ---

export async function translateText(
  germanText: Record<string, string>
): Promise<Record<string, string>> {
  const jsonString = JSON.stringify(germanText, null, 2);
  
  const { output } = await translateToEnglishPrompt({ 
    jsonString
  });

  if (!output) {
    throw new Error('Translation failed: AI model did not return a structured output.');
  }
  
  return output as Record<string, string>;
}
