'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TranslationInputSchema = z.record(z.any());
const TranslationOutputSchema = z.record(z.any());

const translatePrompt = ai.definePrompt(
  {
    name: 'translateRuleBookPrompt',
    model: 'googleai/gemini-1.5-pro-latest',
    input: {schema: TranslationInputSchema},
    output: {schema: TranslationOutputSchema},
    system:
      'You are an expert translator specializing in technical and legal German for the Austrian building and construction industry. Translate the provided German JSON object into English. Preserve the JSON structure and keys exactly. Translate the string values associated with those keys into clear, accurate, and natural-sounding English suitable for a professional in the field.',
    prompt: `Translate the following JSON object from German to English: {{{json .}}}`,
  },
);

export const translateRuleBookFlow = ai.defineFlow(
  {
    name: 'translateRuleBookFlow',
    inputSchema: TranslationInputSchema,
    outputSchema: TranslationOutputSchema,
  },
  async (input) => {
    const {output} = await translatePrompt(input);
    return output ?? {};
  },
);
