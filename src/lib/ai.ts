
'use server';
/**
 * @fileoverview This file contains the AI logic for the application.
 * It is not used and can be removed.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StoryInput = z.object({
  topic: z.string(),
});

const StoryOutput = z.object({
  story: z.string(),
});

export const storyFlow = ai.defineFlow(
  {
    name: 'storyFlow',
    inputSchema: StoryInput,
    outputSchema: StoryOutput,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro', 
      prompt: `Write a short story about ${input.topic}`,
      output: {
        schema: StoryOutput,
      },
    });

    return llmResponse.output!;
  }
);
