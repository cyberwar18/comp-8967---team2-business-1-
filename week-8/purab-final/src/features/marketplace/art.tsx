// KAN-53 (Devu): small drawn pictures for the sample listings, so the demo needs no photo files.
// A seller's own photo replaces the picture. Each one is a simple line drawing on a soft background.
import type { ReactNode } from 'react';
import type { ArtId, ListingCategory } from './marketplace';

const DRAW: Record<ArtId, ReactNode> = {
  bike: (
    <>
      <circle cx="16" cy="42" r="10" />
      <circle cx="48" cy="42" r="10" />
      <path d="M16 42 26 24h14l8 18M26 24l8 18h-18M24 20h8M40 24l-3-6h7" />
    </>
  ),
  shelf: (
    <>
      <rect x="12" y="8" width="40" height="48" rx="2" />
      <path d="M12 24h40M12 40h40M20 24v-9M28 24v-12M36 24v-8M24 40v-10M33 40v-13M42 40v-8" />
    </>
  ),
  blower: (
    <>
      <rect x="10" y="32" width="30" height="16" rx="3" />
      <path d="M40 38h12l4-14M46 24h14M16 52a4 4 0 1 0 .1 0M34 52a4 4 0 1 0 .1 0M22 32v-8h8" />
    </>
  ),
  coat: (
    <>
      <path d="M22 10 32 16l10-6 12 10-6 8-6-4v32H22V24l-6 4-6-8L22 10Z" />
      <path d="M32 16v40M27 30h2M27 38h2" />
    </>
  ),
  boxes: (
    <>
      <path d="M8 26 32 14l24 12v22L32 60 8 48V26Z" />
      <path d="M8 26l24 12 24-12M32 38v22M20 20l24 12" />
    </>
  ),
  plant: (
    <>
      <path d="M22 42h20l-3 16H25l-3-16Z" />
      <path d="M32 42V22M32 30c-10 0-14-8-14-14 10 0 14 6 14 14M32 24c8 0 12-6 12-12-9 0-12 5-12 12" />
    </>
  ),
  books: (
    <>
      <rect x="10" y="12" width="12" height="40" rx="1" />
      <rect x="24" y="18" width="12" height="34" rx="1" />
      <path d="m40 22 11-3 8 33-11 3-8-33ZM14 20h4M28 26h4" />
    </>
  ),
  ladder: (
    <>
      <path d="M20 6 14 58M44 6l6 52M17 20h28M16 32h31M15 44h33" />
    </>
  ),
  table: (
    <>
      <path d="M8 24h48v6H8v-6ZM14 30l-4 26M50 30l4 26M22 30v20M42 30v20" />
    </>
  ),
  shovel: (
    <>
      <path d="M44 6 30 34M26 30l-8 6 6 20 20-8-6-14-12-4ZM40 12l8 4" />
    </>
  ),
  pencil: (
    <>
      <path d="m10 54 4-14L44 10l10 10-30 30-14 4ZM38 16l10 10M14 40l10 10" />
    </>
  ),
  wrench: (
    <>
      <path d="M44 8a12 12 0 0 0-11 16L10 47l7 7 23-23a12 12 0 0 0 16-11l-8 8-7-2-2-7 8-8c-1-1-2-1-3-1Z" />
    </>
  ),
  bread: (
    <>
      <path d="M10 36c0-12 10-20 22-20s22 8 22 20v14H10V36Z" />
      <path d="M22 26l4 8M32 24l4 8M42 26l-4 8" />
    </>
  ),
  cup: (
    <>
      <path d="M12 24h34v14a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14V24ZM46 28h4a6 6 0 0 1 0 12h-5M22 10c0 4 3 4 3 8M32 10c0 4 3 4 3 8" />
    </>
  ),
};

// Pitch redesign (Week 8): each kind has a background, a lighter spotlight, a mid "print" colour
// for the offset layer and a deep ink for the drawing, so the tiles read like product shots.
const TINT: Record<ListingCategory, { bg: string; spot: string; print: string; ink: string }> = {
  sale: { bg: '#dcecf1', spot: '#f1f8fa', print: '#9cc9d6', ink: '#0d5f73' },
  free: { bg: '#dcefe3', spot: '#f2faf5', print: '#9fd3b4', ink: '#1f6a45' },
  wanted: { bg: '#f8e6cf', spot: '#fdf5ea', print: '#efc48d', ink: '#8a4705' },
  service: { bg: '#e6e1f3', spot: '#f6f3fc', print: '#bfb2e3', ink: '#4d2d85' },
  business: { bg: '#f6ebc8', spot: '#fcf7e6', print: '#ecd27f', ink: '#6a5300' },
};

export const ART_NAME: Record<ArtId, string> = {
  bike: 'a bicycle',
  shelf: 'a bookshelf',
  blower: 'a snow blower',
  coat: 'a winter coat',
  boxes: 'cardboard boxes',
  plant: 'a houseplant',
  books: 'picture books',
  ladder: 'a ladder',
  table: 'a folding table',
  shovel: 'a snow shovel',
  pencil: 'a pencil',
  wrench: 'a wrench',
  bread: 'a loaf of bread',
  cup: 'a cup of coffee',
};

/** The picture for a listing without a photo. It has a short text label for screen readers. */
export function ListingArt({ art, category, className }: { art: ArtId; category: ListingCategory; className?: string }) {
  const t = TINT[category];
  return (
    <svg className={className} viewBox="0 0 160 120" role="img" aria-label={`Drawing of ${ART_NAME[art]}`} style={{ background: t.bg }}>
      {/* a soft spotlight and a floor line, like a product photo */}
      <circle cx="80" cy="56" r="44" fill={t.spot} />
      <ellipse cx="80" cy="99" rx="34" ry="5" fill={t.ink} opacity="0.12" />
      {/* the drawing: an offset print layer, then the ink line on top */}
      <g transform="translate(51 26) scale(0.9)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(3 3)" stroke={t.print} strokeWidth="5">
          {DRAW[art]}
        </g>
        <g stroke={t.ink} strokeWidth="2.6">
          {DRAW[art]}
        </g>
      </g>
    </svg>
  );
}
