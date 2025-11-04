'use server';
import { ai } from '../genkit';

const MODEL_NAMES = [
  'googleai/gemini-1.5-flash-001',
  'googleai/gemini-1.5-flash-latest',
  'googleai/gemini-1.0-flash',
  'googleai/gemini-1.5-pro-001',
  'googleai/gemini-1.5-pro-latest'
];

export async function translateText(
  germanText: Record<string, string>
): Promise<Record<string, string>> {
  const jsonString = JSON.stringify(germanText, null, 2);
  
  let lastError: Error | null = null;
  
  for (const modelName of MODEL_NAMES) {
    try {
      console.log(`Trying model: ${modelName}`);
      
      const response = await ai.generate({
        model: modelName,
        prompt: `
Translate this JSON from German to English. Return ONLY valid JSON.

RULES:
- Translate only string values from German to English
- Keep all JSON keys exactly the same
- Do not translate proper nouns or technical terms
- Return ONLY the JSON object, no other text

JSON to translate:
${jsonString}
`,
        config: {
          temperature: 0.1,
        },
      });

      if (!response.text) {
        throw new Error('No response text');
      }

      // Clean and parse the response
      const cleanText = response.text.replace(/```json\s*|\s*```/g, '').trim();
      const translated = JSON.parse(cleanText);
      
      console.log(`Success with model: ${modelName}`);
      return translated;
      
    } catch (error) {
      lastError = error as Error;
      console.log(`Model ${modelName} failed:`, error);
      // Continue to next model
    }
  }
  
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
