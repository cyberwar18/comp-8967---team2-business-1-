// Sprint 6 (Bhavana): notifications for the person who sent a request.
// A bell in the top bar: "City of Windsor 311 asked you a question", "…marked it resolved",
// "Ward Councillor commented". Clicking one opens the request; opening a request marks it read.
import { useEffect, useId, useRef, useState } from 'react';
import { getNotifications, markNotificationRead, onDataChange, type DemoNotification } from '../data/api';
import { formatAt, type Persona } from '../features/requests/requests';

export function NotificationBell({ persona }: { persona: Persona }) {
  const [items, setItems] = useState<DemoNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const load = () => getNotifications(persona).then((n) => live && setItems(n));
    load();
    const off = onDataChange(load);
    return () => {
      live = false;
      off();
    };
  }, [persona]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="nb" ref={wrap}>
      <button
        type="button"
        className="nb-bell"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? `Notifications, ${unread > 9 ? "9+" : unread} new` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8m4 12a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="nb-count" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="nb-panel" role="region" aria-label="Notifications">
          <p className="nb-head">Notifications</p>
          {items.length === 0 ? (
            <p className="nb-empty">Nothing yet. When someone answers a request you sent, it shows here.</p>
          ) : (
            <ul>
              {items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <a
                    href={n.href}
                    className={`nb-item${n.read ? '' : ' is-new'}`}
                    onClick={() => {
                      if (!n.requestId) markNotificationRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <strong>{n.text}</strong>
                    <span>{n.title}</span>
                    <span className="nb-time">
                      {n.read ? '' : 'New · '}
                      {formatAt(n.at)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
