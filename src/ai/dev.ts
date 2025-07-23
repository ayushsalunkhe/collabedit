import { config } from 'dotenv';
config();

import '@/ai/flows/code-suggestion.ts';
import '@/ai/flows/code-execution.ts';
import '@/ai/flows/debug-code.ts';
import '@/ai/flows/translate-code.ts';
