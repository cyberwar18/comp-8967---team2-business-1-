import { describe, expect, it } from 'vitest';
import { issueSteps, issueStepsLabel } from './popupSteps';

describe('issue status steps in the popup', () => {
  it('marks earlier steps done, the current one, and later ones to do', () => {
    expect(issueSteps('acknowledged').map((s) => s.state)).toEqual(['done', 'current', 'todo']);
    expect(issueSteps('reported').map((s) => s.state)).toEqual(['current', 'todo', 'todo']);
    expect(issueSteps('resolved').map((s) => s.state)).toEqual(['done', 'done', 'current']);
  });
  it('shows every step as to do when the status is unknown', () => {
    expect(issueSteps('???').every((s) => s.state === 'todo')).toBe(true);
    expect(issueStepsLabel(undefined)).toBe('Status unknown');
  });
  it('writes the step in words', () => {
    expect(issueStepsLabel('acknowledged')).toBe('Status: step 2 of 3, Acknowledged');
  });
});
