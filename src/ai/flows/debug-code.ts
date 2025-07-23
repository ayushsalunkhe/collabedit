'use server';
/**
 * @fileOverview A Genkit flow for debugging code and providing explanations and suggestions.
 *
 * - `debugCode` - A function that takes code, language, and an error message and returns a debug analysis.
 * - `DebugCodeInput` - The input type for the `debugCode` function.
 * - `DebugCodeOutput` - The output type for the `debugCode` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DebugCodeInputSchema = z.object({
  code: z.string().describe('The code to debug.'),
  language: z.enum(['javascript', 'python', 'cpp']).describe('The programming language of the code.'),
  errorMessage: z.string().describe('The error message produced by the code.'),
});
export type DebugCodeInput = z.infer<typeof DebugCodeInputSchema>;

const DebugCodeOutputSchema = z.object({
  explanation: z.string().describe('An explanation of what the error is and why it occurred.'),
  suggestion: z.string().describe('A suggested code fix to resolve the error.'),
});
export type DebugCodeOutput = z.infer<typeof DebugCodeOutputSchema>;

export async function debugCode(input: DebugCodeInput): Promise<DebugCodeOutput> {
  return debugCodeFlow(input);
}

const debugCodePrompt = ai.definePrompt({
  name: 'debugCodePrompt',
  input: {schema: DebugCodeInputSchema},
  output: {schema: DebugCodeOutputSchema},
  prompt: `You are an expert programmer and debugger.
Your task is to analyze the provided code snippet, the language it's written in, and the resulting error message.
Provide a clear explanation of the error and a code snippet that fixes the issue.

Language: {{{language}}}

Error Message:
\`\`\`
{{{errorMessage}}}
\`\`\`

Code:
\`\`\`{{{language}}}
{{{code}}}
\`\`\`

Analyze the error and provide a helpful explanation and a suggested fix.`,
});

const debugCodeFlow = ai.defineFlow(
  {
    name: 'debugCodeFlow',
    inputSchema: DebugCodeInputSchema,
    outputSchema: DebugCodeOutputSchema,
  },
  async input => {
    const {output} = await debugCodePrompt(input);
    return output!;
  }
);
