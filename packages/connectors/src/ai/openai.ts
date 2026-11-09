import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import type { AiClient, StructuredRequest } from './types';

export interface OpenAiClientOptions {
  apiKey: string;
  model: string;
  /** Request timeout in ms. */
  timeout?: number;
}

export class OpenAiClient implements AiClient {
  readonly isFake = false;
  private readonly client: OpenAI;

  constructor(private readonly options: OpenAiClientOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: options.timeout ?? 60_000,
      maxRetries: 2,
    });
  }

  async structured<T>(req: StructuredRequest<T>) {
    const res = await this.client.responses.parse({
      model: this.options.model,
      instructions: req.instructions,
      input: req.messages.map((m) => ({ role: m.role, content: m.content })),
      text: { format: zodTextFormat(req.schema as never, req.name) },
      store: false,
    });
    if (res.output_parsed == null) {
      throw new Error(`AI returned no parsable output (status: ${res.status})`);
    }
    return {
      data: res.output_parsed as T,
      usage: {
        model: res.model,
        inputTokens: res.usage?.input_tokens ?? 0,
        outputTokens: res.usage?.output_tokens ?? 0,
      },
    };
  }
}
