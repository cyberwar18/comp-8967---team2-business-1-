// Week 8 (pitch): "Take the 2-minute tour". Each step switches to the right person and page and
// explains what you are looking at, so a first-time viewer (or Nigel's team) sees the whole journey
// without knowing the demo. The card can be moved through with Back and Next, or closed any time.
import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { useLang, useT } from './i18n';
import { personaById } from '../features/requests/personas';
import './Tour.css';

export interface TourStep {
  persona: string;
  hash: string;
  title: { en: string; fr: string };
  body: { en: string; fr: string };
}

export const TOUR: TourStep[] = [
  {
    persona: 'resident',
    hash: '#/map',
    title: { en: 'One shared map for the street', fr: 'Une seule carte pour la rue' },
    body: {
      en: 'Shops, events, roadwork, Marketplace listings and requests are all on one map of Wyandotte St E. Each pin has its own icon and colour.',
      fr: 'Commerces, événements, travaux, annonces du Marché et demandes sont sur une seule carte de la rue Wyandotte Est. Chaque épingle a son icône et sa couleur.',
    },
  },
  {
    persona: 'resident',
    hash: '#/map?report=place-01',
    title: { en: 'Report a problem in seconds', fr: 'Signaler un problème en quelques secondes' },
    body: {
      en: 'Describe it in your own words and Neighbr suggests the problem and the place. You choose: send it privately, or post it to the map. Here it opened from a QR poster at Rosa’s Bakery.',
      fr: 'Décrivez-le dans vos mots : Neighbr suggère le problème et l’endroit. Vous choisissez : l’envoyer en privé ou le publier sur la carte. Ici, il s’est ouvert depuis une affiche QR à la boulangerie Rosa.',
    },
  },
  {
    persona: 'city-lead',
    hash: '#/requests?id=req-07',
    title: { en: 'The City sees it straight away', fr: 'La Ville le voit tout de suite' },
    body: {
      en: 'City 311 staff get a work queue with due dates and overdue warnings. They assign it to a crew, ask questions and post the outcome. The sender only ever sees “City of Windsor 311”, never staff names.',
      fr: 'Le personnel du 311 a une file de travail avec échéances et retards. Il assigne une équipe, pose des questions et publie le résultat. La personne ne voit que « Ville de Windsor 311 », jamais les noms du personnel.',
    },
  },
  {
    persona: 'parent',
    hash: '#/requests?id=req-07',
    title: { en: 'The sender follows every step', fr: 'La personne suit chaque étape' },
    body: {
      en: 'Maya sees Sent, Received, Being handled and Resolved, and neighbours who added “Me too”. When it is fixed, she answers “Was it fixed?”.',
      fr: 'Maya voit Envoyé, Reçu, En traitement et Résolu, et les voisins qui ont appuyé la demande. Une fois réparé, elle répond « Est-ce vraiment réparé? ».',
    },
  },
  {
    persona: 'parent',
    hash: '#/chats',
    title: { en: 'Talk about it, safely', fr: 'En parler, en toute sécurité' },
    body: {
      en: 'Every request has its own chat with the organization handling it. People choose who can message them, and can block or report anyone.',
      fr: 'Chaque demande a sa conversation avec l’organisme qui s’en occupe. Chacun choisit qui peut lui écrire, et peut bloquer ou signaler.',
    },
  },
  {
    persona: 'resident',
    hash: '#/marketplace',
    title: { en: 'Buy, sell and give locally', fr: 'Acheter, vendre et donner près de chez soi' },
    body: {
      en: 'Neighbours and shops post items, services and offers. Sellers meet at public spots, never at a home, and posts leave the map when they end.',
      fr: 'Voisins et commerces publient objets, services et offres. On se rencontre dans des lieux publics, jamais à la maison, et les annonces quittent la carte à leur fin.',
    },
  },
  {
    persona: 'community-organizer',
    hash: '#/community',
    title: { en: 'Groups run their own events', fr: 'Les groupes gèrent leurs événements' },
    body: {
      en: 'Priya’s group plans events and volunteers. An event in a park needs a permit, approved by the organizer and then by Neighbr staff, before it goes on the map.',
      fr: 'Le groupe de Priya organise événements et bénévoles. Un événement dans un parc demande un permis, approuvé par l’organisatrice puis par Neighbr, avant d’aller sur la carte.',
    },
  },
  {
    persona: 'neighbr-staff',
    hash: '#/review',
    title: { en: 'Neighbr staff keep it safe', fr: 'Le personnel de Neighbr veille à la sécurité' },
    body: {
      en: 'Permits and anything people report (chats, listings, posts) come to one review queue, with a clear decision and a notification for everyone involved.',
      fr: 'Les permis et tout ce qui est signalé (messages, annonces, publications) arrivent dans une seule file, avec une décision claire et un avis à chaque personne concernée.',
    },
  },
  {
    persona: 'resident',
    hash: '#/report-card',
    title: { en: 'Everyone sees how the street is doing', fr: 'Tout le monde voit comment va la rue' },
    body: {
      en: 'The public report card: how fast things get fixed, what neighbours report, and what was fixed recently. Private requests are counted, never shown.',
      fr: 'Le bulletin public : la vitesse des réparations, ce que les voisins signalent et ce qui a été réparé. Les demandes privées sont comptées, jamais montrées.',
    },
  },
  {
    persona: 'resident',
    hash: '#/map',
    title: { en: 'Now try it yourself', fr: 'À vous d’essayer' },
    body: {
      en: 'Switch person with Viewing as at the top. Open the app in two windows, the resident in one and City staff in the other: what one does appears in the other straight away.',
      fr: 'Changez de personne avec « Vu par » en haut. Ouvrez l’application dans deux fenêtres, résident d’un côté et Ville de l’autre : ce que fait l’un apparaît aussitôt chez l’autre.',
    },
  },
];

interface Props {
  step: number;
  onStep: (n: number) => void;
  onClose: () => void;
}

export function TourCard({ step, onStep, onClose }: Props) {
  const t = useT();
  const { lang } = useLang();
  const s = TOUR[step];
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!s) return null;
  const who = personaById(s.persona);
  const last = step === TOUR.length - 1;
  return (
    <section className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div className="tour-top">
        <span className="tour-badge">
          <Icon name="sparkle" size={14} />
          {t('tour.label')}
        </span>
        <span className="tour-count">{t('tour.step', { n: step + 1, total: TOUR.length })}</span>
        <button type="button" className="tour-x" aria-label={t('tour.close')} onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </div>
      <h2 id="tour-title" className="tour-title" tabIndex={-1} ref={titleRef}>
        {s.title[lang]}
      </h2>
      <p id="tour-body" className="tour-body">
        {s.body[lang]}
      </p>
      <p className="tour-as">
        {t('tour.as')}: <strong>{who.label.replace(/\s*\(demo\)/, '')}</strong>, {who.title.split(',')[0]}
      </p>
      <div className="tour-dots" aria-hidden="true">
        {TOUR.map((_, i) => (
          <span key={i} className={i === step ? 'is-on' : i < step ? 'is-done' : undefined} />
        ))}
      </div>
      <div className="tour-actions">
        <button type="button" className="tour-btn" onClick={() => onStep(step - 1)} disabled={step === 0}>
          <Icon name="arrowLeft" size={16} />
          {t('tour.back')}
        </button>
        <button type="button" className="tour-btn tour-btn--primary" onClick={() => (last ? onClose() : onStep(step + 1))}>
          {last ? t('tour.finish') : t('tour.next')}
          {!last && <Icon name="arrowRight" size={16} />}
        </button>
      </div>
    </section>
  );
}
