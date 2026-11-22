// Week 8 (pitch): live sync, QR posters, guided tour, report card, smart suggestions, French.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import { DEMO_USER_ID, type CardData } from '../cards/cardData';
import { ReportProblem } from '../report/ReportProblem';
import { RESIDENT_TYPES, suggestFromText } from '../report/routing';
import { PostersPage, reportLinkFor } from './PostersPage';
import { ReportCardPage } from './ReportCardPage';
import { TOUR, TourCard } from '../../app/Tour';
import { FRENCH, LangProvider, MESSAGE_KEYS, TYPE_FR, translate, useLang } from '../../app/i18n';
import { personaById } from '../requests/personas';
import { parseRoute } from '../../app/routes';
import { actOnRequest, getReportCard, getRequests, onRemoteChange, reloadFromOtherWindow, resetDemo, setClockForTests } from '../../data/api';

const data = raw as unknown as CardData;
const places = data.places.map((p) => ({ id: p.id, name: String(p.name).replace(/\s*\(demo\)/, '') }));
const here: [number, number] = [data.places[0].lng as number, data.places[0].lat as number];
const NOW = new Date('2026-11-12T15:00:00Z');

beforeEach(() => setClockForTests(() => NOW));
afterEach(() => {
  cleanup();
  resetDemo();
  setClockForTests(null);
  try {
    localStorage.removeItem('pinpoint-lang');
  } catch {
    /* ignore */
  }
  window.location.hash = '';
});

describe('smart suggestion ("Describe it in your own words")', () => {
  it('suggests the problem and the place from plain words', () => {
    expect(suggestFromText('the light by the bakery is out', RESIDENT_TYPES, places)).toEqual({ typeId: 'streetlight', placeId: 'place-01' });
    expect(suggestFromText('overflowing bins at Glidden Grocer', RESIDENT_TYPES, places)).toEqual({ typeId: 'garbage', placeId: 'place-06' });
    expect(suggestFromText('big pothole outside the diner', RESIDENT_TYPES, places)).toEqual({ typeId: 'pothole', placeId: 'place-05' });
  });

  it('understands French too', () => {
    expect(suggestFromText('nid-de-poule devant Northside Books', RESIDENT_TYPES, places)).toEqual({ typeId: 'pothole', placeId: 'place-02' });
    expect(suggestFromText('le lampadaire est éteint', RESIDENT_TYPES, places).typeId).toBe('streetlight');
  });

  it('suggests nothing from too little or unrelated text', () => {
    expect(suggestFromText('hi', RESIDENT_TYPES, places)).toEqual({});
    expect(suggestFromText('something seems wrong', RESIDENT_TYPES, places)).toEqual({});
  });

  it('"Use this" fills in the problem, the place and the details', async () => {
    render(<ReportProblem data={data} mode="me" viewerId={DEMO_USER_ID} from={here} onSubmit={vi.fn(async () => {})} onShow={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Describe it in your own words (optional)'), { target: { value: 'The light by the bakery flickers all night' } });
    expect(await screen.findByText(/Looks like/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use this' }));
    expect((screen.getByRole('radio', { name: /Street light out/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Where is it?') as HTMLSelectElement).value).toBe('place-01');
    expect((screen.getByLabelText(/Details/) as HTMLTextAreaElement).value).toBe('The light by the bakery flickers all night');
  });
});

describe('QR posters', () => {
  it('each code opens Report a problem with the place chosen, on the same address as the app', () => {
    expect(reportLinkFor('place-01', 'https://pinpoint.example/')).toBe('https://pinpoint.example/#/map?report=place-01');
    expect(parseRoute('#/map?report=place-01')).toBe('map');
  });

  it('Report a problem opened from a poster has the place filled in and says so', () => {
    render(<ReportProblem startPlaceId="place-05" data={data} mode="me" viewerId={DEMO_USER_ID} from={here} onSubmit={vi.fn(async () => {})} onShow={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByLabelText('Where is it?') as HTMLSelectElement).value).toBe('place-05');
    expect(screen.getByText(/Opened from a poster at/).textContent).toMatch(/Maple & Rye Diner/);
  });

  it('an unknown place in the link is ignored', () => {
    render(<ReportProblem startPlaceId="nowhere" data={data} mode="me" viewerId={DEMO_USER_ID} from={here} onSubmit={vi.fn(async () => {})} onShow={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByLabelText('Where is it?') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByText(/Opened from a poster/)).toBeNull();
  });

  it('lists a poster for every place, each with a QR code', async () => {
    window.location.hash = '#/posters';
    render(<PostersPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'QR posters for the corridor' })).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('img', { name: /QR code: report a problem at/ })).toHaveLength(data.places.length));
    expect(screen.getAllByRole('link', { name: 'Open the poster' })[0].getAttribute('href')).toBe('#/posters?place=place-01');
  });

  it('shows one big poster for a place', async () => {
    window.location.hash = '#/posters?place=place-13';
    render(<PostersPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'See a problem here?' })).toBeTruthy();
    expect(screen.getByText('Thompson Parkette')).toBeTruthy();
    expect(await screen.findByRole('img', { name: 'QR code: report a problem at Thompson Parkette' })).toBeTruthy();
  });
});

describe('guided tour', () => {
  it('every step names a real person and a real page', () => {
    expect(TOUR.length).toBeGreaterThanOrEqual(8);
    for (const s of TOUR) {
      expect(personaById(s.persona).id).toBe(s.persona);
      expect(s.hash).toMatch(/^#\/(map|requests|chats|marketplace|community|review|report-card)/);
      expect(s.title.en && s.title.fr && s.body.en && s.body.fr).toBeTruthy();
    }
  });

  it('moves with Back and Next, and closes', () => {
    const onStep = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<TourCard step={0} onStep={onStep} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: TOUR[0].title.en })).toBeTruthy();
    expect(screen.getByText(`Step 1 of ${TOUR.length}`)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Back/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(onStep).toHaveBeenCalledWith(1);
    rerender(<TourCard step={TOUR.length - 1} onStep={onStep} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close the tour' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Corridor report card', () => {
  it('counts every request but shows only the ones posted to the map', async () => {
    const card = await getReportCard();
    expect(card.total).toBe(8);
    expect(card.resolved).toBe(2);
    expect(card.resolvedPct).toBe(25);
    expect(card.fixed.map((f) => f.id).sort()).toEqual(['req-11', 'req-12']);
    // nothing about a private request appears anywhere in what the page gets
    const json = JSON.stringify(card);
    for (const title of ['Streetlight out near the pharmacy', 'Leaking roof in our unit', 'Bins overflowing near Glidden', 'Delivery zone blocked every morning']) {
      expect(json).not.toContain(title);
    }
    expect(json).not.toMatch(/Maya|Chris|requester/);
  });

  it('shows the numbers, the kinds and what was fixed', async () => {
    render(<ReportCardPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'How Wyandotte St E is doing' })).toBeTruthy();
    const kpis = screen.getByRole('list', { name: 'Corridor report card' });
    expect(within(kpis).getByText('requests sent').previousSibling?.textContent).toBe('8');
    expect(screen.getByText('Faded crosswalk at Thompson')).toBeTruthy();
    expect(screen.queryByText('Leaking roof in our unit')).toBeNull();
  });
});

describe('live sync between windows', () => {
  it('rebuilds from what another window saved, and says so', async () => {
    const lead = personaById('city-lead');
    await actOnRequest('req-issue-05', lead, 'acknowledge', {});
    const savedByOtherWindow = localStorage.getItem('pinpoint-demo-v1')!;
    expect(savedByOtherWindow).toBeTruthy();
    resetDemo(); // this window is back to the sample data
    const before = (await getRequests(lead)).find((r) => r.id === 'req-issue-05')!;
    expect(before.state).toBe('new');

    const heard = vi.fn();
    const stop = onRemoteChange(heard);
    localStorage.setItem('pinpoint-demo-v1', savedByOtherWindow);
    window.dispatchEvent(new StorageEvent('storage', { key: 'pinpoint-demo-v1' }));
    const after = (await getRequests(lead)).find((r) => r.id === 'req-issue-05')!;
    expect(after.state).toBe('acknowledged');
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it('a reset in another window resets this one too', async () => {
    const lead = personaById('city-lead');
    await actOnRequest('req-issue-05', lead, 'acknowledge', {});
    localStorage.removeItem('pinpoint-demo-v1');
    reloadFromOtherWindow();
    expect((await getRequests(lead)).find((r) => r.id === 'req-issue-05')!.state).toBe('new');
  });
});

describe('English and French', () => {
  it('every message has a French version, and placeholders are filled', () => {
    for (const k of MESSAGE_KEYS) expect(FRENCH[k], k).toBeTruthy();
    for (const t of RESIDENT_TYPES) expect(TYPE_FR[t.id]?.label, t.id).toBeTruthy();
    expect(translate('fr', 'tour.step', { n: 2, total: 10 })).toBe('Étape 2 de 10');
    expect(translate('en', 'nav.map')).toBe('Map');
  });

  it('switching to French changes the form and the page language', () => {
    function Switch() {
      const { setLang } = useLang();
      return (
        <button type="button" onClick={() => setLang('fr')}>
          FR
        </button>
      );
    }
    render(
      <LangProvider>
        <Switch />
        <ReportProblem data={data} mode="me" viewerId={DEMO_USER_ID} from={here} onSubmit={vi.fn(async () => {})} onShow={vi.fn()} onClose={vi.fn()} />
      </LangProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Report a problem' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'FR' }));
    expect(screen.getByRole('heading', { name: 'Signaler un problème' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Nid-de-poule/ })).toBeTruthy();
    expect(document.documentElement.lang).toBe('fr-CA');
    expect(localStorage.getItem('pinpoint-lang')).toBe('fr');
  });
});
