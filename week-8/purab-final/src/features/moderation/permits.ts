// KAN-52 (Mounika): event permits and Neighbr staff.
// Nigel (Nov 2): an event in a public space (a park, a street) needs a permit, uploaded and approved by
// Neighbr staff, before it goes on the map. No UI in here, so every rule can be tested on its own.
//
// The journey of an event in a public space:
//   1. A member creates it and uploads the permit              -> private, waiting for an organizer
//   2. An organizer of the group approves it                   -> private, with Neighbr staff
//   3. Neighbr staff: Approve, Decline with a reason, or Ask for more information
//        Approve  -> public, and a pin on the map until it ends
//        Decline  -> stays private; the group sees the reason and can send it again with a new permit
//        Ask      -> the organizers answer (a note, and a new file if they like) and it goes back to staff
//   Every decision sends a notification to the people who sent it. They see "Neighbr staff", never a name.
//
// Only a permit's file name, size and type are kept (illustrative): a real backend would store the file.
import type { Persona } from '../requests/requests';

/** The profile id Neighbr staff act as. */
export const NEIGHBR_PROFILE = 'profile-neighbr';

export const isNeighbrStaff = (p: Persona): boolean => p.profileId === NEIGHBR_PROFILE;

// ---------- which events need a permit ----------

/** Places in these categories are public space (an event there needs a permit). */
export const PUBLIC_SPACE_CATEGORIES = ['Park', 'Street', 'Sidewalk', 'Square', 'Plaza', 'Public space'];

export interface PlaceLike {
  id: string;
  category?: string;
  publicSpace?: boolean;
}

export function isPublicSpace(place: PlaceLike | undefined): boolean {
  if (!place) return false;
  return place.publicSpace === true || PUBLIC_SPACE_CATEGORIES.includes(String(place.category ?? ''));
}

/** An event with no place (online, or not on the corridor) never needs a permit. */
export function needsPermit(placeId: string | null | undefined, places: PlaceLike[]): boolean {
  return !!placeId && isPublicSpace(places.find((p) => p.id === placeId));
}

// ---------- the permit file ----------

export const PERMIT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const PERMIT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const PERMIT_MAX_BYTES = 5 * 1024 * 1024;

export interface PermitFile {
  name: string;
  size: number; // bytes
  type: string;
}

/** A plain-words problem with the file, or null if it is fine. */
export function validatePermitFile(file: PermitFile | null | undefined): string | null {
  if (!file || !file.name.trim()) return 'Upload your permit (a PDF, JPG or PNG).';
  const lower = file.name.toLowerCase();
  const okType = PERMIT_TYPES.includes(file.type) || (file.type === '' && PERMIT_EXTENSIONS.some((x) => lower.endsWith(x)));
  if (!okType || !PERMIT_EXTENSIONS.some((x) => lower.endsWith(x))) return 'The permit must be a PDF, JPG or PNG file.';
  if (file.size <= 0) return 'That file is empty. Choose your permit again.';
  if (file.size > PERMIT_MAX_BYTES) return 'The permit file is too large. Keep it under 5 MB.';
  return null;
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------- the permit and its steps ----------

export type PermitStatus = 'with-organizer' | 'with-staff' | 'more-info' | 'approved' | 'declined';

export type PermitAction = 'uploaded' | 'sent-to-staff' | 'approved' | 'declined' | 'asked' | 'answered' | 'sent-again';

export interface PermitStep {
  action: PermitAction;
  at: string; // ISO date-time
  /** The reason, question or note that went with this step. */
  text?: string;
}

export interface Permit {
  file: PermitFile;
  status: PermitStatus;
  /** Profile ids to notify about decisions: the person who made the event and the organizer who sent it to staff. */
  notify: string[];
  steps: PermitStep[];
}

export const REASON_MIN = 10;
export const REASON_MAX = 300;

export function newPermit(file: PermitFile, at: string, notify: (string | null | undefined)[] = []): Permit {
  const problem = validatePermitFile(file);
  if (problem) throw new Error(problem);
  return { file, status: 'with-organizer', notify: unique(notify), steps: [{ action: 'uploaded', at }] };
}

const unique = (ids: (string | null | undefined)[]): string[] => [...new Set(ids.filter((x): x is string => !!x))];

/** What a group sees on the event: where the permit is. Never a staff name. */
export const STAGE_LABEL: Record<PermitStatus, string> = {
  'with-organizer': 'Permit uploaded. Waiting for an organizer',
  'with-staff': 'Permit with Neighbr staff',
  'more-info': 'Neighbr staff asked for more information',
  approved: 'Permit approved by Neighbr staff',
  declined: 'Permit declined by Neighbr staff',
};

/** True while the event cannot be on the map because its permit is not approved. */
export const permitBlocksMap = (permit: Permit | undefined): boolean => !!permit && permit.status !== 'approved';

/** The organizer approves the event: the permit goes to Neighbr staff. */
export function sendToStaff(permit: Permit, at: string, organizerProfile?: string | null): Permit {
  if (permit.status !== 'with-organizer') throw new Error('This permit has already been sent to Neighbr staff.');
  return {
    ...permit,
    status: 'with-staff',
    notify: unique([...permit.notify, organizerProfile]),
    steps: [...permit.steps, { action: 'sent-to-staff', at }],
  };
}

export type PermitDecision = 'approve' | 'decline' | 'ask';

/** Plain-words problem with the text a staff member typed for this decision, or null. */
export function validateDecision(decision: PermitDecision, text: string): string | null {
  if (decision === 'approve') return null;
  const t = text.trim();
  const what = decision === 'decline' ? 'reason' : 'question';
  if (t.length < REASON_MIN) return decision === 'decline' ? 'Give a reason, so the group knows what to fix.' : 'Write what you need to know.';
  if (t.length > REASON_MAX) return `Keep the ${what} under ${REASON_MAX} characters.`;
  return null;
}

/** Neighbr staff decide on a permit that is waiting for them. */
export function decide(permit: Permit, decision: PermitDecision, text: string, at: string): Permit {
  if (permit.status !== 'with-staff') throw new Error('This permit is not waiting for review.');
  const problem = validateDecision(decision, text);
  if (problem) throw new Error(problem);
  const t = text.trim();
  if (decision === 'approve') return { ...permit, status: 'approved', steps: [...permit.steps, { action: 'approved', at }] };
  if (decision === 'decline') return { ...permit, status: 'declined', steps: [...permit.steps, { action: 'declined', at, text: t }] };
  return { ...permit, status: 'more-info', steps: [...permit.steps, { action: 'asked', at, text: t }] };
}

export const ANSWER_MIN = 5;

/**
 * The organizers answer. After a question: a note (and a new file if they like). After a decline: a new
 * permit file is needed, and a note is optional. Either way it goes back to Neighbr staff.
 */
export function answer(permit: Permit, reply: { note?: string; file?: PermitFile | null }, at: string): Permit {
  const note = (reply.note ?? '').trim();
  if (permit.status === 'more-info') {
    if (note.length < ANSWER_MIN) throw new Error('Write your answer to the question.');
    if (reply.file) {
      const bad = validatePermitFile(reply.file);
      if (bad) throw new Error(bad);
    }
    return { ...permit, status: 'with-staff', file: reply.file ?? permit.file, steps: [...permit.steps, { action: 'answered', at, text: note }] };
  }
  if (permit.status === 'declined') {
    const bad = validatePermitFile(reply.file);
    if (bad) throw new Error(bad);
    return { ...permit, status: 'with-staff', file: reply.file as PermitFile, steps: [...permit.steps, { action: 'sent-again', at, ...(note ? { text: note } : {}) }] };
  }
  throw new Error('There is nothing to answer on this permit.');
}

/** The latest question or reason, for the group to read. */
export function latestMessage(permit: Permit): { kind: 'question' | 'reason'; text: string } | null {
  if (permit.status === 'more-info') {
    const s = [...permit.steps].reverse().find((x) => x.action === 'asked');
    return s?.text ? { kind: 'question', text: s.text } : null;
  }
  if (permit.status === 'declined') {
    const s = [...permit.steps].reverse().find((x) => x.action === 'declined');
    return s?.text ? { kind: 'reason', text: s.text } : null;
  }
  return null;
}

/** Whether an organizer of the event's group can answer (after a question, or a decline). */
export function canAnswer(permit: Permit | undefined, viewer: { orgId: string; role: string } | undefined, eventOrgId: string): boolean {
  return !!permit && (permit.status === 'more-info' || permit.status === 'declined') && viewer?.orgId === eventOrgId && viewer.role === 'organizer';
}

/** Words for each step, for the history on the event and in the staff queue. */
export const STEP_LABEL: Record<PermitAction, string> = {
  uploaded: 'Permit uploaded',
  'sent-to-staff': 'Approved by an organizer, sent to Neighbr staff',
  approved: 'Approved by Neighbr staff',
  declined: 'Declined by Neighbr staff',
  asked: 'Neighbr staff asked for more information',
  answered: 'The group answered',
  'sent-again': 'The group sent it again with a new permit',
};

/** The message that lands in the bell after a decision. */
export function decisionNotice(decision: PermitDecision, eventName: string, text: string, onMap: boolean): { title: string; text: string } {
  if (decision === 'approve') {
    return {
      title: eventName,
      text: onMap ? 'Neighbr staff approved the permit. The event is public and on the map until it ends.' : 'Neighbr staff approved the permit. The event is public.',
    };
  }
  if (decision === 'decline') return { title: eventName, text: `Neighbr staff declined the permit: ${text.trim()}` };
  return { title: eventName, text: `Neighbr staff need more information about the permit: ${text.trim()}` };
}
