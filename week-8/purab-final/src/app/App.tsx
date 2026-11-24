// Picks the page from the URL hash and wraps it in the shell.
// Sprint 6 (Purab): onboarding (#/welcome) sends each user type to its own landing page, and one
// "Viewing as" drives every section (map, Requests, Community, School). The chosen person is kept
// after a refresh; Reset demo goes back to the sample data.
// Bhavana (task 9): also holds who the person is acting as (Me / My business) and whether
// "Show me on the map" is on, so the top bar and the map page share the same choice.
import { useEffect, useMemo, useState } from 'react';
import { AppShell, ComingSoon } from './AppShell';
import { ROUTES, parseRoute, type RouteId } from './routes';
import { effectivePersona, getCurrentUser, getProfiles, onDataChange, resetDemo, type Profile } from '../data/api';
import MapPage from '../features/map/MapPage';
import CommunityPage from '../features/community/CommunityPage';
import RequestsPage from '../features/requests/RequestsPage';
import { DEFAULT_PERSONA, personaById, personaForMode } from '../features/requests/personas';
import type { Persona } from '../features/requests/requests';
import { StaffBadge, ViewAs } from './ViewAs';
import { NotificationBell } from './Notifications';
import { Welcome } from './Welcome';
import UpdatesPage from '../features/updates/UpdatesPage';
import ChatsPage from '../features/chats/ChatsPage';
import MarketplacePage from '../features/marketplace/MarketplacePage';
import ModerationPage from '../features/moderation/ModerationPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { isNeighbrStaff } from '../features/moderation/permits';
import { UserPresence } from '../features/cards/UserPresence';
import { DEMO_BUSINESS_ID, type Mode, type Profile as CardProfile } from '../features/cards/cardData';
// Pitch redesign (Week 8): shared polish, loaded after every page's own styles
import './polish.css';
// Week 8 (pitch): guided tour, live sync note, public report card and QR posters
import { TOUR, TourCard } from './Tour';
import { ReportCardPage } from '../features/corridor/ReportCardPage';
import { PostersPage } from '../features/corridor/PostersPage';
import { onRemoteChange } from '../data/api';
import { useT } from './i18n';
// Week 8 (Purab): sign-in for every person, and an admin who can switch between everyone
import { ADMIN_ID, currentAccountId, signOut, type Account } from './auth';
import { LoginPage } from './LoginPage';
import { MemberBar } from './ViewAs';
import { PageTranslator } from './PageTranslator';

// KAN-50 (Purab): #/profile is opened from "Your profile" in the Viewing as strip, not from the main menu.
type PageId = RouteId | 'welcome' | 'profile' | 'report-card' | 'posters';
const PERSONA_KEY = 'pinpoint-persona';

function savedPersona(): Persona | null {
  try {
    const id = localStorage.getItem(PERSONA_KEY);
    return id ? personaById(id) : null;
  } catch {
    return null;
  }
}

const pageFromHash = (hash: string): PageId =>
  /^#\/?welcome/.test(hash)
    ? 'welcome'
    : /^#\/?profile/.test(hash)
      ? 'profile'
      : /^#\/?report-card/.test(hash)
        ? 'report-card'
        : /^#\/?posters/.test(hash)
          ? 'posters'
          : parseRoute(hash);

function useRoute(): PageId {
  const [route, setRoute] = useState<PageId>(() => {
    // First visit (nobody chosen yet, no page in the link): start with onboarding.
    if (!savedPersona() && (window.location.hash === '' || window.location.hash === '#/')) {
      window.location.hash = '#/welcome';
      return 'welcome';
    }
    return pageFromHash(window.location.hash);
  });
  useEffect(() => {
    const onHash = () => setRoute(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

/** A link straight to a page (e.g. a QR poster), opened before signing in: go there afterwards. */
const isDeepLink = (hash: string) => /^#\/?[a-z]/.test(hash) && !/^#\/?welcome/.test(hash);

export default function App() {
  const route = useRoute();
  // Week 8: who is signed in in this tab ('admin', a person's id, or nobody)
  const [accountId, setAccountId] = useState<string | null>(() => currentAccountId());
  const isAdmin = accountId === ADMIN_ID;
  const startPersona = (): Persona =>
    accountId && accountId !== ADMIN_ID ? personaById(accountId) : (savedPersona() ?? DEFAULT_PERSONA);
  const [user, setUser] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Profile | undefined>(undefined);
  const [owner, setOwner] = useState<Profile | undefined>(undefined);
  // Sprint 5/6 (Purab): who the demo is acting as. Me / My business and "Viewing as" stay in step.
  const [persona, setPersonaState] = useState<Persona>(startPersona);
  const [mode, setModeState] = useState<Mode>(() => (startPersona().reportMode === 'business' ? 'business' : 'me'));
  const remember = (p: Persona) => {
    try {
      localStorage.setItem(PERSONA_KEY, p.id);
    } catch {
      /* storage blocked: the choice lasts until refresh */
    }
  };
  const applyPersona = (p: Persona, keep = isAdmin) => {
    setPersonaState(p);
    setModeState(p.reportMode === 'business' ? 'business' : 'me');
    // only the admin's choice is remembered for next time; a member always signs in as themselves
    if (keep) remember(p);
  };
  const signedIn = (account: Account) => {
    const deep = isDeepLink(window.location.hash);
    setAccountId(account.id);
    if (account.id === ADMIN_ID) {
      applyPersona(savedPersona() ?? DEFAULT_PERSONA, true);
      if (!deep) window.location.hash = '#/welcome';
    } else {
      const p = personaById(account.id);
      applyPersona(p, false);
      if (!deep) window.location.hash = `#/${p.landing ?? 'map'}`;
    }
  };
  const signOutNow = () => {
    signOut();
    setAccountId(null);
    setTourStep(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };
  // A member can't open the sign-up chooser (that's how the admin switches person).
  useEffect(() => {
    if (accountId && !isAdmin && route === 'welcome') window.location.hash = `#/${persona.landing ?? 'map'}`;
  }, [accountId, isAdmin, route, persona]);
  const setMode = (m: Mode) => applyPersona(personaForMode(m));
  // KAN-50 (Purab): the person with their settings applied (their chosen home area). Every page gets
  // this one, so area alerts and Marketplace distances follow Settings straight away.
  const homeOf = (p: Persona) => JSON.stringify(effectivePersona(p).home ?? null);
  const [homeKey, setHomeKey] = useState(() => homeOf(persona));
  useEffect(() => {
    const update = () => setHomeKey(homeOf(persona));
    update();
    return onDataChange(update);
  }, [persona]);
  const viewer = useMemo(() => effectivePersona(persona), [persona, homeKey]);
  /** Viewing as: stay on Requests, Chats or the Marketplace (to follow the same request, chat or listing), otherwise go to the person's own page. */
  const setPersona = (p: Persona) => {
    applyPersona(p);
    if (route !== 'requests' && route !== 'chats' && route !== 'marketplace' && route !== 'profile') window.location.hash = `#/${p.landing ?? 'map'}`;
  };
  /** Onboarding: join as this person and land on their page. */
  const join = (p: Persona) => {
    applyPersona(p);
    window.location.hash = `#/${p.landing ?? 'map'}`;
  };
  const reset = () => {
    resetDemo();
    try {
      localStorage.removeItem(PERSONA_KEY);
    } catch {
      /* ignore */
    }
    setPersonaState(DEFAULT_PERSONA);
    setModeState('me');
    window.location.hash = '#/welcome';
  };
  // Week 8: the guided tour switches person and page for each step
  const [tourStep, setTourStep] = useState<number | null>(null);
  const goToStep = (n: number) => {
    const step = TOUR[n];
    if (!step) return;
    applyPersona(personaById(step.persona));
    window.location.hash = step.hash;
    setTourStep(n);
  };
  const startTour = () => goToStep(0);
  // Week 8: another window changed the demo (live sync): say so for a moment
  const t = useT();
  const [remoteNote, setRemoteNote] = useState(false);
  useEffect(
    () =>
      onRemoteChange(() => {
        setRemoteNote(true);
        window.setTimeout(() => setRemoteNote(false), 3000);
      }),
    [],
  );
  const [showMe, setShowMe] = useState(false);
  // Clicking the avatar opens your own profile card on the map page.
  const [openProfile, setOpenProfile] = useState<{ id: string; n: number } | null>(null);
  const handleOpenProfile = (id: string) => {
    if (route !== 'map') window.location.hash = '#/map';
    setOpenProfile((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
  };

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    getProfiles()
      .then((ps) => {
        const biz = ps.find((p) => p.id === DEMO_BUSINESS_ID);
        setBusiness(biz);
        setOwner(ps.find((p) => p.id === biz?.ownerProfileId)); // KAN-37: owner is a separate profile
      })
      .catch(() => setBusiness(undefined));
  }, []);

  useEffect(() => {
    if (!accountId) return; // the sign-in page sets its own title
    const label =
      route === 'welcome'
        ? 'Welcome'
        : route === 'profile'
          ? 'Your profile'
          : route === 'report-card'
            ? 'Corridor report card'
            : route === 'posters'
              ? 'QR posters'
              : ROUTES.find((r) => r.id === route)?.label ?? 'Map';
    document.title = `${label} · Neighbr (PinPoint)`;
  }, [route, accountId]);

  const def = ROUTES.find((r) => r.id === route) ?? ROUTES[0];
  const ownProfile = persona.id === 'resident' || persona.id === 'business';
  const bell = <NotificationBell persona={viewer} />;
  const presence = !ownProfile ? (
    <>
      {bell}
      <StaffBadge persona={persona} />
    </>
  ) : user ? (
    <>
      {bell}
    <UserPresence
      user={user as CardProfile}
      business={business as CardProfile | undefined}
      owner={owner as CardProfile | undefined}
      mode={mode}
      onModeChange={setMode}
      showMe={showMe}
      onShowMeChange={setShowMe}
      onOpenProfile={handleOpenProfile}
    />
    </>
  ) : undefined;

  if (!accountId) return <LoginPage onSignedIn={signedIn} returning={isDeepLink(window.location.hash)} />;

  return (
    <AppShell
      current={route === 'welcome' || route === 'profile' || route === 'report-card' || route === 'posters' ? (route as RouteId) : route}
      user={user}
      presence={presence}
      showStaffPages={isNeighbrStaff(persona)}
      demoBar={
        isAdmin ? (
          <ViewAs persona={persona} onChange={setPersona} onReset={reset} onTour={startTour} onSignOut={signOutNow} />
        ) : (
          <MemberBar persona={persona} onSignOut={signOutNow} />
        )
      }
    >
      <PageTranslator />
      {tourStep !== null && <TourCard step={tourStep} onStep={goToStep} onClose={() => setTourStep(null)} />}
      {remoteNote && (
        <p className="live-note" role="status">
          {t('live.updated')}
        </p>
      )}
      {route === 'welcome' && !isAdmin ? null : route === 'welcome' ? (
        <Welcome current={persona} onJoin={join} onTour={startTour} />
      ) : route === 'report-card' ? (
        <ReportCardPage />
      ) : route === 'posters' ? (
        <PostersPage />
      ) : route === 'profile' ? (
        // KAN-50 (Purab): your profile and settings
        <ProfilePage key={persona.id} persona={persona} />
      ) : route === 'map' ? (
        <MapPage
          mode={mode}
          showMe={showMe}
          openProfile={openProfile}
          // Everyone except the resident and the business owner looks at the map as themselves:
          // they see public items and their own private reports.
          viewerOverride={ownProfile ? undefined : persona.profileId}
          canReport={persona.canReport !== false}
          persona={viewer}
        />
      ) : route === 'requests' ? (
        <RequestsPage persona={viewer} />
      ) : route === 'updates' ? (
        <UpdatesPage persona={viewer} />
      ) : route === 'chats' ? (
        // KAN-51 (Bhavana): chats follow Viewing as
        <ChatsPage key={persona.id} persona={viewer} />
      ) : route === 'marketplace' ? (
        // KAN-53 (Devu): the Marketplace follows Viewing as
        <MarketplacePage key={persona.id} persona={viewer} />
      ) : route === 'review' ? (
        // KAN-52 (Mounika): Neighbr staff review event permits and reported content
        <ModerationPage key={persona.id} persona={viewer} />
      ) : route === 'community' ? (
        // KAN-48 (Mounika) / KAN-47 (Devu): the Community and School sections follow Viewing as.
        <CommunityPage key={persona.id} persona={viewer} />
      ) : (
        <ComingSoon title={def.label} />
      )}
    </AppShell>
  );
}
