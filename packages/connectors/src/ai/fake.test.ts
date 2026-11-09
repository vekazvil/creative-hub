import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { FakeAiClient } from './fake';

describe('FakeAiClient', () => {
  it('returns the responder output, validated against the schema', async () => {
    const ai = new FakeAiClient(() => ({ reply: 'Hi' }));
    const { data } = await ai.structured({
      name: 't',
      instructions: '',
      messages: [{ role: 'user', content: 'hello' }],
      schema: z.object({ reply: z.string() }),
    });
    expect(data.reply).toBe('Hi');
    expect(ai.calls).toHaveLength(1);
  });
  it('rejects output that does not match the schema', async () => {
    const ai = new FakeAiClient(() => ({ nope: 1 }));
    await expect(
      ai.structured({
        name: 't',
        instructions: '',
        messages: [],
        schema: z.object({ reply: z.string() }),
      }),
    ).rejects.toThrow();
  });
});
