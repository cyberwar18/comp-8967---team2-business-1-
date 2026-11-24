// Week 8 (Purab): demo sign-in. Every person in the demo has their own account, and one admin
// account can switch between all of them to show the whole workflow.
//
// This is a front-end demo only: the accounts and passwords below ship with the app, so they
// protect nothing. In Neighbr, signInWith() is replaced by a call to the real sign-in service,
// which checks the password on the server and returns a session token (see docs/handover).
//
// The session is kept per browser tab (sessionStorage), so two windows can be signed in as two
// different people, e.g. Maya in one and Jordan Lee at the City in the other.

export const ADMIN_ID = 'admin';

export interface Account {
  /** 'admin', or the id of the person (persona) this account signs in as. */
  id: string;
  email: string;
  password: string;
}

export const MEMBER_PASSWORD = 'Demo2026!';
export const ADMIN_PASSWORD = 'Admin2026!';

export const ACCOUNTS: Account[] = [
  { id: ADMIN_ID, email: 'admin@pinpoint.demo', password: ADMIN_PASSWORD },
  { id: 'resident', email: 'team2@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'parent', email: 'maya@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'business', email: 'rosa@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'community-organizer', email: 'priya@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'school-staff', email: 'laurent@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'library-staff', email: 'sofia@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'city-lead', email: 'jordan@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'city-crew', email: 'sam@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'bia-lead', email: 'alex@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'neighbr-staff', email: 'taylor@pinpoint.demo', password: MEMBER_PASSWORD },
  { id: 'councillor', email: 'councillor@pinpoint.demo', password: MEMBER_PASSWORD },
];

export const SESSION_KEY = 'pinpoint-session';
export const MAX_TRIES = 5;
export const LOCK_MS = 30_000;

/** Validation problems are message keys (see i18n.tsx), so they show in English or French. */
export type SignInProblem =
  | 'login.err.emailEmpty'
  | 'login.err.emailFormat'
  | 'login.err.passwordEmpty'
  | 'login.err.passwordShort'
  | 'login.err.wrong'
  | 'login.err.locked';

export interface FieldErrors {
  email?: SignInProblem;
  password?: SignInProblem;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Checks the form before anything is sent: both fields filled, a real-looking email, 8+ characters. */
export function validateSignIn(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const e = email.trim();
  if (!e) errors.email = 'login.err.emailEmpty';
  else if (!EMAIL.test(e)) errors.email = 'login.err.emailFormat';
  if (!password) errors.password = 'login.err.passwordEmpty';
  else if (password.length < 8) errors.password = 'login.err.passwordShort';
  return errors;
}

let failures = 0;
let lockedUntil = 0;
let clock: () => number = () => Date.now();

/** For tests: control the time used for the lock after too many wrong tries. */
export function setAuthClockForTests(fn: (() => number) | null): void {
  clock = fn ?? (() => Date.now());
}

export function resetSignInAttempts(): void {
  failures = 0;
  lockedUntil = 0;
}

/** Seconds left before another try is allowed (0 when not locked). */
export function lockSecondsLeft(): number {
  return Math.max(0, Math.ceil((lockedUntil - clock()) / 1000));
}

export type SignInResult = { ok: true; account: Account } | { ok: false; problem: SignInProblem; triesLeft?: number };

/**
 * Signs in with an email and password. A wrong email and a wrong password get the same message,
 * so the form never tells anyone which emails have accounts. After 5 wrong tries the form waits 30 s.
 */
export function signInWith(email: string, password: string): SignInResult {
  if (lockSecondsLeft() > 0) return { ok: false, problem: 'login.err.locked' };
  const account = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
  if (!account || account.password !== password) {
    failures += 1;
    if (failures >= MAX_TRIES) {
      failures = 0;
      lockedUntil = clock() + LOCK_MS;
      return { ok: false, problem: 'login.err.locked' };
    }
    return { ok: false, problem: 'login.err.wrong', triesLeft: MAX_TRIES - failures };
  }
  resetSignInAttempts();
  try {
    sessionStorage.setItem(SESSION_KEY, account.id);
  } catch {
    /* storage blocked: signed in until the page is refreshed */
  }
  return { ok: true, account };
}

/** The account signed in in this tab, if any. */
export function currentAccountId(): string | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    return id && ACCOUNTS.some((a) => a.id === id) ? id : null;
  } catch {
    return null;
  }
}

export function signOut(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function accountFor(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}
