
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslationInputSchema = z.object({}).catchall(z.any());
const TranslationOutputSchema = z.object({}).catchall(z.any());

export async function translateText(
  germanText: z.infer<typeof TranslationInputSchema>
): Promise<z.infer<typeof TranslationOutputSchema>> {
  const prompt = ai.definePrompt(
    {
      name: 'translateToEnglishPrompt',
      input: { schema: TranslationInputSchema },
      output: { schema: TranslationOutputSchema },
      model: 'googleai/gemini-1.5-flash-latest',
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
    },
    async (input) => {
      const { output } = await ai.generate({
        prompt: input.prompt,
        model: input.model,
        config: input.config,
        output: { schema: input.output?.schema },
      });
      return output;
    }
  );

  const result = await prompt(germanText);
  return result;
}
