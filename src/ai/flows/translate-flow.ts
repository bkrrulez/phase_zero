'use server';
/**
 * @fileOverview A rule book translation AI flow.
 *
 * - translateText - A function that handles the rule book translation process.
 * - TranslationInputSchema - The input type for the translateText function.
 * - TranslationOutputSchema - The return type for the translateText function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Wrap the dynamic record in an object with an explicit property
const TranslationInputSchema = z.object({
  content: z.record(z.string())
});

const TranslationOutputSchema = z.object({
  content: z.record(z.string())
});

const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  input: { schema: TranslationInputSchema },
  output: { schema: TranslationOutputSchema },
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `
Translate the following JSON object from German to English.

Rules:
1. Translate all string values from German to English
2. Keep all keys exactly the same
3. Do not translate proper nouns, technical terms, or variable names
4. Return ONLY valid JSON with the same structure
5. Maintain all special characters and formatting

Original JSON:
{{{json input.content}}}

Return the translated JSON wrapped in a "content" property:
`,
  config: {
    temperature: 0.1,
  },
});

export async function translateText(
  germanText: Record<string, string>
): Promise<Record<string, string>> {
  const { output } = await translateToEnglishPrompt({ 
    input: { content: germanText } 
  });

  if (!output || !output.content) {
    throw new Error('Translation failed: AI model did not return any output.');
  }
  
  return output.content;
}
