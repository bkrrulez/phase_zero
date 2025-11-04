
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslationInputSchema = z.record(z.string(), z.any());
const TranslationOutputSchema = z.record(z.string(), z.any());

const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  input: { schema: TranslationInputSchema },
  output: { schema: TranslationOutputSchema },
  model: ai.model('googleai/gemini-1.5-flash-latest'),
  prompt: `Translate the following JSON object from German to English.

You must follow these rules:
1.  Translate all values of all keys in the JSON object.
2.  The translated JSON object must have the exact same structure and keys as the original.
3.  The response must be only the translated JSON object, with no other text, comments, or explanations.
4.  Do not translate proper nouns, technical terms, or anything that looks like a variable or placeholder.

Original German JSON:
{{{json .}}}
`,
  config: {
    temperature: 0.1,
  },
});

export async function translateText(
  germanText: z.infer<typeof TranslationInputSchema>
): Promise<z.infer<typeof TranslationOutputSchema>> {
  const { output } = await translateToEnglishPrompt({ input: germanText });
  if (!output) {
      throw new Error('Translation failed: AI model did not return any output.');
  }

  // The output from the model might be a string that needs parsing,
  // or it could already be a JSON object if the framework handles it.
  let result;
  try {
    result = typeof output === 'string' ? JSON.parse(output) : output;
  } catch (e) {
    console.error('Invalid JSON received from translation AI:', output);
    throw new Error('Translation output was not valid JSON.');
  }
  return result;
}
