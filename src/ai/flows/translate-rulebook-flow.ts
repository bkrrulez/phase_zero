
'use server';
/**
 * @fileOverview A flow for translating rule book entries from German to English.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RuleBookEntrySchema = z.record(z.any()).describe("A JSON object representing a row from a rule book. The keys and values are in German.");
const TranslatedRuleBookEntrySchema = z.record(z.any()).describe("A JSON object where all keys and string values from the input have been translated to English.");

export async function translateRuleBookEntry(entry: Record<string, any>): Promise<Record<string, any>> {
    return translateFlow(entry);
}

const translatePrompt = ai.definePrompt({
    name: 'translateRuleBookPrompt',
    input: { schema: RuleBookEntrySchema },
    output: { schema: TranslatedRuleBookEntrySchema },
    model: 'googleai/gemini-pro',
    prompt: `Translate the following JSON object from German to English.
    
    Translate all keys and all string values to English.
    Preserve the original data types. Numbers and boolean values should not be changed.
    Return only the translated JSON object.
    
    Input:
    {{{json .}}}
    
    Output:
    `,
});

const translateFlow = ai.defineFlow(
    {
        name: 'translateRuleBookFlow',
        inputSchema: RuleBookEntrySchema,
        outputSchema: TranslatedRuleBookEntrySchema,
    },
    async (input) => {
        const { output } = await translatePrompt(input);
        return output || {};
    }
);
