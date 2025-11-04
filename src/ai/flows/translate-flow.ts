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
  // 1. CRITICAL FIX: Use the stable, public API model name.
  // This avoids the deprecated '*-latest' alias and the Vertex AI specific names.
  model: 'googleai/gemini-2.5-flash', 
  
  // 2. RECOMMENDED: Enforce JSON output structure using Zod schema
  output: { schema: TranslationOutputSchema },
  
  prompt: `
Translate the following JSON object from German to English.

Rules:
1. Translate all string values from German to English
2. Keep all keys exactly the same
3. Do not translate proper nouns, technical terms, or variable names
4. Maintain all special characters and formatting
// Removed the instruction "Return ONLY valid JSON..." since responseSchema enforces it.

Original JSON:
{{{jsonString}}}
`,
  config: {
    temperature: 0.1,
    // 3. RECOMMENDED: Specify the output format
    responseMimeType: 'application/json', 
  },
});

// --- FLOW FUNCTION ---

export async function translateText(
  germanText: Record<string, string>
): Promise<Record<string, string>> {
  // Convert the JavaScript object to a JSON string for the prompt input
  const jsonString = JSON.stringify(germanText, null, 2);
  
  // Call the prompt. The response will contain a structured 'output' property 
  // that is guaranteed (by the model/Genkit) to match TranslationOutputSchema.
  const { output } = await translateToEnglishPrompt({ 
    jsonString
  });

  if (!output) {
    // This should only happen in rare cases, as the schema constrains the output.
    throw new Error('Translation failed: AI model did not return a structured output.');
  }
  
  // The output is already a parsed JavaScript object (Record<string, string>).
  return output as Record<string, string>;
}
