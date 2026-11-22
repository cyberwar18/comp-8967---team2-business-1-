// Week 8 (pitch): the public Corridor report card (#/report-card).
// How the street is doing, for everyone: how many requests, how fast they get fixed, what people
// report, and what was fixed recently. Private requests are counted but never shown.
import { useEffect, useState } from 'react';
import { getPlaces, getReportCard, onDataChange, type ReportCard } from '../../data/api';
import { Icon, categoryIcon } from '../../app/Icon';
import { useT } from '../../app/i18n';
import { formatAt } from '../requests/requests';
import './Corridor.css';

const plain = (s: string) => s.replace(/\s*\(demo\)/, '');

export function ReportCardPage() {
  const t = useT();
  const [card, setCard] = useState<ReportCard | null>(null);
  const [places, setPlaces] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const load = () =>
      Promise.all([getReportCard(), getPlaces()])
        .then(([c, ps]) => {
          setCard(c);
          setPlaces(Object.fromEntries(ps.map((p) => [p.id, plain(String(p.name))])));
        })
        .catch(() => setFailed(true));
    load();
    return onDataChange(load);
  }, []);

  if (failed) return <p className="cr-status" role="alert">The report card could not be loaded. Try Reset demo in the strip at the top.</p>;
  if (!card) return <p className="cr-status">…</p>;
  const max = Math.max(1, ...card.byCategory.map((c) => c.count));
  const pct = (n: number | null) => (n === null ? t('rc.notYet') : `${n}%`);

  return (
    <div className="cr-page">
      <header className="cr-head">
        <span className="cr-head-ic" aria-hidden="true">
          <Icon name="poll" size={26} />
        </span>
        <div>
          <p className="cr-kicker">{t('rc.kicker')}</p>
          <h1 className="cr-h1">{t('rc.title')}</h1>
          <p className="cr-lead">{t('rc.lead')}</p>
        </div>
        <div className="cr-actions cr-noprint">
          <button type="button" className="cr-btn" onClick={() => window.print()}>
            <Icon name="printer" size={17} />
            {t('rc.print')}
          </button>
          <a className="cr-btn" href="#/posters">
            <Icon name="flag" size={17} />
            {t('rc.posters')}
          </a>
        </div>
      </header>

      <ul className="cr-kpis" aria-label={t('rc.kicker')}>
        <li className="cr-kpi cr-kpi--lead">
          <strong>{card.avgDaysToResolve ?? t('rc.notYet')}</strong>
          <span>{t('rc.avgDays')}</span>
        </li>
        <li className="cr-kpi">
          <strong>{card.total}</strong>
          <span>{t('rc.sent')}</span>
        </li>
        <li className="cr-kpi">
          <strong>{pct(card.resolvedPct)}</strong>
          <span>{t('rc.resolvedPct')}</span>
        </li>
        <li className="cr-kpi">
          <strong>{pct(card.fixedRate)}</strong>
          <span>{t('rc.fixedPct')}</span>
        </li>
        <li className="cr-kpi">
          <strong>{card.supporters}</strong>
          <span>{card.supporters === 1 ? t('rc.supportOne') : t('rc.support')}</span>
        </li>
        <li className="cr-kpi">
          <strong>{card.open}</strong>
          <span>{t('rc.open')}</span>
        </li>
      </ul>

      <div className="cr-grid">
        <section className="cr-card" aria-labelledby="cr-kinds">
          <h2 id="cr-kinds" className="cr-h2">
            {t('rc.kinds')}
          </h2>
          <ul className="cr-bars">
            {card.byCategory.map((c) => (
              <li key={c.category}>
                <span className="cr-bar-ic" aria-hidden="true">
                  <Icon name={categoryIcon(c.category)} size={16} />
                </span>
                <span className="cr-bar-label">{c.category}</span>
                <span className="cr-bar" aria-hidden="true">
                  <span style={{ width: `${(c.count / max) * 100}%` }} />
                </span>
                <span className="cr-bar-n">{c.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cr-card" aria-labelledby="cr-who">
          <h2 id="cr-who" className="cr-h2">
            {t('rc.who')}
          </h2>
          <ul className="cr-orgs">
            {card.byOrganization.map((o) => (
              <li key={o.name}>
                <strong>{o.name}</strong>
                <span>
                  {t('rc.orgLine', { done: o.resolved, n: o.count })}{o.avgDays === null ? '' : `, ${o.avgDays} ${t('rc.daysShort')}`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cr-card cr-card--wide" aria-labelledby="cr-fixed">
          <h2 id="cr-fixed" className="cr-h2">
            {t('rc.fixed')}
          </h2>
          {card.fixed.length === 0 ? (
            <p className="cr-muted">{t('rc.fixedNone')}</p>
          ) : (
            <ul className="cr-fixed">
              {card.fixed.map((f) => (
                <li key={f.id}>
                  <span className="cr-fixed-ic" aria-hidden="true">
                    <Icon name="checkCircle" size={20} />
                  </span>
                  <span className="cr-fixed-body">
                    <strong>{f.title}</strong>
                    <span>
                      {f.placeId ? `${places[f.placeId] ?? ''} · ` : ''}
                      {formatAt(f.at)}
                      {f.neighbours > 1 ? ` · ${t('rc.byNeighbours', { n: f.neighbours })}` : ''}
                    </span>
                    {(f.outcome || f.done) && <span className="cr-outcome">{f.outcome ?? f.done}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
