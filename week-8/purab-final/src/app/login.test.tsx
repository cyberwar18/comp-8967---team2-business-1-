// Week 8 (Purab): sign-in with validation, one account per person, and the admin who switches.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ACCOUNTS, ADMIN_ID, ADMIN_PASSWORD, MEMBER_PASSWORD, SESSION_KEY, currentAccountId, resetSignInAttempts, setAuthClockForTests, signInWith, signOut, validateSignIn } from './auth';
import { LoginPage } from './LoginPage';
import { MemberBar, ViewAs } from './ViewAs';
import { PERSONAS, personaById } from '../features/requests/personas';
import { LangProvider } from './i18n';

afterEach(() => {
  cleanup();
  signOut();
  resetSignInAttempts();
  setAuthClockForTests(null);
  localStorage.removeItem('pinpoint-lang');
});

describe('accounts', () => {
  it('every person in the demo has their own account, plus one admin', () => {
    for (const p of PERSONAS) expect(ACCOUNTS.some((a) => a.id === p.id), p.id).toBe(true);
    expect(ACCOUNTS.filter((a) => a.id === ADMIN_ID)).toHaveLength(1);
    expect(new Set(ACCOUNTS.map((a) => a.email)).size).toBe(ACCOUNTS.length);
  });
});

describe('validation', () => {
  it('checks both fields before signing in', () => {
    expect(validateSignIn('', '')).toEqual({ email: 'login.err.emailEmpty', password: 'login.err.passwordEmpty' });
    expect(validateSignIn('maya', 'Demo2026!')).toEqual({ email: 'login.err.emailFormat' });
    expect(validateSignIn('maya@pinpoint', 'Demo2026!')).toEqual({ email: 'login.err.emailFormat' });
    expect(validateSignIn('maya@pinpoint.demo', 'short')).toEqual({ password: 'login.err.passwordShort' });
    expect(validateSignIn('  maya@pinpoint.demo ', 'Demo2026!')).toEqual({});
  });

  it('signs in with the right password, ignoring capitals and spaces in the email', () => {
    const r = signInWith(' Maya@PinPoint.demo ', MEMBER_PASSWORD);
    expect(r.ok && r.account.id).toBe('parent');
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('parent');
    expect(currentAccountId()).toBe('parent');
    signOut();
    expect(currentAccountId()).toBeNull();
  });

  it('gives the same message for an unknown email and a wrong password', () => {
    const a = signInWith('nobody@pinpoint.demo', MEMBER_PASSWORD);
    const b = signInWith('maya@pinpoint.demo', 'Wrong2026!');
    expect(a).toEqual({ ok: false, problem: 'login.err.wrong', triesLeft: 4 });
    expect(b).toEqual({ ok: false, problem: 'login.err.wrong', triesLeft: 3 });
    expect(signInWith('admin@pinpoint.demo', MEMBER_PASSWORD).ok).toBe(false); // members' password doesn't open the admin
  });

  it('waits 30 seconds after 5 wrong tries, even with the right password', () => {
    let now = 1_000_000;
    setAuthClockForTests(() => now);
    for (let i = 0; i < 4; i++) signInWith('maya@pinpoint.demo', 'Wrong2026!');
    expect(signInWith('maya@pinpoint.demo', 'Wrong2026!')).toEqual({ ok: false, problem: 'login.err.locked' });
    expect(signInWith('maya@pinpoint.demo', MEMBER_PASSWORD)).toEqual({ ok: false, problem: 'login.err.locked' });
    now += 30_001;
    expect(signInWith('maya@pinpoint.demo', MEMBER_PASSWORD).ok).toBe(true);
  });
});

describe('sign-in page', () => {
  const renderPage = (onSignedIn = vi.fn()) => {
    render(
      <LangProvider>
        <LoginPage onSignedIn={onSignedIn} />
      </LangProvider>,
    );
    return onSignedIn;
  };

  it('shows what to fix, next to each field and in a summary', () => {
    const done = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const summary = screen.getByRole('alert');
    expect(within(summary).getByText('Enter your email.')).toBeTruthy();
    expect(within(summary).getByText('Enter your password.')).toBeTruthy();
    const email = screen.getByLabelText('Email');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(email.getAttribute('aria-describedby')!)!.textContent).toBe('Enter your email.');
    expect(done).not.toHaveBeenCalled();
  });

  it('says when the email and password do not match, and how many tries are left', () => {
    const done = renderPage();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jordan@pinpoint.demo' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'NotRight1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert').textContent).toMatch(/don’t match an account.*4 tries left/);
    expect(done).not.toHaveBeenCalled();
  });

  it('signs in a member, and the password can be shown', () => {
    const done = renderPage();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jordan@pinpoint.demo' } });
    const pw = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.change(pw, { target: { value: MEMBER_PASSWORD } });
    expect(pw.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ id: 'city-lead' }));
  });

  it('fills in a demo account with one click, including the admin', () => {
    const done = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Fill in the account for Admin' }));
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('admin@pinpoint.demo');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(ADMIN_PASSWORD);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ id: ADMIN_ID }));
  });

  it('works in French', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'FR' }));
    expect(screen.getByRole('heading', { name: 'Se connecter à Neighbr' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Entrez votre courriel/);
  });
});

describe('who can switch', () => {
  it('a member sees only themselves, with Sign out', () => {
    const out = vi.fn();
    render(<MemberBar persona={personaById('city-lead')} onSignOut={out} />);
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tour' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(out).toHaveBeenCalled();
  });

  it('the admin can switch to anyone, take the tour, and sign out', () => {
    const change = vi.fn();
    const out = vi.fn();
    render(<ViewAs persona={personaById('resident')} onChange={change} onTour={vi.fn()} onReset={vi.fn()} onSignOut={out} />);
    expect(screen.getByText('Admin')).toBeTruthy();
    const select = screen.getByLabelText('Viewing as');
    expect(within(select).getAllByRole('option')).toHaveLength(PERSONAS.length);
    fireEvent.change(select, { target: { value: 'neighbr-staff' } });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ id: 'neighbr-staff' }));
    expect(screen.getByRole('button', { name: 'Tour' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(out).toHaveBeenCalled();
  });
});
