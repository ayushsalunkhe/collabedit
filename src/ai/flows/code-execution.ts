'use server';
/**
 * @fileOverview A Genkit flow for executing code and returning the output.
 *
 * - `executeCode` -  A function that takes code and language and returns the output.
 * - `CodeExecutionInput` - The input type for the `executeCode` function.
 * - `CodeExecutionOutput` - The output type for the `executeCode` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeExecutionInputSchema = z.object({
  code: z.string().describe('The code to execute.'),
  language: z.enum(['javascript', 'python', 'cpp']).describe('The programming language of the code.'),
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
  prompt: `You are an expert code execution engine.
Your task is to analyze the provided code snippet in the specified language and predict its output.

- Analyze the code step by step.
- Determine what the code will print to the standard output.
- If the code has errors (e.g., syntax errors, runtime errors), provide a descriptive error message as the output.
- If the code executes without printing anything, state that there is no output.
- Only return the final output, without any explanation or extra text.

Language: {{{language}}}
Code:
\`\`\`{{{language}}}
{{{code}}}
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
