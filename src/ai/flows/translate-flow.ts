'use server';
/**
 * @fileOverview A rule book translation AI flow.
 *
 * - translateText - A function that handles the rule book translation process.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslationInputSchema = z.object({
  jsonString: z.string()
});

const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  input: { schema: TranslationInputSchema },
  model: 'googleai/gemini-2.5-flash-preview',
  prompt: `
Translate the following JSON object from German to English.

Rules:
1. Translate all string values from German to English
2. Keep all keys exactly the same
3. Do not translate proper nouns, technical terms, or variable names
4. Return ONLY valid JSON with the same structure - no markdown, no explanations
5. Maintain all special characters and formatting

Original JSON:
{{{jsonString}}}

Return ONLY the translated JSON:
`,
  config: {
    temperature: 0.1,
  },
});

export async function translateText(
  germanText: Record<string, string>
): Promise<Record<string, string>> {
  // Convert to JSON string for input
  const jsonString = JSON.stringify(germanText, null, 2);
  
  const { text } = await translateToEnglishPrompt({ 
    jsonString
  });

  if (!text) {
    throw new Error('Translation failed: AI model did not return any output.');
  }
  
  // Clean up the response (remove markdown code blocks if present)
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/```\n?/g, '');
  }
  
  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('Failed to parse translation response:', cleanedText);
    throw new Error('Translation returned invalid JSON');
  }
}
