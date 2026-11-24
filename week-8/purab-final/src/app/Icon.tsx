// Pitch redesign (Week 8): one icon set for the whole app, drawn on a 24-unit grid with the same
// stroke, so Marketplace, Chats, Requests, Community and the rest look like one product.
// Icons are decorative (aria-hidden): every one sits next to words that say the same thing.
import type { CSSProperties, ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  map: <><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" /><path d="M9 4v13.5M15 6.5V20" /></>,
  inbox: <><path d="M4 13.5 6.4 6A2 2 0 0 1 8.3 4.6h7.4A2 2 0 0 1 17.6 6l2.4 7.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4.5Z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></>,
  bell: <><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5l1.5-2Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>,
  chat: <><path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L3.5 20l1.4-4.9A8 8 0 1 1 20.5 11.5Z" /></>,
  shop: <><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" /></>,
  shield: <><path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-2.5Z" /><path d="m9 12 2 2 4-4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20.5c.8-4 4-6 8-6s7.2 2 8 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  send: <><path d="M20.5 3.5 10 14" /><path d="m20.5 3.5-6.5 17-4-6.5-6.5-4 17-6.5Z" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  tag: <><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7-8.3-8.3Z" /><circle cx="8" cy="8" r="1.4" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8.5h14V12M12 8v12.5M12 8C9.5 8 7 7 7 5.2 7 3 10.5 3.5 12 8Zm0 0c2.5 0 5-1 5-2.8C17 3 13.5 3.5 12 8Z" /></>,
  hand: <><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5-2.7 0-4.2-1.3-5.6-3.6L3.8 14a1.5 1.5 0 0 1 2.4-1.7L8 14" /></>,
  wrench: <path d="M14.5 6.5a4 4 0 0 0 5 5L20.5 10l-3-3-1.5-.5-1.5.5-.5 1.5.5 1.5Zm0 0L4.5 16.5a2.1 2.1 0 0 0 3 3l10-10" />,
  store: <><path d="M3.5 10V20h17V10M2.5 10 5 4h14l2.5 6h-19Z" /><path d="M9 20v-5h6v5" /></>,
  bulb: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" /></>,
  cone: <><path d="M10 4h4l4.5 14h-13L10 4Z" /><path d="M8.3 10h7.4M7 14h10M3.5 20.5h17" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /><path d="M10.5 11v5.5M13.5 11v5.5" /></>,
  tree: <><path d="M12 21v-5M12 16c-4.5 0-7-2.3-7-5.3 0-2.2 1.4-3.6 3-4A4.4 4.4 0 0 1 12 3a4.4 4.4 0 0 1 4 3.7c1.6.4 3 1.8 3 4 0 3-2.5 5.3-7 5.3Z" /></>,
  sidewalk: <><path d="M3.5 20.5 8 3.5M20.5 20.5 16 3.5M12 4v3M12 10.5v3M12 17v3.5" /></>,
  wrenchcog: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></>,
  alert: <><path d="M12 3.5 21.5 20h-19L12 3.5Z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  megaphone: <><path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4.5v-15L7 9H4.5a1 1 0 0 0-1 1Z" /><path d="M17.5 9a4 4 0 0 1 0 6M7.5 15l1.5 5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  poll: <><path d="M5 20V10M12 20V4M19 20v-7" /></>,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.5Z" />,
  flag: <><path d="M5 21V4M5 4.5h11l-2 4 2 4H5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.3 3.5 5.2 3.5 8.5s-1.2 6.2-3.5 8.5c-2.3-2.3-3.5-5.2-3.5-8.5s1.2-6.2 3.5-8.5Z" /></>,
  heart: <path d="M12 20s-8-4.7-8-10.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8 2.8C20 15.3 12 20 12 20Z" />,
  school: <><path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z" /><path d="M6 11v5c1.6 1.6 3.6 2.5 6 2.5s4.4-.9 6-2.5v-5M21.5 9v5" /></>,
  book: <><path d="M4 5.5A2 2 0 0 1 6 3.5h13V18H6a2 2 0 0 0-2 2V5.5Z" /><path d="M4 20a2 2 0 0 0 2 1.5h13V18" /></>,
  building: <><path d="M4.5 20.5V5l8-2v17.5M12.5 8h7v12.5M2.5 20.5h19" /><path d="M7.5 8h2M7.5 11.5h2M7.5 15h2M15.5 11.5h1.5M15.5 15h1.5" /></>,
  sparkle: <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7ZM18.5 15.5c.3 1.9 1 2.6 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.4 2.7-1.1 3-3Z" />,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.8" /><path d="m20.5 16-5-5-9 8.5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  'trend-up': <><path d="m3.5 17 6-6 4 4 7-7.5" /><path d="M15 7.5h5.5V13" /></>,
  printer: <><path d="M7 9V3.5h10V9M7 17.5H5a1.5 1.5 0 0 1-1.5-1.5v-5.5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 1-1.5 1.5h-2" /><path d="M7 14h10v6.5H7z" /></>,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H10" /></>,
  thumb: <><path d="M7.5 10.5v10H4.5v-10h3Z" /><path d="M7.5 10.5 11 3.5c1.4 0 2.5 1.1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7.3a2 2 0 0 1-2 1.7H7.5" /></>,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.3 2.5 2.5 5-5.3" /></>,
  hourglass: <><path d="M6.5 3.5h11M6.5 20.5h11" /><path d="M7.5 3.5c0 4 4.5 5.5 4.5 8.5s-4.5 4.5-4.5 8.5M16.5 3.5c0 4-4.5 5.5-4.5 8.5s4.5 4.5 4.5 8.5" /></>,
  drop: <path d="M12 3.5s6.5 7 6.5 11a6.5 6.5 0 0 1-13 0c0-4 6.5-11 6.5-11Z" />,
  walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="m9 21 2.5-6.5L14 17v4M8 11.5l2.5-3.5 3.5.5 2 3 2.5 1" /><path d="m11.5 14.5.5-5.5" /></>,
  clipboard: <><rect x="5.5" y="4.5" width="13" height="16" rx="2" /><path d="M9 4.5V3.5h6v1M9 10h6M9 13.5h6M9 17h3.5" /></>,
  camera: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-10Z" /><circle cx="12" cy="13" r="3.5" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.5v.01" /></>,
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 9.5v10h12v-10M10 19.5v-5h4v5" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  reply: <><path d="M9.5 8 4.5 12.5l5 4.5" /><path d="M4.5 12.5h9a6 6 0 0 1 6 6v1" /></>,
  layers: <><path d="m12 3.5 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  ticket: <><path d="M3.5 8a2 2 0 0 0 0 4v4.5h17V12a2 2 0 0 1 0-4V3.5h-17V8Z" transform="translate(0 2)" /><path d="M14.5 5.5v13" strokeDasharray="2 2.5" /></>,
  bus: <><rect x="4.5" y="3.5" width="15" height="14" rx="2.5" /><path d="M4.5 11h15M8 20.5v-3M16 20.5v-3" /><circle cx="8" cy="14.3" r=".6" /><circle cx="16" cy="14.3" r=".6" /></>,
  file: <><path d="M6 3.5h8l4.5 4.5v12.5H6V3.5Z" /><path d="M14 3.5V8h4.5" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.5v-.2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.3 1Z" /></>,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 18, className, style, strokeWidth = 1.9 }: { name: IconName; size?: number; className?: string; style?: CSSProperties; strokeWidth?: number }) {
  return (
    <svg
      className={`ic${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {P[name]}
    </svg>
  );
}

/** The icon for a request's category (Street lights, Roads, Garbage and recycling, …). */
export function categoryIcon(category: string): IconName {
  const c = category.toLowerCase();
  if (c.includes('light')) return 'bulb';
  if (c.includes('roadwork') || c.includes('access')) return 'cone';
  if (c.includes('sidewalk')) return 'sidewalk';
  if (c.includes('road') || c.includes('pothole')) return 'cone';
  if (c.includes('garbage') || c.includes('litter') || c.includes('recycl')) return 'trash';
  if (c.includes('park') || c.includes('tree')) return 'tree';
  if (c.includes('business')) return 'store';
  if (c.includes('corridor')) return 'route';
  if (c.includes('maintenance')) return 'wrenchcog';
  return 'flag';
}

/** Icons for the main sections, used in the top bar and the phone tab bar. */
export const SECTION_ICON: Record<string, IconName> = {
  map: 'map',
  requests: 'inbox',
  community: 'users',
  updates: 'bell',
  chats: 'chat',
  marketplace: 'shop',
  review: 'shield',
};
