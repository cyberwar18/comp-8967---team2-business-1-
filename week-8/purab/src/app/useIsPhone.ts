// True when the screen is phone-sized. Used to switch the layout (bottom nav, bottom sheet,
// layers closed by default). Matches the 720px breakpoint used in the CSS files.
import { useEffect, useState } from 'react';

export const PHONE_QUERY = '(max-width: 720px)';

export function isPhoneNow(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
}

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(isPhoneNow);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}
