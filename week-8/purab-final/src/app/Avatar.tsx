// Pitch redesign (Week 8): one avatar for people, organizations and conversations, used by Chats,
// the notification bell, Community, Requests and the Review queue. Decorative: the name is always
// written next to it, so it is hidden from screen readers.
import { Icon, type IconName } from './Icon';

export type AvatarTone = 'river' | 'moss' | 'amber' | 'plum' | 'sky' | 'brick' | 'night' | 'lamp';

const TONES: AvatarTone[] = ['river', 'moss', 'amber', 'plum', 'sky', 'brick'];

/** The same name always gets the same colour. */
export function toneFor(name: string): AvatarTone {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** "Maya R." -> "MR", "City of Windsor 311 (demo)" -> "CW". */
export function initialsOf(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(of|the|and|for|de)$/i.test(w));
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  icon,
  tone,
  size = 40,
  className,
}: {
  name: string;
  icon?: IconName;
  tone?: AvatarTone;
  size?: number;
  className?: string;
}) {
  const t = tone ?? toneFor(name);
  return (
    <span
      className={`av av--${t}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
      // initials are drawn by CSS (::before), so they never become part of the page's text
      data-initials={icon ? undefined : initialsOf(name)}
    >
      {icon ? <Icon name={icon} size={Math.round(size * 0.5)} /> : null}
    </span>
  );
}
