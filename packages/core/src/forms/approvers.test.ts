import { describe, expect, it } from 'vitest';

import { matchApprover, searchApprovers, type Approver } from './approvers';
import { applyIntakeTurn, emptyIntakeState } from './intake';

const PEOPLE: Approver[] = [
  { email: 'ana.ruiz@vilore.com', name: 'Ana Ruiz', title: 'Brand manager', active: true },
  { email: 'luis@vilore.com', name: 'Luis Gómez', active: true },
  { email: 'old@vilore.com', name: 'Old Person', active: false },
];

describe('approvers', () => {
  it('matches by email or exact name, active only', () => {
    expect(matchApprover(PEOPLE, 'ANA.RUIZ@vilore.com')?.name).toBe('Ana Ruiz');
    expect(matchApprover(PEOPLE, 'luis gomez')?.email).toBe('luis@vilore.com');
    expect(matchApprover(PEOPLE, 'Old Person')).toBeUndefined();
    expect(matchApprover(PEOPLE, 'Ana')).toBeUndefined();
  });

  it('searches name, title and email, prefix first', () => {
    expect(searchApprovers(PEOPLE, '').map((a) => a.name)).toEqual(['Ana Ruiz', 'Luis Gómez']);
    expect(searchApprovers(PEOPLE, 'brand').map((a) => a.name)).toEqual(['Ana Ruiz']);
    expect(searchApprovers(PEOPLE, 'gom').map((a) => a.name)).toEqual(['Luis Gómez']);
    expect(searchApprovers(PEOPLE, 'old')).toEqual([]);
  });

  it('chat answers for the approver must be someone on the list', () => {
    const state = { ...emptyIntakeState(), workType: 'sell' };
    const turn = (v: string) => ({
      workType: null,
      mode: null,
      answers: [{ fieldId: 'approver', values: [v], source: 'chat' as const, note: null }],
      stillMissing: [],
      reply: '',
      ready: false,
    });
    const ok = applyIntakeTurn(state, turn('Ana Ruiz'), [], PEOPLE);
    expect(ok.state.values.approver).toBe('ana.ruiz@vilore.com');
    const bad = applyIntakeTurn(state, turn('Somebody Else'), [], PEOPLE);
    expect(bad.rejected).toEqual(['approver']);
    expect(bad.state.values.approver).toBeUndefined();
  });
});
