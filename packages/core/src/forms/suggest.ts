import { getWorkType } from './work-types';
import type { WorkType } from './types';

// Keyword-based stand-in for the AI type suggestion until OpenAI is connected.
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
