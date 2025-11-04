'use server';
import { ai } from '../genkit';

const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  model: 'googleai/gemini-1.5-flash',
  prompt: `
You are a JSON translation assistant. Translate the following JSON object from German to English.

CRITICAL RULES:
1. Translate ONLY the string values from German to English
2. Keep ALL keys exactly the same (do not translate keys)
3. Do not translate proper nouns, brand names, technical terms
4. Maintain all JSON structure, formatting, and special characters
5. Return ONLY the translated JSON object - no additional text, no explanations, no markdown

EXAMPLE:
Input: {"title": "Willkommen", "message": "Guten Tag"}
Output: {"title": "Welcome", "message": "Good day"}

Now translate this JSON:

{{{jsonString}}}
`,
  config: {
    temperature: 0.1,
  },
});

export async function translateText(
  germanText: Record<string, string>
): Promise<Record<string, string>> {
  const jsonString = JSON.stringify(germanText, null, 2);
  
  const { text } = await translateToEnglishPrompt({ 
    jsonString
  });

  if (!text) {
    throw new Error('Translation failed: No response from AI model.');
  }

  // Clean the response - remove any markdown code blocks
  const cleanText = text.replace(/```json\s*|\s*```/g, '').trim();

  try {
    const translated = JSON.parse(cleanText);
    return translated;
  } catch (error) {
    console.error('Failed to parse JSON:', cleanText);
    throw new Error(`Translation failed: Invalid JSON response - ${error}`);
  }
}
