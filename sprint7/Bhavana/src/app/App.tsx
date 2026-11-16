// Picks the page from the URL hash and wraps it in the shell.
// Sprint 6 (Purab): onboarding (#/welcome) sends each user type to its own landing page, and one
// "Viewing as" drives every section (map, Requests, Community, School). The chosen person is kept
// after a refresh; Reset demo goes back to the sample data.
// Bhavana (task 9): also holds who the person is acting as (Me / My business) and whether
// "Show me on the map" is on, so the top bar and the map page share the same choice.
import { useEffect, useState } from 'react';
import { AppShell, ComingSoon } from './AppShell';
import { ROUTES, parseRoute, type RouteId } from './routes';
import { getCurrentUser, getProfiles, resetDemo, type Profile } from '../data/api';
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
import { UserPresence } from '../features/cards/UserPresence';
import { DEMO_BUSINESS_ID, type Mode, type Profile as CardProfile } from '../features/cards/cardData';

type PageId = RouteId | 'welcome';
const PERSONA_KEY = 'pinpoint-persona';

function savedPersona(): Persona | null {
  try {
    const id = localStorage.getItem(PERSONA_KEY);
    return id ? personaById(id) : null;
  } catch {
    return null;
  }
}

const pageFromHash = (hash: string): PageId => (/^#\/?welcome/.test(hash) ? 'welcome' : parseRoute(hash));

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

export default function App() {
  const route = useRoute();
  const [user, setUser] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Profile | undefined>(undefined);
  const [owner, setOwner] = useState<Profile | undefined>(undefined);
  // Sprint 5/6 (Purab): who the demo is acting as. Me / My business and "Viewing as" stay in step.
  const [persona, setPersonaState] = useState<Persona>(() => savedPersona() ?? DEFAULT_PERSONA);
  const [mode, setModeState] = useState<Mode>(() => ((savedPersona() ?? DEFAULT_PERSONA).reportMode === 'business' ? 'business' : 'me'));
  const remember = (p: Persona) => {
    try {
      localStorage.setItem(PERSONA_KEY, p.id);
    } catch {
      /* storage blocked: the choice lasts until refresh */
    }
  };
  const applyPersona = (p: Persona) => {
    setPersonaState(p);
    setModeState(p.reportMode === 'business' ? 'business' : 'me');
    remember(p);
  };
  const setMode = (m: Mode) => applyPersona(personaForMode(m));
  /** Viewing as: stay on Requests or Chats (to follow the same request or chat), otherwise go to the person's own page. */
  const setPersona = (p: Persona) => {
    applyPersona(p);
    if (route !== 'requests' && route !== 'chats') window.location.hash = `#/${p.landing ?? 'map'}`;
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
    const label = route === 'welcome' ? 'Welcome' : ROUTES.find((r) => r.id === route)?.label ?? 'Map';
    document.title = `${label} · Neighbr (PinPoint)`;
  }, [route]);

  const def = ROUTES.find((r) => r.id === route) ?? ROUTES[0];
  const ownProfile = persona.id === 'resident' || persona.id === 'business';
  const bell = <NotificationBell persona={persona} />;
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

  return (
    <AppShell
      current={route === 'welcome' ? ('welcome' as RouteId) : route}
      user={user}
      presence={presence}
      demoBar={<ViewAs persona={persona} onChange={setPersona} onReset={reset} />}
    >
      {route === 'welcome' ? (
        <Welcome current={persona} onJoin={join} />
      ) : route === 'map' ? (
        <MapPage
          mode={mode}
          showMe={showMe}
          openProfile={openProfile}
          // Everyone except the resident and the business owner looks at the map as themselves:
          // they see public items and their own private reports.
          viewerOverride={ownProfile ? undefined : persona.profileId}
          canReport={persona.canReport !== false}
          persona={persona}
        />
      ) : route === 'requests' ? (
        <RequestsPage persona={persona} />
      ) : route === 'updates' ? (
        <UpdatesPage persona={persona} />
      ) : route === 'chats' ? (
        // KAN-51 (Bhavana): chats follow Viewing as
        <ChatsPage key={persona.id} persona={persona} />
      ) : route === 'community' ? (
        // KAN-48 (Mounika) / KAN-47 (Devu): the Community and School sections follow Viewing as.
        <CommunityPage key={persona.id} persona={persona} />
      ) : (
        <ComingSoon title={def.label} />
      )}
    </AppShell>
  );
}
