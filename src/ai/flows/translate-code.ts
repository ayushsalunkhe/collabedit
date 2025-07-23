'use server';
/**
 * @fileOverview A Genkit flow for translating code from one language to another.
 *
 * - `translateCode` - A function that takes code and language information and returns translated code.
 * - `TranslateCodeInput` - The input type for the `translateCode` function.
 * - `TranslateCodeOutput` - The output type for the `translateCode` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateCodeInputSchema = z.object({
  sourceCode: z.string().describe('The code to be translated.'),
  sourceLanguage: z.enum(['javascript', 'python', 'cpp']).describe('The source programming language.'),
  targetLanguage: z.enum(['javascript', 'python', 'cpp']).describe('The target programming language.'),
});
export type TranslateCodeInput = z.infer<typeof TranslateCodeInputSchema>;

const TranslateCodeOutputSchema = z.object({
  translatedCode: z.string().describe('The resulting translated code.'),
});
export type TranslateCodeOutput = z.infer<typeof TranslateCodeOutputSchema>;

export async function translateCode(input: TranslateCodeInput): Promise<TranslateCodeOutput> {
  return translateCodeFlow(input);
}

const translateCodePrompt = ai.definePrompt({
  name: 'translateCodePrompt',
  input: {schema: TranslateCodeInputSchema},
  output: {schema: TranslateCodeOutputSchema},
  prompt: `You are an expert code translator.
Your task is to translate the provided code snippet from the source language to the target language.
Ensure the translated code is syntactically correct, maintains the original logic, and is well-formatted.

Source Language: {{{sourceLanguage}}}
Target Language: {{{targetLanguage}}}

Source Code:
\`\`\`{{{sourceLanguage}}}
{{{sourceCode}}}
\`\`\`

Provide only the translated code block, without any additional explanations or markdown formatting.`,
});

const translateCodeFlow = ai.defineFlow(
  {
    name: 'translateCodeFlow',
    inputSchema: TranslateCodeInputSchema,
    outputSchema: TranslateCodeOutputSchema,
  },
  async input => {
    const {output} = await translateCodePrompt(input);
    return output!;
  }
);
