// The people the demo can "view as" (Purab). Sign-in is simulated: picking a person changes who
// every screen acts for, so a request can be followed by everyone involved.
// Sprint 6 (Nigel, Nov 2): a cross-section of user types, each landing on its own page, and one
// switch for the whole app (the Community and School sections follow it too).
// `home` is roughly where each person lives or works (illustrative), so area alerts can reach them.
import type { Persona } from './requests';

export const PERSONAS: Persona[] = [
  // People
  { id: 'resident', label: 'Team 2 Group 10', title: 'Resident', kind: 'requester', profileId: 'profile-resident', group: 'people', landing: 'map', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: true, reportMode: 'me' , home: [-82.968073, 42.328867] },
  { id: 'parent', label: 'Maya R. (demo)', title: 'Resident and school parent', kind: 'requester', profileId: 'profile-resident-maya', group: 'people', landing: 'community', community: { orgId: 'org-school', as: 'me' }, schoolRole: 'parent', canReport: true, reportMode: 'me' , home: [-82.970787, 42.328319] },
  { id: 'business', label: "Rosa's Bakery", title: 'Business owner', kind: 'requester', profileId: 'profile-business', group: 'people', landing: 'map', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: true, reportMode: 'business' , home: [-82.970455, 42.328051] },
  // Organizations (they send requests like anyone else)
  { id: 'community-organizer', label: 'Priya Nair (demo)', title: 'Community organizer, Riverside Neighbours Network', kind: 'requester', profileId: 'profile-ngo', memberId: 'mem-02', group: 'organizations', landing: 'community', community: { orgId: 'org-rnn', as: 'organizer' }, schoolRole: 'public', canReport: true, reportMode: 'me' , home: [-82.966607, 42.329164] },
  { id: 'school-staff', label: 'Ms. Laurent (demo)', title: 'School staff, Riverside Public School', kind: 'requester', profileId: 'profile-school', memberId: 'mem-10', group: 'organizations', landing: 'community', community: { orgId: 'org-school', as: 'organizer' }, schoolRole: 'staff', canReport: true, reportMode: 'me' , home: [-82.9697, 42.3295] },
  { id: 'library-staff', label: 'Sofia Mendes (demo)', title: 'Library staff, Riverside Branch Library', kind: 'requester', profileId: 'profile-library', memberId: 'mem-12', group: 'organizations', landing: 'community', community: { orgId: 'org-library', as: 'organizer' }, schoolRole: 'public', canReport: true, reportMode: 'me' , home: [-82.966872, 42.328775] },
  // Staff who handle requests
  { id: 'city-lead', label: 'Jordan Lee (demo)', title: 'City 311 intake lead', kind: 'staff', profileId: 'profile-city', staffId: 'staff-311-lead', group: 'staff', landing: 'requests', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: false },
  { id: 'city-crew', label: 'Sam Patel (demo)', title: 'City roads and lighting crew', kind: 'staff', profileId: 'profile-city', staffId: 'staff-311-roads', group: 'staff', landing: 'requests', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: false },
  // The BIA handles business requests, and also sends its own requests to the City like an individual.
  { id: 'bia-lead', label: 'Alex Moreau (demo)', title: 'BIA coordinator', kind: 'staff', profileId: 'profile-bia', staffId: 'staff-bia-coord', group: 'staff', landing: 'requests', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: true, reportMode: 'me' , home: [-82.966112, 42.328928] },
  // KAN-52 (Mounika): Neighbr's own staff. They approve event permits and review reported content.
  { id: 'neighbr-staff', label: 'Taylor Brooks (demo)', title: 'Neighbr staff, permits and moderation', kind: 'staff', profileId: 'profile-neighbr', staffId: 'staff-neighbr-mod', group: 'staff', landing: 'review', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: false },
  { id: 'councillor', label: 'Ward Councillor (demo)', title: 'Gets copies, can comment', kind: 'copy', profileId: 'profile-councillor', group: 'staff', landing: 'requests', community: { orgId: 'org-rnn', as: 'me' }, schoolRole: 'public', canReport: false },
];

export const DEFAULT_PERSONA = PERSONAS[0];

export const GROUP_LABEL: Record<NonNullable<Persona['group']>, string> = {
  people: 'Residents and businesses',
  organizations: 'Organizations',
  staff: 'Staff who handle requests',
};

export function personaById(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? DEFAULT_PERSONA;
}

/** The persona that matches the Me / My business switch on the map. */
export function personaForMode(mode: 'me' | 'business'): Persona {
  return personaById(mode === 'business' ? 'business' : 'resident');
}
