// KAN-33: status steps shown in the map popup for issues (Reported -> Acknowledged -> Resolved).
// Uses the same step list as the issue progress ring on the cards, so both always agree.
import { ISSUE_STEPS } from '../cards/cardData';

export interface PopupStep {
  label: string;
  state: 'done' | 'current' | 'todo';
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function issueSteps(status: string | undefined): PopupStep[] {
  const at = ISSUE_STEPS.indexOf((status ?? '') as (typeof ISSUE_STEPS)[number]);
  return ISSUE_STEPS.map((s, i) => ({
    label: cap(s),
    state: at < 0 ? 'todo' : i < at ? 'done' : i === at ? 'current' : 'todo',
  }));
}

/** Spoken summary, e.g. "Status: step 2 of 3, Acknowledged". */
export function issueStepsLabel(status: string | undefined): string {
  if (status === 'declined') return 'Status: Declined';
  if (status === 'withdrawn') return 'Status: Withdrawn';
  const steps = issueSteps(status);
  const i = steps.findIndex((s) => s.state === 'current');
  return i < 0 ? 'Status unknown' : `Status: step ${i + 1} of ${steps.length}, ${steps[i].label}`;
}
