import { F, getWorkType, type RequestFormData, type WorkType } from '@creative-hub/core';

/*
 * How a submitted request looks on the Creative Projects Master Board (option A): one item in
 * "📥 Brief & Planning", their columns filled from the brief, and the process steps
 * Copy → Design → Review → Deployment as subitems, the way the team already works.
 * Columns are found by title, so the same code works on the sandbox copy and the real board.
 */

export const MONDAY_GROUP = '📥 Brief & Planning';
export const PROCESS_STEPS = ['Copy', 'Design', 'Review', 'Deployment'] as const;

/** Column titles on the Master Board. */
export const COL = {
  status: '🚦 Status',
  priority: '⚡ Priority',
  brief: '📋 Brief Document',
  draftDue: '✏️ Draft Due Date',
  finalDeadline: '🏁 Final Deadline',
  approver: '🪙 Approver',
  category: '📂 Category / Task Type',
  brand: '🏷️ Brand',
  drive: '📁 Drive Working Files',
} as const;

/** Our priorities on their Priority labels. */
const PRIORITY: Record<string, string> = {
  Normal: 'Normal',
  Urgent: 'High',
  Bomberazo: 'Critical ⚠️',
};

/** Our work types on existing Category / Task Type labels, so no new labels are made. */
const CATEGORY: Record<string, string> = {
  sell: 'Sell Sheet',
  ads: 'Digital Ads',
  pack: 'Packaging Design',
  event: 'Tradeshow / Event Materials',
  deck: 'Presentation/Deck',
  video: 'Video/Motion',
  social: 'Social Media Content',
  pos: 'POP Material',
  ecom: 'E-commerce',
  photo: 'Product Photography',
  merch: 'Design / Merchandising',
  email: 'Email Campaign',
  print: 'Print Design',
  brand: 'Brand Identity / Design',
  web: 'Web / Digital Development',
  campaign: 'Campaign',
  custom: 'General Creative Request',
};

/** Their Brand labels. Anything else is "Otro". */
const BRAND_LABELS = ['La Costeña', 'Jumex', 'Totis', 'Kerns', 'Vilore Foods', 'Tia Lupita'];
const plain = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

export function brandLabel(brand: { code: string; name: string }): string {
  if (brand.code === '00') return 'Multi-Brand';
  return BRAND_LABELS.find((l) => plain(l) === plain(brand.name)) ?? 'Otro';
}

const iso = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export interface MondayProjectPlan {
  name: string;
  group: string;
  /** Values by column title, in Monday's column_values format. */
  values: Record<string, unknown>;
  approverEmail: string | null;
  subitems: string[];
}

export function mondayProjectPlan(opts: {
  type: WorkType;
  data: RequestFormData;
  project: { number: string; name: string };
  brand: { code: string; short: string | null; name: string };
  briefUrl: string;
  driveUrl?: string;
}): MondayProjectPlan {
  const { type, data, project, brand, briefUrl, driveUrl } = opts;
  const v = data.values;
  const values: Record<string, unknown> = {
    [COL.status]: { label: 'Planning' },
    [COL.priority]: { label: PRIORITY[String(v[F.priority])] ?? 'Normal' },
    [COL.brief]: { url: briefUrl, text: `${project.number} brief` },
    [COL.brand]: { labels: [brandLabel(brand)] },
  };
  const category = CATEGORY[type.id];
  if (category) values[COL.category] = { labels: [category] };
  const draftDue = iso(v[F.firstDraft]);
  if (draftDue) values[COL.draftDue] = { date: draftDue };
  const finalDeadline = iso(v[F.finalFiles]);
  if (finalDeadline) values[COL.finalDeadline] = { date: finalDeadline };
  if (driveUrl) values[COL.drive] = { url: driveUrl, text: `${project.number} folder` };

  return {
    name: `${project.number} – ${brand.short ?? brand.name} – ${project.name}`,
    group: MONDAY_GROUP,
    values,
    approverEmail:
      typeof v[F.approver] === 'string' && v[F.approver] ? String(v[F.approver]) : null,
    subitems: processSubitems(type, data, project.name),
  };
}

/** Copy → Design → Review → Deployment, once per piece for a campaign. None for website work. */
function processSubitems(type: WorkType, data: RequestFormData, title: string): string[] {
  if (type.process) return [];
  if (type.id !== 'campaign') return PROCESS_STEPS.map((s) => `${title} – ${s}`);
  const seen = new Map<string, number>();
  return (data.pieces ?? []).flatMap((piece) => {
    const name = getWorkType(piece.type)?.name ?? piece.type;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    const label = n > 1 ? `${name} ${n}` : name;
    return PROCESS_STEPS.map((s) => `${label} – ${s}`);
  });
}
