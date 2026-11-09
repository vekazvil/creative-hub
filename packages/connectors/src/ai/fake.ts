import type { AiClient, StructuredRequest } from './types';

export type FakeResponder = (req: StructuredRequest<unknown>) => unknown;

/** Answers with whatever the responder returns. For tests and for running without a key. */
export class FakeAiClient implements AiClient {
  readonly isFake = true;
  readonly calls: StructuredRequest<unknown>[] = [];

  constructor(private readonly responder: FakeResponder) {}

  async structured<T>(req: StructuredRequest<T>) {
    this.calls.push(req as StructuredRequest<unknown>);
    const data = req.schema.parse(this.responder(req as StructuredRequest<unknown>));
    return { data, usage: { model: 'fake', inputTokens: 0, outputTokens: 0 } };
  }
}
