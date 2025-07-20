// src/ai/flows/code-suggestion.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing AI-powered code suggestions.
 *
 * - `getCodeSuggestion` -  A function that takes code context as input and returns a code suggestion.
 * - `CodeSuggestionInput` - The input type for the `getCodeSuggestion` function.
 * - `CodeSuggestionOutput` - The output type for the `getCodeSuggestion` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeSuggestionInputSchema = z.object({
  codeContext: z.string().describe('The current code context in the editor.'),
});
export type CodeSuggestionInput = z.infer<typeof CodeSuggestionInputSchema>;

const CodeSuggestionOutputSchema = z.object({
  suggestion: z.string().describe('The AI-powered code suggestion.'),
});
export type CodeSuggestionOutput = z.infer<typeof CodeSuggestionOutputSchema>;

export async function getCodeSuggestion(input: CodeSuggestionInput): Promise<CodeSuggestionOutput> {
  return codeSuggestionFlow(input);
}

const codeSuggestionPrompt = ai.definePrompt({
  name: 'codeSuggestionPrompt',
  input: {schema: CodeSuggestionInputSchema},
  output: {schema: CodeSuggestionOutputSchema},
  prompt: `You are an AI code assistant that provides code suggestions based on the given context.

  Provide a concise and relevant code suggestion that can seamlessly fit into the existing code.

  Current Code Context:
  {{codeContext}}
  `,
});

const codeSuggestionFlow = ai.defineFlow(
  {
    name: 'codeSuggestionFlow',
    inputSchema: CodeSuggestionInputSchema,
    outputSchema: CodeSuggestionOutputSchema,
  },
  async input => {
    const {output} = await codeSuggestionPrompt(input);
    return output!;
  }
);
