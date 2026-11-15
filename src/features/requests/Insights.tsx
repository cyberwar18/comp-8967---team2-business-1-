// Sprint 6 (Bhavana): Corridor pulse and the board report, for the City, the BIA and the councillor.
// The numbers come from the requests they handle (or get copies of): what kind, where, how fast,
// what is late, and whether the people who sent them say they were fixed.
import { useState } from 'react';
import { boardReport, summarize, type PlaceLike } from './insightsData';
import type { Persona, ServiceRequest } from './requests';

interface Props {
  persona: Persona;
  list: ServiceRequest[];
  places: PlaceLike[];
  orgName: string;
  now?: Date;
}

/** A small map of where requests cluster: one circle per place, sized by how many. */
function PulseMap({ spots }: { spots: ReturnType<typeof summarize>['hotspots'] }) {
  if (spots.length === 0) return <p className="rq-muted">No requests with a place yet.</p>;
  const W = 520;
  const H = 180;
  const pad = 30;
  const lngs = spots.map((s) => s.lng);
  const lats = spots.map((s) => s.lat);
  const [minX, maxX, minY, maxY] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  const x = (lng: number) => pad + ((lng - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  const y = (lat: number) => H - pad - ((lat - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const max = Math.max(...spots.map((s) => s.count));
  return (
    <svg className="in-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Where requests cluster: ${spots.map((s) => `${s.name} ${s.count}`).join(', ')}`}>
      <line x1={pad / 2} y1={H / 2 + 10} x2={W - pad / 2} y2={H / 2 - 10} className="in-street" />
      <text x={W - pad} y={H / 2 - 18} className="in-street-label" textAnchor="end">
        Wyandotte St E
      </text>
      {spots.map((s) => (
        <g key={s.placeId}>
          <circle cx={x(s.lng)} cy={y(s.lat)} r={8 + (s.count / max) * 18} className="in-spot" />
          <text x={x(s.lng)} y={y(s.lat) + 4} textAnchor="middle" className="in-spot-n">
            {s.count}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Insights({ persona, list, places, orgName, now = new Date() }: Props) {
  const [showReport, setShowReport] = useState(false);
  const i = summarize(list, places, now);
  const report = boardReport(orgName, i, list, now);
  const maxCat = Math.max(1, ...i.byCategory.map((c) => c.count));

  return (
    <div className="in">
      <section className="rq-list in-panel" aria-labelledby="in-title">
        <p className="rq-eyebrow">Corridor pulse</p>
        <h1 id="in-title" className="rq-h1">
          {orgName}: how requests are going
        </h1>
        <p className="rq-muted">
          {persona.kind === 'copy' ? 'Requests you get a copy of, across the ward.' : 'Every request sent to you, open and closed.'} Illustrative sample data.
        </p>

        <ul className="in-kpis" aria-label="Key numbers">
          <li>
            <strong>{i.open}</strong> open
          </li>
          <li className={i.overdue ? 'is-alert' : undefined}>
            <strong>{i.overdue}</strong> overdue
          </li>
          <li>
            <strong>{i.avgDaysToResolve ?? '–'}</strong> days on average to resolve
          </li>
          <li>
            <strong>{i.fixedRate !== null ? `${i.fixedRate}%` : '–'}</strong> say it was fixed{i.rated ? ` (${i.rated} rated)` : ''}
          </li>
          <li>
            <strong>{i.supporters}</strong> times neighbours added support
          </li>
          <li>
            <strong>{i.thisMonth}</strong> this month <span className="in-sub">({i.lastMonth} last month)</span>
          </li>
        </ul>

        <div className="in-grid">
          <section aria-labelledby="in-cat">
            <h2 id="in-cat" className="in-h2">
              What kind
            </h2>
            <ul className="in-bars">
              {i.byCategory.map((c) => (
                <li key={c.category}>
                  <span className="in-bar-label">{c.category}</span>
                  <span className="in-bar" aria-hidden="true">
                    <span style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </span>
                  <span className="in-bar-n">
                    {c.count} <span className="in-sub">({c.open} open)</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="in-where">
            <h2 id="in-where" className="in-h2">
              Where they cluster
            </h2>
            <PulseMap spots={i.hotspots} />
            <ol className="in-top">
              {i.hotspots.slice(0, 3).map((h) => (
                <li key={h.placeId}>
                  {h.name}: {h.count} {h.count === 1 ? 'report' : 'reports'}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {i.mostSupported && (
          <p className="in-note">
            Most supported: <strong>{i.mostSupported.title}</strong>, reported by {1 + (i.mostSupported.supporters?.length ?? 0)} neighbours.
          </p>
        )}

        <div className="rq-btns">
          <button type="button" className="rq-btn rq-btn--primary" aria-expanded={showReport} onClick={() => setShowReport((v) => !v)}>
            {showReport ? 'Hide board report' : 'Board report'}
          </button>
          {showReport && (
            <button type="button" className="rq-btn" onClick={() => typeof window.print === 'function' && window.print()}>
              Print or save as PDF
            </button>
          )}
        </div>
      </section>

      {showReport && (
        <section className="rq-detail in-report" aria-labelledby="in-report-title">
          <p className="rq-eyebrow">One page for the board meeting</p>
          <h2 id="in-report-title" className="rq-title">
            {report.title}
          </h2>
          <h3 className="in-h2">In numbers</h3>
          <ul>
            {report.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <h3 className="in-h2">You said, we did</h3>
          {report.fixed.length ? (
            <ul>
              {report.fixed.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="rq-muted">Nothing resolved yet.</p>
          )}
          <p className="rq-muted">Prepared from Neighbr requests. Names of residents are never included.</p>
        </section>
      )}
    </div>
  );
}
