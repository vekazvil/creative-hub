import 'server-only';

import { FakeAiClient, OpenAiClient, type AiClient, type AiUsage } from '@creative-hub/connectors';
import { intakeTurnSchema, suggestWorkType, type IntakeTurn } from '@creative-hub/core';
import { schema } from '@creative-hub/db';

import { getDb } from './db';
import { env } from './env';

let client: AiClient | undefined;

/** OpenAI when OPENAI_API_KEY is set, otherwise a simple offline stand-in. */
export function getAiClient(): AiClient {
  if (client) return client;
  const { OPENAI_API_KEY, OPENAI_MODEL } = env();
  client = OPENAI_API_KEY
    ? new OpenAiClient({ apiKey: OPENAI_API_KEY, model: OPENAI_MODEL })
    : new FakeAiClient((req) => fakeIntakeTurn(req.messages.at(-1)?.content ?? ''));
  return client;
}

function fakeIntakeTurn(lastMessage: string): IntakeTurn {
  const s = suggestWorkType(lastMessage);
  return intakeTurnSchema.parse({
    reply: s
      ? `Sounds like ${s.type.name.toLowerCase()}. (Demo mode: AI isn’t connected, so I can’t fill in answers yet.) You can open the form now and fill it in.`
      : '(Demo mode: AI isn’t connected.) Tell me what you need: a sell sheet, an ad, a banner, a video…',
    workType: s?.type.id ?? null,
    mode: null,
    answers: [],
    stillMissing: [],
    ready: false,
  });
}

/** Logs every AI call in the event log (tokens; cost once prices are configured). */
export async function logAiCall(
  usage: AiUsage,
  actorEmail: string,
  purpose: string,
  requestId?: string,
) {
  await getDb()
    .insert(schema.events)
    .values({
      type: 'ai.call',
      actorEmail,
      requestId: requestId ?? null,
      data: {
        purpose,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
}
