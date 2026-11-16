import { getWorkType } from '@creative-hub/core';
import { describe, expect, it } from 'vitest';

import { brandLabel, COL, mondayProjectPlan } from './monday-project';

const lc = { code: '01', short: 'LC', name: 'La Costeña' };
const project = { number: '01.07', name: 'Pizza Expo booth' };

describe('mondayProjectPlan', () => {
  it('maps the brief onto Master Board columns with the four process subitems', () => {
    const plan = mondayProjectPlan({
      type: getWorkType('event')!,
      data: {
        values: {
          priority: 'Urgent',
          first_draft: '2026-12-01',
          final_files: '2026-12-08',
          approver: 'florence@vilore.com',
        },
      },
      project,
      brand: lc,
      briefUrl: 'https://hub.example/requests/1',
    });
    expect(plan.name).toBe('01.07 – LC – Pizza Expo booth');
    expect(plan.group).toBe('📥 Brief & Planning');
    expect(plan.values[COL.priority]).toEqual({ label: 'High' });
    expect(plan.values[COL.draftDue]).toEqual({ date: '2026-12-01' });
    expect(plan.values[COL.finalDeadline]).toEqual({ date: '2026-12-08' });
    expect(plan.values[COL.brand]).toEqual({ labels: ['La Costeña'] });
    expect(plan.values[COL.category]).toEqual({ labels: ['Tradeshow / Event Materials'] });
    expect(plan.values[COL.drive]).toBeUndefined();
    expect(plan.approverEmail).toBe('florence@vilore.com');
    expect(plan.subitems).toEqual([
      'Pizza Expo booth – Copy',
      'Pizza Expo booth – Design',
      'Pizza Expo booth – Review',
      'Pizza Expo booth – Deployment',
    ]);
  });

  it('leaves out missing dates and repeats the steps per campaign piece', () => {
    const plan = mondayProjectPlan({
      type: getWorkType('campaign')!,
      data: {
        values: {},
        pieces: [
          { type: 'social', values: {} },
          { type: 'social', values: {} },
        ],
      },
      project,
      brand: lc,
      briefUrl: 'https://hub.example/requests/1',
    });
    expect(plan.values[COL.draftDue]).toBeUndefined();
    expect(plan.values[COL.priority]).toEqual({ label: 'Normal' });
    expect(plan.subitems).toHaveLength(8);
    expect(plan.subitems[4]).toMatch(/ 2 – Copy$/);
  });
});

describe('brandLabel', () => {
  it('matches their labels and falls back to Otro', () => {
    expect(brandLabel({ code: '15', name: 'Tía Lupita' })).toBe('Tia Lupita');
    expect(brandLabel({ code: '00', name: 'Several brands' })).toBe('Multi-Brand');
    expect(brandLabel({ code: '18', name: 'Chocomilk' })).toBe('Otro');
  });
});
