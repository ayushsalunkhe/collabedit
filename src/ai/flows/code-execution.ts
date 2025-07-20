// src/ai/flows/code-execution.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for simulating code execution.
 *
 * - `executeCode` -  A function that takes code and language, and returns the predicted output.
 * - `CodeExecutionInput` - The input type for the `executeCode` function.
 * - `CodeExecutionOutput` - The output type for the `executeCode` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeExecutionInputSchema = z.object({
  code: z.string().describe('The code to be executed.'),
  language: z.string().describe('The programming language of the code (e.g., javascript, python, cpp).'),
});
export type CodeExecutionInput = z.infer<typeof CodeExecutionInputSchema>;

const CodeExecutionOutputSchema = z.object({
  output: z.string().describe('The predicted output of the code execution.'),
});
export type CodeExecutionOutput = z.infer<typeof CodeExecutionOutputSchema>;

export async function executeCode(input: CodeExecutionInput): Promise<CodeExecutionOutput> {
  return codeExecutionFlow(input);
}

const codeExecutionPrompt = ai.definePrompt({
  name: 'codeExecutionPrompt',
  input: {schema: CodeExecutionInputSchema},
  output: {schema: CodeExecutionOutputSchema},
  prompt: `You are an AI code execution simulator.
  Given the following code in {{language}}, predict what its output would be if it were executed.
  Provide only the predicted output, without any explanation or extra text.

  Code:
  \`\`\`{{language}}
  {{code}}
  \`\`\`
  `,
});

const codeExecutionFlow = ai.defineFlow(
  {
    name: 'codeExecutionFlow',
    inputSchema: CodeExecutionInputSchema,
    outputSchema: CodeExecutionOutputSchema,
  },
  async input => {
    const {output} = await codeExecutionPrompt(input);
    return output!;
  }
);
