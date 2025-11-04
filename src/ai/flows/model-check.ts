'use server';
import { ai } from '../genkit';

export async function checkAvailableModels() {
  try {
    // This might not work directly, but let's try a simple test
    const testResponse = await ai.generate({
      model: 'googleai/gemini-1.0-flash', // Most stable model
      prompt: 'Hello',
      config: { temperature: 0.1 }
    });
    
    console.log('Test successful with gemini-1.0-flash');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}
