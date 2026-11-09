import type { z } from 'zod';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredRequest<T> {
  /** Name of the output format, e.g. "intake_turn". */
  name: string;
  instructions: string;
  messages: AiMessage[];
  schema: z.ZodType<T>;
}

/**
 * Structured AI calls: the model must answer in the given JSON schema.
 * Real version: OpenAI Responses API. Fake: a function you pass in.
 */
export interface AiClient {
  readonly isFake: boolean;
  structured<T>(req: StructuredRequest<T>): Promise<{ data: T; usage: AiUsage }>;
}
