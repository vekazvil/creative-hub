import { describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from './fake';

describe('InMemoryEmailSender', () => {
  it('records sent messages with an id', async () => {
    const sender = new InMemoryEmailSender();
    const { id } = await sender.send({ to: 'a@b.c', subject: 'Hi', text: 'Hello' });
    expect(id).toBeTruthy();
    expect(sender.sent).toHaveLength(1);
    expect(sender.last()).toMatchObject({ to: 'a@b.c', subject: 'Hi', id });
  });
});
