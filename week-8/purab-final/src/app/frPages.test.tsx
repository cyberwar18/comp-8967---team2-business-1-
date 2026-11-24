// Week 8 (Purab): the inside pages in French, and back to English.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { toFrench, frenchDates } from './frPages';
import { PageTranslator } from './PageTranslator';
import { LangProvider, useLang } from './i18n';

afterEach(() => {
  cleanup();
  localStorage.removeItem('pinpoint-lang');
});

describe('French text', () => {
  it('translates labels, keeps the spaces around them, and leaves unknown text alone', () => {
    expect(toFrench('Work queue')).toBe('File de travail');
    expect(toFrench(' Mark resolved ')).toBe(' Marquer comme réglée ');
    expect(toFrench('Pothole on Wyandotte at Pierre Ave')).toBeNull();
    expect(toFrench('42')).toBeNull();
  });

  it('handles text with numbers, names and dates in it', () => {
    expect(toFrench('140 m away')).toBe('à 140 m');
    expect(toFrench('Overdue by 24 days')).toBe('En retard de 24 jours');
    expect(toFrench('Notifications, 3 new')).toBe('Notifications, 3 nouvelles');
    expect(toFrench('Sign up for Hamper packer')).toBe('S’inscrire : Hamper packer');
    expect(toFrench('6 of 8 spots left')).toBe('6 places libres sur 8');
    expect(toFrench('Connecté en tant que Jordan Lee, 311 intake lead (can assign and decline).')).toBe(
      'Connecté en tant que Jordan Lee, responsable de l’accueil 311 (peut assigner et refuser).',
    );
    expect(frenchDates('Sat, Dec 5 · 1:00 PM – 4:00 PM')).toBe('sam. 5 déc. · 13 h – 16 h');
    expect(toFrench('Ends Dec 10')).toBe('Se termine le 10 déc.');
    expect(toFrench('New bulb fitted on Nov 2.')).toBe('New bulb fitted on 2 nov.');
  });
});

describe('PageTranslator', () => {
  function Page() {
    const { setLang } = useLang();
    const [n, setN] = useState(1);
    return (
      <div>
        <button type="button" onClick={() => setLang('fr')}>to-fr</button>
        <button type="button" onClick={() => setLang('en')}>to-en</button>
        <button type="button" onClick={() => setN(n + 1)}>more</button>
        <h2>Work queue</h2>
        <p>{`Overdue by ${n * 10} days`}</p>
        <input aria-label="Search listings" placeholder="Bike, shovelling, free books…" />
      </div>
    );
  }

  it('turns the page into French, keeps up with changes, and goes back to English', async () => {
    render(
      <LangProvider>
        <PageTranslator />
        <Page />
      </LangProvider>,
    );
    fireEvent.click(screen.getByText('to-fr'));
    expect(screen.getByRole('heading').textContent).toBe('File de travail');
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-label')).toBe('Rechercher des annonces');
    expect(input.getAttribute('placeholder')).toBe('Vélo, déneigement, livres gratuits…');
    // React changes the number: the new text is translated too
    await act(async () => {
      fireEvent.click(screen.getByText('more'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/En retard/).textContent).toMatch(/20/);
    fireEvent.click(screen.getByText('to-en'));
    expect(screen.getByRole('heading').textContent).toBe('Work queue');
    expect(input.getAttribute('aria-label')).toBe('Search listings');
  });
});
