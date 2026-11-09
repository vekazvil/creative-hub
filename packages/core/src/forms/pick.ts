import { z } from 'zod';

import { suggestWorkType } from './suggest';
import { orderedWorkTypes } from './work-types';

/**
 * "Not sure where to start?" on the home page: where a free description should take the
 * requester — straight to a form, to the list of request types, to their requests, or to the chat.
 */
export const startRouteSchema = z.object({
  destination: z
    .enum(['form', 'pick_type', 'my_requests', 'chat'])
    .describe(
      'form: they clearly say what kind of work they need. pick_type: they want to see the request types and choose themselves. my_requests: they ask about requests they already made (status, drafts, where something is). chat: anything vague, unsure or asking for help.',
    ),
  workType: z
    .string()
    .nullable()
    .describe('Work type id from the catalog when destination is "form", otherwise null.'),
  mode: z.enum(['new', 'update']).describe('"update" only when changing something that exists.'),
});
export type StartRoute = z.infer<typeof startRouteSchema>;

export function startRouteInstructions(): string {
  const catalog = orderedWorkTypes()
    .map((t) => `- ${t.id}: ${t.name} — ${t.examples}`)
    .join('\n');
  return [
    'You are the front door of Creative Hub, where people at Vilore Foods (La Costeña USA) ask the creative team for work.',
    'Read what the person wrote and decide where to take them:',
    '- "form" when it is clear what kind of work they need; pick the one work type that fits best.',
    '- "pick_type" when they want to browse the request types or choose the form themselves (e.g. "show me all request types", "I want to pick the form myself").',
    '- "my_requests" when they ask about something they already requested: its status, a draft, a deadline, where it is.',
    '- "chat" when they are unsure, vague, or ask for help choosing. Never guess a work type from too little.',
    'Use "campaign" only for several different pieces around one idea.',
    '',
    'Work types:',
    catalog,
  ].join('\n');
}

const PICK_MYSELF =
  /\b(all (the )?(request |work )?types|list of (forms|types)|pick (it|the (form|type)) myself|choose (it|the (form|type)) myself|show me the (forms|types))\b/i;

const ABOUT_MY_REQUESTS =
  /\b(my requests?|status|where is|where's|what happened|draft|did .* (go|get) (through|sent)|sent last)\b/i;

/** Without AI: a few phrases for the type list and "my requests", keywords for the work type, otherwise the chat. */
export function fallbackStartRoute(text: string): StartRoute {
  if (PICK_MYSELF.test(text)) return { destination: 'pick_type', workType: null, mode: 'new' };
  if (ABOUT_MY_REQUESTS.test(text))
    return { destination: 'my_requests', workType: null, mode: 'new' };
  const s = suggestWorkType(text);
  return s
    ? { destination: 'form', workType: s.type.id, mode: 'new' }
    : { destination: 'chat', workType: null, mode: 'new' };
}
