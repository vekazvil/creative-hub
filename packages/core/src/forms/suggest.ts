import { z } from 'zod';

import type { WorkType } from './types';
import { getWorkType, orderedWorkTypes } from './work-types';

// Keyword-based stand-in for the AI type suggestion when OpenAI is not connected.
const KEYWORDS: Record<string, string[]> = {
  sell: ['sell sheet', 'spec sheet', 'one-pager', 'one pager', 'sellsheet'],
  ads: ['ad ', ' ad.', 'advert', 'billboard', 'ooh', 'magazine', 'print ad', 'paid digital'],
  pack: ['label', 'packaging', 'dieline', 'jar', 'can ', 'pouch', 'sku label'],
  event: [
    'expo',
    'trade show',
    'tradeshow',
    'banner',
    'booth',
    'backdrop',
    'sponsorship',
    'event',
    'tent',
  ],
  deck: ['deck', 'presentation', 'slides', 'powerpoint', 'line review'],
  video: ['video', 'animation', 'film', 'spot', 'cutdown', 'reel video', 'sizzle'],
  social: ['social', 'instagram', 'facebook', 'tiktok', 'post', 'stories', 'giveaway'],
  pos: ['pos', 'pop ', 'shelf', 'endcap', 'display', 'shipper', 'in-store', 'wobbler', 'stopper'],
  ecom: [
    'amazon',
    'a+ content',
    'e-commerce',
    'ecommerce',
    'instacart',
    'product images',
    'listing',
  ],
  photo: ['photo', 'shoot', 'render', 'packshot', '3d'],
  merch: ['t-shirt', 'tshirt', 'shirt', 'tote', 'merch', 'bandana', 'promo item'],
  email: ['email', 'newsletter', 'mailchimp'],
  print: ['flyer', 'coupon', 'calendar', 'brochure', 'postcard'],
  brand: ['brand book', 'guidelines', 'logo', 'brand identity'],
  web: ['website', 'web page', 'landing page', 'portal'],
  campaign: ['campaign', 'launch across', 'several pieces'],
};

export interface TypeSuggestion {
  type: WorkType;
  /** Words from the notes that led to the suggestion. */
  matched: string[];
}

export function suggestWorkType(notes: string): TypeSuggestion | null {
  const text = ` ${notes.toLowerCase()} `;
  let best: TypeSuggestion | null = null;
  for (const [id, words] of Object.entries(KEYWORDS)) {
    const matched = words.filter((w) => text.includes(w)).map((w) => w.trim());
    const type = getWorkType(id);
    if (type && matched.length > (best?.matched.length ?? 0)) best = { type, matched };
  }
  return best;
}

/** What the model returns for "Suggest a type" on the new request page. */
// Field order matters: the decision comes first, then the reason and the question that go with it.
export const typeSuggestionSchema = z.object({
  workType: z
    .string()
    .nullable()
    .describe('Work type id from the catalog that fits best, or null when you cannot tell.'),
  confidence: z
    .enum(['sure', 'likely', 'unclear'])
    .describe(
      'sure: one type clearly fits. likely: this one fits best but another could too. unclear: the notes do not say what gets made; ask one question.',
    ),
  alternatives: z
    .array(z.string())
    .max(2)
    .describe('Up to 2 other work type ids that could fit, for "likely". Empty otherwise.'),
  mode: z
    .enum(['new', 'update'])
    .nullable()
    .describe(
      '"update" when they change something that already exists, "new" for new work, null when not said.',
    ),
  reason: z
    .string()
    .describe(
      'One short sentence, in the language of the notes, on why this type (or why you cannot tell). Quote the words that led you.',
    ),
  question: z
    .string()
    .nullable()
    .describe(
      'For "unclear": one short question that would settle the type, naming the 2–3 likely types in plain words. Null otherwise.',
    ),
});
export type TypeSuggestionResult = z.infer<typeof typeSuggestionSchema>;

export function typeSuggestionInstructions(followUp: boolean): string {
  const catalog = orderedWorkTypes()
    .map((t) => `- ${t.id}: ${t.name} — ${t.examples}`)
    .join('\n');
  const lines = [
    'You help people at Vilore Foods (La Costeña USA) pick the right request form for the creative team. They wrote what they need, often loosely ("I think I need something like a sell sheet, not sure").',
    'Decide which work type fits:',
    '- "sure" when one type clearly fits. Hedging ("I think", "something like", "maybe") does not make it unclear if the deliverable itself is clear.',
    '- "likely" when one fits best but one or two others could too; list those as alternatives.',
    '- "unclear" when the notes do not say what gets made (only a product, a deadline, a goal). Then ask one short question that would settle it, naming the 2–3 most likely types in plain words. Never guess from too little.',
    '- Use "campaign" only for several different pieces around one idea.',
    '- mode is "update" only when they change something that already exists (a new version, a fix, a translation of an existing piece).',
    '- Plain punctuation: no em dashes (—) in reason or question; use a comma, a colon or a new sentence.',
    '- Write reason and question in the language the notes are written in: English when they are in English, even if they mention Spanish product or brand names (salsa verde, La Costeña), Spanish only when the notes themselves are in Spanish.',
  ];
  if (followUp) {
    lines.push(
      '- They have now answered your question. Decide: "sure" or "likely". Do not ask again.',
    );
  }
  lines.push('', 'Work types:', catalog);
  return lines.join('\n');
}

/** Keeps only real work type ids. Without a type the result is "unclear"; with one it never is. */
export function normalizeTypeSuggestion(raw: TypeSuggestionResult): TypeSuggestionResult {
  const workType = raw.workType && getWorkType(raw.workType) ? raw.workType : null;
  const alternatives = [...new Set(raw.alternatives)]
    .filter((id) => id !== workType && getWorkType(id))
    .slice(0, 2);
  if (!workType) return { ...raw, workType: null, confidence: 'unclear', alternatives };
  const confidence = raw.confidence === 'unclear' ? 'likely' : raw.confidence;
  return { ...raw, workType, confidence, alternatives, question: null };
}

const UPDATE_WORDS =
  /\b(update|revise|revision|new version|change the|fix the|translate the|existing)\b/i;

/** Without AI: a keyword match is "likely", otherwise "unclear" with no question to ask. */
export function fallbackTypeSuggestion(notes: string): TypeSuggestionResult {
  const s = suggestWorkType(notes);
  if (!s) {
    return {
      workType: null,
      confidence: 'unclear',
      alternatives: [],
      mode: null,
      reason: 'We couldn’t tell the type from your notes.',
      question: null,
    };
  }
  return {
    workType: s.type.id,
    confidence: 'likely',
    alternatives: [],
    mode: UPDATE_WORDS.test(notes) ? 'update' : null,
    reason: `Your notes mention ${s.matched.map((m) => `“${m}”`).join(', ')}.`,
    question: null,
  };
}
