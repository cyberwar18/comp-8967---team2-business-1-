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

// KAN-50 (Purab): #/profile is opened from "Your profile" in the Viewing as strip, not from the main menu.
type PageId = RouteId | 'welcome' | 'profile';
const PERSONA_KEY = 'pinpoint-persona';

function savedPersona(): Persona | null {
  try {
    const id = localStorage.getItem(PERSONA_KEY);
    return id ? personaById(id) : null;
  } catch {
    return null;
  }
}

const pageFromHash = (hash: string): PageId => (/^#\/?welcome/.test(hash) ? 'welcome' : /^#\/?profile/.test(hash) ? 'profile' : parseRoute(hash));

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
    const label = route === 'welcome' ? 'Welcome' : route === 'profile' ? 'Your profile' : ROUTES.find((r) => r.id === route)?.label ?? 'Map';
    document.title = `${label} · Neighbr (PinPoint)`;
  }, [route]);

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

  return (
    <AppShell
      current={route === 'welcome' || route === 'profile' ? (route as RouteId) : route}
      user={user}
      presence={presence}
      showStaffPages={isNeighbrStaff(persona)}
      demoBar={<ViewAs persona={persona} onChange={setPersona} onReset={reset} />}
    >
      {route === 'welcome' ? (
        <Welcome current={persona} onJoin={join} />
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
