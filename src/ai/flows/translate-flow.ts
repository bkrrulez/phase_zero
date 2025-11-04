'use server';
import { z } from 'zod';
import { ai } from '../genkit';

const TranslationInputSchema = z.object({
  jsonString: z.string()
});

const TranslationOutputSchema = z.record(z.string(), z.string());

const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  input: { schema: TranslationInputSchema },
  model: 'googleai/gemini-1.5-flash', // Use 1.5 for better compatibility
  output: { schema: TranslationOutputSchema },
  
  prompt: `
Translate the following JSON object from German to English.

RULES:
- Translate only the string values from German to English
- Keep all JSON keys exactly the same
- Do not translate proper nouns, technical terms, or variable names
- Maintain all special characters and formatting
- Return ONLY the translated JSON object with identical structure

Original JSON:
{{{jsonString}}}

Translated JSON:
`,
  config: {
    temperature: 0.1,
    // Remove responseMimeType for compatibility
  },
});

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
