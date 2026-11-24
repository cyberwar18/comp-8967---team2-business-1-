// Week 8 (pitch): QR posters for the corridor (#/posters, #/posters?place=<id>).
// A poster for a shop window, a lamp post or the parkette. Scanning it opens Report a problem
// with that place already chosen (#/map?report=<id>), on whatever address the app is served from,
// so it works from the live link. Codes are drawn in the browser (the "qrcode" package): no service.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getPlaces } from '../../data/api';
import { Icon } from '../../app/Icon';
import { useT } from '../../app/i18n';
import './Corridor.css';

const plain = (s: string) => s.replace(/\s*\(demo\)/, '');

/** The address a poster's code opens: this app, on Report a problem, with the place chosen. */
export function reportLinkFor(placeId: string, base = `${window.location.origin}${window.location.pathname}`): string {
  return `${base}#/map?report=${encodeURIComponent(placeId)}`;
}

function placeFromHash(): string | null {
  const m = window.location.hash.match(/^#\/?posters\?(?:.*&)?place=([\w-]+)/);
  return m ? m[1] : null;
}

function QrImage({ url, alt, size }: { url: string; alt: string; size: number }) {
  const t = useT();
  const [src, setSrc] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0e2233', light: '#ffffff' } })
      .then((svg) => live && setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))
      .catch(() => live && setSrc(''));
    return () => {
      live = false;
    };
  }, [url]);
  return src ? <img className="qr-img" src={src} alt={alt} width={size} height={size} /> : <span className="qr-img qr-img--loading">{t('qr.loading')}</span>;
}

interface Place {
  id: string;
  name: string;
  category?: string;
}

export function PostersPage() {
  const t = useT();
  const [places, setPlaces] = useState<Place[]>([]);
  const [one, setOne] = useState<string | null>(placeFromHash);
  useEffect(() => {
    getPlaces().then((ps) => setPlaces(ps.map((p) => ({ id: p.id, name: plain(String(p.name)), category: String(p.category ?? '') }))));
    const onHash = () => setOne(placeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const place = one ? places.find((p) => p.id === one) : undefined;
  if (one && place) {
    return (
      <div className="qr-page">
        <div className="qr-toolbar cr-noprint">
          <a className="cr-btn" href="#/posters">
            <Icon name="arrowLeft" size={16} />
            {t('qr.all')}
          </a>
          <button type="button" className="cr-btn cr-btn--primary" onClick={() => window.print()}>
            <Icon name="printer" size={17} />
            {t('qr.print')}
          </button>
        </div>
        <article className="qr-poster" aria-labelledby="qr-poster-title">
          <p className="qr-brand">
            <span className="qr-mark" aria-hidden="true">
              <Icon name="pin" size={22} />
            </span>
            Neighbr · Olde Riverside
          </p>
          <h1 id="qr-poster-title" className="qr-poster-title">
            {t('qr.posterTitle')}
          </h1>
          <p className="qr-poster-place">{place.name}</p>
          <QrImage url={reportLinkFor(place.id)} alt={t('qr.alt', { place: place.name })} size={320} />
          <p className="qr-poster-lead">{t('qr.posterLead')}</p>
          <p className="qr-poster-steps">{t('qr.posterSteps')}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="qr-page">
      <header className="cr-head">
        <span className="cr-head-ic" aria-hidden="true">
          <Icon name="flag" size={26} />
        </span>
        <div>
          <p className="cr-kicker">{t('qr.kicker')}</p>
          <h1 className="cr-h1">{t('qr.title')}</h1>
          <p className="cr-lead">{t('qr.lead')}</p>
        </div>
        <div className="cr-actions cr-noprint">
          <button type="button" className="cr-btn" onClick={() => window.print()}>
            <Icon name="printer" size={17} />
            {t('qr.printAll')}
          </button>
        </div>
      </header>
      <ul className="qr-grid">
        {places.map((p) => (
          <li key={p.id} className="qr-tile">
            <QrImage url={reportLinkFor(p.id)} alt={t('qr.alt', { place: p.name })} size={132} />
            <div className="qr-tile-body">
              <strong>{p.name}</strong>
              {p.category && <span>{p.category}</span>}
              <a className="cr-btn cr-btn--small cr-noprint" href={`#/posters?place=${encodeURIComponent(p.id)}`}>
                {t('qr.open')}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
