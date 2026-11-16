// Sprint 5: the Requests section (#/requests).
// The same request, seen from both sides:
//   - a resident or business owner sees "My requests" (Purab)
//   - City 311 or BIA staff see their work queue, the ward councillor sees copies (Bhavana)
// Who you are is picked with "Viewing as" in the top bar (simulated sign-in).
// Opening #/requests?id=req-... selects that request; a request you may not see shows "No access".
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlaces, getRequests, getStaff, markRequestRead, onDataChange, orgNames } from '../../data/api';
import { accessOf } from './requests';
import type { MapItem } from '../search/filters';
import type { Persona, ServiceRequest, StaffMember } from './requests';
import { NoAccess, type RequestContext } from './RequestDetail';
import { MyRequests } from './MyRequests';
import { WorkQueue } from './WorkQueue';
import { Insights } from './Insights';
import './Requests.css';

function idFromHash(): string | null {
  const q = window.location.hash.split('?')[1];
  return q ? new URLSearchParams(q).get('id') : null;
}

export default function RequestsPage({ persona, now }: { persona: Persona; now?: Date }) {
  const [list, setList] = useState<ServiceRequest[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [places, setPlaces] = useState<MapItem[]>([]);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(idFromHash);
  // Sprint 6: an organization that handles requests (the BIA) also sends its own. Two tabs.
  const [tab, setTab] = useState<'queue' | 'sent' | 'insights'>('queue');

  const load = useCallback(() => {
    Promise.all([getRequests(persona), getStaff(), getPlaces()])
      .then(([rs, st, ps]) => {
        setList(rs);
        setStaff(st);
        setPlaces(ps);
      })
      .catch(() => setFailed(true));
  }, [persona]);

  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  // A link like #/requests?id=req-issue-05 opens that request.
  useEffect(() => {
    const onHash = () => setSelectedId(idFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (id: string | null) => {
    setSelectedId(id);
    const url = id ? `#/requests?id=${encodeURIComponent(id)}` : '#/requests';
    if (window.location.hash !== url) window.history.replaceState(null, '', url);
  };

  const ctx: RequestContext = useMemo(
    () => ({
      staff,
      orgs: orgNames(),
      placeName: (id?: string) => {
        const p = places.find((x) => x.id === id);
        return p ? p.name.replace(/\s*\(demo\)/, '') : 'Olde Riverside';
      },
    }),
    [staff, places],
  );

  // Opening one of your own requests marks its notifications as read.
  useEffect(() => {
    if (selectedId) markRequestRead(persona, selectedId);
  }, [selectedId, persona, list]);

  if (failed) return <p className="rq-page rq-error">The requests could not be loaded.</p>;
  if (!list) return <p className="rq-page rq-muted">Loading requests…</p>;

  const selected = list.find((r) => r.id === selectedId) ?? null;
  const denied = selectedId !== null && !selected;
  const sent = list.filter((r) => accessOf(persona, r, staff) === 'requester');
  const handled = list.filter((r) => accessOf(persona, r, staff) !== 'requester');
  const showSent = persona.kind !== 'requester' && (tab === 'sent' || (selected !== null && accessOf(persona, selected, staff) === 'requester'));
  // Sprint 6 (Bhavana): leads and the councillor get Insights (Corridor pulse and the board report).
  const isLead = persona.kind === 'copy' || staff.some((x) => x.id === persona.staffId && x.lead);
  const showInsights = isLead && tab === 'insights' && !selected;

  return (
    <div className="rq-page">
      <p className="rq-demo">
        Demo: sign-in is simulated. Use <strong>Viewing as</strong> in the top bar to follow the same request as the resident, City 311 staff,
        the BIA or the councillor. Changes are kept in this browser until you press Reset demo.
      </p>
      {denied ? (
        <NoAccess persona={persona} onBack={() => select(null)} />
      ) : persona.kind === 'requester' ? (
        <MyRequests persona={persona} list={list} selected={selected} onSelect={select} ctx={ctx} now={now} />
      ) : (
        <>
          {(sent.length > 0 || isLead) && (
            <div className="rq-tabs" role="tablist" aria-label="Requests">
              <button type="button" role="tab" className="rq-tab" aria-selected={!showSent && !showInsights} onClick={() => { setTab('queue'); select(null); }}>
                {persona.kind === 'copy' ? 'Copies' : 'Work queue'} ({handled.length})
              </button>
              {sent.length > 0 && (
                <button type="button" role="tab" className="rq-tab" aria-selected={showSent} onClick={() => { setTab('sent'); select(null); }}>
                  Sent by us ({sent.length})
                </button>
              )}
              {isLead && (
                <button type="button" role="tab" className="rq-tab" aria-selected={showInsights} onClick={() => { setTab('insights'); select(null); }}>
                  Insights
                </button>
              )}
            </div>
          )}
          {showInsights ? (
            <Insights persona={persona} list={handled} places={places} orgName={(ctx.orgs[persona.profileId] ?? persona.label).replace(/\s*\(demo\)/, '')} now={now} />
          ) : showSent ? (
            <MyRequests persona={persona} list={sent} selected={selected} onSelect={select} ctx={ctx} now={now} heading="Requests we sent" />
          ) : (
            <WorkQueue persona={persona} list={handled} selected={selected} onSelect={select} ctx={ctx} />
          )}
        </>
      )}
    </div>
  );
}
