// Week 8 (pitch): English and French, Canada's two official languages.
// Covered in French: the app frame (sections, Viewing as strip, bell), the Welcome page,
// Report a problem (with its problem types, choices and errors), the guided tour, the Corridor
// report card, the QR posters and the live-sync note. Other pages stay in English for now.
// The choice is kept in this browser and sets <html lang> so screen readers switch voice.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'fr';
const LANG_KEY = 'pinpoint-lang';

const EN = {
  // frame
  'nav.map': 'Map',
  'nav.requests': 'Requests',
  'nav.community': 'Community',
  'nav.updates': 'Updates',
  'nav.chats': 'Chats',
  'nav.marketplace': 'Marketplace',
  'nav.review': 'Review',
  'strip.region': 'Demo sign-in',
  'strip.demo': 'Demo',
  'strip.viewingAs': 'Viewing as',
  'strip.note': 'Sign-in is simulated so one request can be followed by everyone involved.',
  'strip.profile': 'Your profile',
  'strip.signup': 'Sign up as someone else',
  'strip.reset': 'Reset demo',
  'strip.tour': 'Tour',
  'strip.language': 'Language',
  'group.people': 'Residents and businesses',
  'group.organizations': 'Organizations',
  'group.staff': 'Staff who handle requests',
  'live.updated': 'Updated from another window',
  // welcome
  'wl.kicker': 'Neighbr for Olde Riverside, Windsor',
  'wl.title1': 'Your street,',
  'wl.title2': 'on one shared map.',
  'wl.lead':
    "Report a broken streetlight and follow it until it's fixed. See what's on this week, back your local shops, and hear from the City, your school and your councillor, all in one place.",
  'wl.p1': 'Requests go straight to the people who fix them',
  'wl.p2': 'You decide what your neighbours can see',
  'wl.p3': 'Residents, shops, groups and the City on one app',
  'wl.tour': 'Take the 2-minute tour',
  'wl.reportCard': 'See how the street is doing',
  'wl.current': 'Current',
  'wl.pinFixed': 'Streetlight fixed',
  'wl.pinMarket': 'Friday Market',
  'wl.pinOpen': "We're open",
  'wl.chooseTitle': 'Who are you joining as?',
  'wl.chooseLead': "Pick one. You'll land on the page made for you, and you can change it any time with",
  'wl.chooseLead2': 'Sign-up is simulated for the demo.',
  // report a problem
  'rp.title': 'Report a problem',
  'rp.short': 'Report',
  'rp.lead': 'Tell the people responsible about a problem on your street.',
  'rp.describe': 'Describe it in your own words (optional)',
  'rp.describeHint': 'For example "the light by the bakery is out". We suggest the problem and the place.',
  'rp.suggest': 'Looks like',
  'rp.suggestNear': 'near',
  'rp.useSuggestion': 'Use this',
  'rp.noSuggestion': 'No suggestion yet: choose the problem below.',
  'rp.what': "What's the problem?",
  'rp.where': 'Where is it?',
  'rp.chooseNearest': 'Choose the nearest place',
  'rp.pick': 'Or pick the spot on the map',
  'rp.photo': 'Photo (optional)',
  'rp.addPhoto': 'Add a photo',
  'rp.addPhotoHint': 'It helps the crew find it. Resized for you.',
  'rp.details': 'Details (optional)',
  'rp.who': 'Who can see it?',
  'rp.private': 'Send privately',
  'rp.privateHint': 'Only you and the people handling it',
  'rp.public': 'Post to the map',
  'rp.publicHint': 'Neighbours can see it and follow its progress',
  'rp.fromQr': 'Opened from a poster at',
  'rp.goesTo': 'Goes to',
  'rp.copyTo': 'with a copy to',
  'rp.publicNote': 'Public: it goes to {to} and appears on the map for everyone, with its progress.',
  'rp.privateNote': 'Private: only you and {to} see this.',
  'rp.chooseFirst': 'Choose a problem to see who it goes to.',
  'rp.send': 'Send report',
  'rp.sending': 'Sending…',
  'rp.cancel': 'Cancel',
  'rp.charsLeft': '{n} characters left',
  'rp.details2': 'Details',
  'rp.sentTitle': 'Report sent',
  'rp.seeOnMap': 'See it on the map',
  'rp.track': 'Track it in Requests',
  'rp.done': 'Done',
  'rp.example': 'e.g. The light has been off for three nights.',
  // tour
  'tour.label': 'Guided tour',
  'tour.step': 'Step {n} of {total}',
  'tour.next': 'Next',
  'tour.back': 'Back',
  'tour.finish': 'Finish',
  'tour.close': 'Close the tour',
  'tour.as': 'Viewing as',
  // report card
  'rc.kicker': 'Corridor report card',
  'rc.title': 'How Wyandotte St E is doing',
  'rc.lead': 'Every request sent through Neighbr on the corridor, counted. Private requests are counted here but never shown. Illustrative sample data.',
  'rc.sent': 'requests sent',
  'rc.resolvedPct': 'resolved',
  'rc.avgDays': 'days on average to fix',
  'rc.fixedPct': 'of senders say it was really fixed',
  'rc.support': 'times neighbours added support instead of a duplicate',
  'rc.supportOne': 'time a neighbour added support instead of a duplicate',
  'rc.orgLine': '{done} of {n} fixed',
  'rc.open': 'still being worked on',
  'rc.kinds': 'What neighbours report',
  'rc.who': 'Who handles it',
  'rc.fixed': 'Fixed recently',
  'rc.fixedNone': 'Nothing fixed yet.',
  'rc.byNeighbours': 'reported by {n} neighbours',
  'rc.print': 'Print the report card',
  'rc.posters': 'QR posters for the corridor',
  'rc.daysShort': 'days on average',
  'rc.notYet': 'not yet',
  // posters
  'qr.kicker': 'Report it where you see it',
  'qr.title': 'QR posters for the corridor',
  'qr.lead':
    'Print a poster for a shop window, a lamp post or the parkette. Scanning it opens Report a problem with the place already filled in. Works with the live link (a phone cannot open your laptop’s localhost).',
  'qr.print': 'Print this poster',
  'qr.printAll': 'Print all posters',
  'qr.open': 'Open the poster',
  'qr.all': 'All posters',
  'qr.posterTitle': 'See a problem here?',
  'qr.posterLead': 'Scan to tell the people who fix it. Nothing to install.',
  'qr.posterSteps': 'Point your phone camera at the code, sign in, choose the problem, and send.',
  'qr.alt': 'QR code: report a problem at {place}',
  'qr.loading': 'Making the code…',
  'login.title': 'Sign in to Neighbr',
  'login.lead': 'PinPoint for Wyandotte St E. Sign in to report problems, follow requests and talk with neighbours.',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.show': 'Show',
  'login.hide': 'Hide',
  'login.showLabel': 'Show password',
  'login.hideLabel': 'Hide password',
  'login.submit': 'Sign in',
  'login.demoTitle': 'Demo accounts',
  'login.demoNote': 'Every demo person has an account. The password is {pw} for everyone, and {apw} for the admin.',
  'login.admin': 'Switches between everyone for the demo',
  'login.use': 'Use',
  'login.useLabel': 'Fill in the account for {who}',
  'login.errorsTitle': 'Fix these to sign in:',
  'login.triesLeft': '{n} tries left before a 30-second wait.',
  'login.err.emailEmpty': 'Enter your email.',
  'login.err.emailFormat': 'Enter an email like name@example.com.',
  'login.err.passwordEmpty': 'Enter your password.',
  'login.err.passwordShort': 'Passwords have at least 8 characters.',
  'login.err.wrong': 'That email and password don’t match an account.',
  'login.err.locked': 'Too many tries. Wait {s} seconds, then try again.',
  'login.demoOnly': 'Demo sign-in: these accounts ship with the prototype. Neighbr’s real sign-in replaces this.',
  'login.afterSignIn': 'After you sign in, the form you opened will be waiting.',
  'strip.signedInAs': 'Signed in as',
  'strip.signOut': 'Sign out',
  'strip.admin': 'Admin',
} as const;

export type MsgKey = keyof typeof EN;

const FR: Record<MsgKey, string> = {
  'nav.map': 'Carte',
  'nav.requests': 'Demandes',
  'nav.community': 'Communauté',
  'nav.updates': 'Nouvelles',
  'nav.chats': 'Messages',
  'nav.marketplace': 'Marché',
  'nav.review': 'Révision',
  'strip.region': 'Connexion de démonstration',
  'strip.demo': 'Démo',
  'strip.viewingAs': 'Vu par',
  'strip.note': 'La connexion est simulée pour qu’une même demande soit suivie par tout le monde.',
  'strip.profile': 'Votre profil',
  'strip.signup': 'S’inscrire sous un autre profil',
  'strip.reset': 'Réinitialiser',
  'strip.tour': 'Visite',
  'strip.language': 'Langue',
  'group.people': 'Résidents et commerces',
  'group.organizations': 'Organismes',
  'group.staff': 'Personnel qui traite les demandes',
  'live.updated': 'Mis à jour depuis une autre fenêtre',
  'wl.kicker': 'Neighbr pour Olde Riverside, Windsor',
  'wl.title1': 'Votre rue,',
  'wl.title2': 'sur une seule carte.',
  'wl.lead':
    'Signalez un lampadaire brisé et suivez-le jusqu’à la réparation. Voyez ce qui se passe cette semaine, encouragez vos commerces et recevez les nouvelles de la Ville, de l’école et de votre conseiller, au même endroit.',
  'wl.p1': 'Les demandes vont directement aux personnes qui réparent',
  'wl.p2': 'Vous décidez de ce que vos voisins peuvent voir',
  'wl.p3': 'Résidents, commerces, groupes et la Ville dans une seule application',
  'wl.tour': 'Faire la visite de 2 minutes',
  'wl.reportCard': 'Voir comment va la rue',
  'wl.current': 'Actuel',
  'wl.pinFixed': 'Lampadaire réparé',
  'wl.pinMarket': 'Marché du vendredi',
  'wl.pinOpen': 'Nous sommes ouverts',
  'wl.chooseTitle': 'Vous vous joignez en tant que…',
  'wl.chooseLead': 'Choisissez un profil. Vous arrivez sur la page faite pour vous, et vous pouvez changer en tout temps avec',
  'wl.chooseLead2': 'L’inscription est simulée pour la démo.',
  'rp.title': 'Signaler un problème',
  'rp.short': 'Signaler',
  'rp.lead': 'Prévenez les responsables d’un problème dans votre rue.',
  'rp.describe': 'Décrivez-le dans vos mots (facultatif)',
  'rp.describeHint': 'Par exemple « le lampadaire près de la boulangerie est éteint ». Nous suggérons le problème et l’endroit.',
  'rp.suggest': 'On dirait',
  'rp.suggestNear': 'près de',
  'rp.useSuggestion': 'Utiliser',
  'rp.noSuggestion': 'Pas encore de suggestion : choisissez le problème ci-dessous.',
  'rp.what': 'Quel est le problème?',
  'rp.where': 'Où est-ce?',
  'rp.chooseNearest': 'Choisissez l’endroit le plus proche',
  'rp.pick': 'Ou choisissez l’endroit sur la carte',
  'rp.photo': 'Photo (facultatif)',
  'rp.addPhoto': 'Ajouter une photo',
  'rp.addPhotoHint': 'Elle aide l’équipe à le trouver. Redimensionnée pour vous.',
  'rp.details': 'Détails (facultatif)',
  'rp.who': 'Qui peut le voir?',
  'rp.private': 'Envoyer en privé',
  'rp.privateHint': 'Seulement vous et les personnes qui s’en occupent',
  'rp.public': 'Publier sur la carte',
  'rp.publicHint': 'Les voisins peuvent le voir et suivre où il en est',
  'rp.fromQr': 'Ouvert depuis une affiche à',
  'rp.goesTo': 'Envoyé à',
  'rp.copyTo': 'avec copie à',
  'rp.publicNote': 'Public : envoyé à {to} et affiché sur la carte pour tout le monde, avec son suivi.',
  'rp.privateNote': 'Privé : seulement vous et {to} le voyez.',
  'rp.chooseFirst': 'Choisissez un problème pour voir à qui il est envoyé.',
  'rp.send': 'Envoyer le signalement',
  'rp.sending': 'Envoi…',
  'rp.cancel': 'Annuler',
  'rp.charsLeft': '{n} caractères restants',
  'rp.details2': 'Détails',
  'rp.sentTitle': 'Signalement envoyé',
  'rp.seeOnMap': 'Voir sur la carte',
  'rp.track': 'Suivre dans Demandes',
  'rp.done': 'Terminé',
  'rp.example': 'p. ex. Le lampadaire est éteint depuis trois nuits.',
  'tour.label': 'Visite guidée',
  'tour.step': 'Étape {n} de {total}',
  'tour.next': 'Suivant',
  'tour.back': 'Retour',
  'tour.finish': 'Terminer',
  'tour.close': 'Fermer la visite',
  'tour.as': 'Vu par',
  'rc.kicker': 'Bulletin du corridor',
  'rc.title': 'Comment va la rue Wyandotte Est',
  'rc.lead': 'Toutes les demandes envoyées par Neighbr sur le corridor, comptées. Les demandes privées sont comptées ici, jamais montrées. Données d’exemple.',
  'rc.sent': 'demandes envoyées',
  'rc.resolvedPct': 'résolues',
  'rc.avgDays': 'jours en moyenne pour réparer',
  'rc.fixedPct': 'des personnes disent que c’est vraiment réparé',
  'rc.support': 'appuis de voisins au lieu d’un doublon',
  'rc.supportOne': 'appui d’un voisin au lieu d’un doublon',
  'rc.orgLine': '{done} sur {n} réglées',
  'rc.open': 'toujours en cours',
  'rc.kinds': 'Ce que les voisins signalent',
  'rc.who': 'Qui s’en occupe',
  'rc.fixed': 'Réparé récemment',
  'rc.fixedNone': 'Rien de réparé pour l’instant.',
  'rc.byNeighbours': 'signalé par {n} voisins',
  'rc.print': 'Imprimer le bulletin',
  'rc.posters': 'Affiches QR pour le corridor',
  'rc.daysShort': 'jours en moyenne',
  'rc.notYet': 'pas encore',
  'qr.kicker': 'Signalez-le là où vous le voyez',
  'qr.title': 'Affiches QR pour le corridor',
  'qr.lead':
    'Imprimez une affiche pour une vitrine, un lampadaire ou la placette. En la balayant, on ouvre Signaler un problème avec l’endroit déjà rempli. Fonctionne avec le lien en ligne (un téléphone ne peut pas ouvrir le localhost de votre ordinateur).',
  'qr.print': 'Imprimer cette affiche',
  'qr.printAll': 'Imprimer toutes les affiches',
  'qr.open': 'Ouvrir l’affiche',
  'qr.all': 'Toutes les affiches',
  'qr.posterTitle': 'Un problème ici?',
  'qr.posterLead': 'Balayez pour prévenir les personnes qui réparent. Rien à installer.',
  'qr.posterSteps': 'Pointez l’appareil photo de votre téléphone vers le code, connectez-vous, choisissez le problème et envoyez.',
  'qr.alt': 'Code QR : signaler un problème à {place}',
  'qr.loading': 'Création du code…',
  'login.title': 'Se connecter à Neighbr',
  'login.lead': 'PinPoint pour la rue Wyandotte Est. Connectez-vous pour signaler des problèmes, suivre vos demandes et parler avec vos voisins.',
  'login.email': 'Courriel',
  'login.password': 'Mot de passe',
  'login.show': 'Afficher',
  'login.hide': 'Masquer',
  'login.showLabel': 'Afficher le mot de passe',
  'login.hideLabel': 'Masquer le mot de passe',
  'login.submit': 'Se connecter',
  'login.demoTitle': 'Comptes de démonstration',
  'login.demoNote': 'Chaque personne de la démo a un compte. Le mot de passe est {pw} pour tout le monde, et {apw} pour l’administrateur.',
  'login.admin': 'Passe d’une personne à l’autre pour la démo',
  'login.use': 'Utiliser',
  'login.useLabel': 'Remplir le compte de {who}',
  'login.errorsTitle': 'Corrigez ceci pour vous connecter :',
  'login.triesLeft': 'Encore {n} essais avant une attente de 30 secondes.',
  'login.err.emailEmpty': 'Entrez votre courriel.',
  'login.err.emailFormat': 'Entrez un courriel comme nom@exemple.com.',
  'login.err.passwordEmpty': 'Entrez votre mot de passe.',
  'login.err.passwordShort': 'Les mots de passe ont au moins 8 caractères.',
  'login.err.wrong': 'Ce courriel et ce mot de passe ne correspondent à aucun compte.',
  'login.err.locked': 'Trop d’essais. Attendez {s} secondes, puis réessayez.',
  'login.demoOnly': 'Connexion de démonstration : ces comptes font partie du prototype. La vraie connexion de Neighbr la remplacera.',
  'login.afterSignIn': 'Après la connexion, le formulaire ouvert vous attendra.',
  'strip.signedInAs': 'Connecté en tant que',
  'strip.signOut': 'Se déconnecter',
  'strip.admin': 'Admin',
};

/** Problem types in French, by id (Report a problem). */
export const TYPE_FR: Record<string, { label: string; why: string }> = {
  pothole: { label: 'Nid-de-poule ou chaussée abîmée', why: 'Les routes sont réparées par la Ville. Votre conseiller reçoit une copie.' },
  streetlight: { label: 'Lampadaire éteint', why: 'Les lampadaires sont réparés par la Ville. Votre conseiller reçoit une copie.' },
  sidewalk: { label: 'Problème de trottoir', why: 'Les trottoirs sont entretenus par la Ville. Votre conseiller reçoit une copie.' },
  garbage: { label: 'Ordures ou recyclage', why: 'Les ordures et le recyclage relèvent de la Ville.' },
  park: { label: 'Parc ou arbre', why: 'Votre conseiller fait le suivi des parcs avec la Ville.' },
  other: { label: 'Autre chose', why: 'Votre conseiller peut le transmettre à la bonne personne.' },
  access: { label: 'Travaux ou accès qui bloquent mon commerce', why: 'Votre ZAC fait le suivi avec la Ville et peut publier un avis.' },
  'business-update': { label: 'Déménagement, nouvelles heures ou fermeture', why: 'Votre ZAC tient le répertoire du corridor à jour.' },
  corridor: { label: 'Problème sur le corridor (éclairage, déchets, sécurité)', why: 'Votre ZAC s’occupe du corridor et contacte la Ville au besoin.' },
  'other-business': { label: 'Autre chose', why: 'Votre ZAC peut le transmettre à la bonne personne.' },
};

/** Error and status messages from the rules (English) and their French. */
const MESSAGES_FR: Record<string, string> = {
  'Choose what the problem is.': 'Choisissez le problème.',
  'Choose where it is, from the list or on the map.': 'Choisissez l’endroit, dans la liste ou sur la carte.',
  'Describe the problem in a few words.': 'Décrivez le problème en quelques mots.',
};

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangState>({ lang: 'en', setLang: () => undefined });

function savedLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(savedLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage blocked: the choice lasts until refresh */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  return useContext(LangContext);
}

/** Look up a message in the current language. {name} placeholders are filled from vars. */
export function translate(lang: Lang, key: MsgKey, vars?: Record<string, string | number>): string {
  let s: string = lang === 'fr' ? FR[key] : EN[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const { lang } = useLang();
  return useCallback((key: MsgKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

/** A rule's message (written in English) in the current language, when we have a translation. */
export function translateMessage(lang: Lang, message: string): string {
  return lang === 'fr' ? MESSAGES_FR[message] ?? message : message;
}

/** Every English key has a French one (checked by the tests). */
export const MESSAGE_KEYS = Object.keys(EN) as MsgKey[];
export const FRENCH = FR;
