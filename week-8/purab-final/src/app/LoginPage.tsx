// Week 8 (Purab): the sign-in page. Checks the form before signing in (filled in, a real-looking
// email, 8+ characters), gives one message for a wrong email or password, and waits 30 seconds
// after 5 wrong tries. The demo accounts can be filled in with one click for the pitch.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ACCOUNTS, ADMIN_ID, ADMIN_PASSWORD, MEMBER_PASSWORD, lockSecondsLeft, signInWith, validateSignIn, type Account, type FieldErrors, type SignInProblem } from './auth';
import { personaById } from '../features/requests/personas';
import { Icon } from './Icon';
import { useLang, useT } from './i18n';
import './Login.css';

interface Props {
  onSignedIn: (account: Account) => void;
  /** True when the person opened a link to a page (e.g. a QR poster) before signing in. */
  returning?: boolean;
}

const cleanName = (s: string) => s.replace(/\s*\(demo\)/, '');

export function LoginPage({ onSignedIn, returning }: Props) {
  const t = useT();
  const { lang, setLang } = useLang();
  const uid = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<SignInProblem | null>(null);
  const [triesLeft, setTriesLeft] = useState<number | undefined>(undefined);
  const [lockLeft, setLockLeft] = useState(lockSecondsLeft());
  const summaryRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = `${t('login.title')} · Neighbr (PinPoint)`;
  }, [t]);

  // count down while locked
  useEffect(() => {
    if (lockLeft <= 0) return;
    const timer = window.setInterval(() => {
      const left = lockSecondsLeft();
      setLockLeft(left);
      if (left <= 0) setProblem(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockLeft]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateSignIn(email, password);
    setErrors(found);
    setTriesLeft(undefined);
    if (found.email || found.password) {
      setProblem(null);
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    const result = signInWith(email, password);
    if (result.ok) {
      onSignedIn(result.account);
      return;
    }
    setProblem(result.problem);
    setTriesLeft(result.triesLeft);
    setLockLeft(lockSecondsLeft());
    window.setTimeout(() => summaryRef.current?.focus(), 0);
  };

  const fill = (a: Account) => {
    setEmail(a.email);
    setPassword(a.password);
    setErrors({});
    setProblem(null);
    passwordRef.current?.focus();
  };

  const fieldErrors = (Object.entries(errors) as [keyof FieldErrors, SignInProblem][]).filter(([, v]) => v);
  const locked = lockLeft > 0;
  const admin = ACCOUNTS.find((a) => a.id === ADMIN_ID)!;
  const members = ACCOUNTS.filter((a) => a.id !== ADMIN_ID);

  return (
    <div className="lg">
      <a className="skip-link" href="#lg-form">
        Skip to sign in
      </a>
      <aside className="lg-side" aria-hidden="true">
        <div className="lg-brand">
          <span className="shell-mark">
            <Icon name="pin" size={18} strokeWidth={2.4} />
          </span>
          <span className="lg-brand-name">Neighbr</span>
        </div>
        <p className="lg-side-line">
          Wyandotte St E
          <br />
          Olde Riverside
        </p>
        <svg className="lg-street" viewBox="0 0 360 220" role="presentation">
          <defs>
            <radialGradient id="lg-glow" cx="50%" cy="0%" r="70%">
              <stop offset="0%" stopColor="#ffc93c" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffc93c" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[40, 180, 320].map((x) => (
            <g key={x}>
              <path d={`M${x - 70} 210 L${x - 10} 52 L${x + 10} 52 L${x + 70} 210 Z`} fill="url(#lg-glow)" />
              <rect x={x - 2} y="50" width="4" height="160" rx="2" fill="#27445c" />
              <rect x={x - 12} y="44" width="24" height="8" rx="4" fill="#ffc93c" />
            </g>
          ))}
          <rect x="0" y="208" width="360" height="12" fill="#27445c" />
        </svg>
      </aside>

      <main className="lg-main" id="main">
        <div className="lg-langs" role="group" aria-label={t('strip.language')}>
          <button type="button" aria-pressed={lang === 'en'} lang="en" title="English" onClick={() => setLang('en')}>
            EN
          </button>
          <button type="button" aria-pressed={lang === 'fr'} lang="fr" title="Français" onClick={() => setLang('fr')}>
            FR
          </button>
        </div>
        <div className="lg-card">
          <h1>{t('login.title')}</h1>
          <p className="lg-lead">{t('login.lead')}</p>
          {returning && (
            <p className="lg-return">
              <Icon name="info" size={16} />
              {t('login.afterSignIn')}
            </p>
          )}

          <div ref={summaryRef} tabIndex={-1} className="lg-summary-wrap" aria-live="assertive">
            {fieldErrors.length > 0 && (
              <div className="lg-summary" role="alert">
                <p>{t('login.errorsTitle')}</p>
                <ul>
                  {fieldErrors.map(([field, key]) => (
                    <li key={field}>
                      <a
                        href={`#${uid}-${field}`}
                        onClick={(e) => {
                          e.preventDefault();
                          (field === 'email' ? emailRef : passwordRef).current?.focus();
                        }}
                      >
                        {t(key)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {problem && (
              <div className="lg-summary" role="alert">
                <p>{t(problem, { s: lockLeft })}</p>
                {triesLeft !== undefined && <p className="lg-tries">{t('login.triesLeft', { n: triesLeft })}</p>}
              </div>
            )}
          </div>

          <form id="lg-form" className="lg-form" noValidate onSubmit={submit}>
            <div className={`lg-field${errors.email ? ' lg-field--bad' : ''}`}>
              <label htmlFor={`${uid}-email`}>{t('login.email')}</label>
              <input
                ref={emailRef}
                id={`${uid}-email`}
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? `${uid}-email-err` : undefined}
              />
              {errors.email && (
                <p id={`${uid}-email-err`} className="lg-err">
                  <Icon name="alert" size={14} />
                  {t(errors.email)}
                </p>
              )}
            </div>
            <div className={`lg-field${errors.password ? ' lg-field--bad' : ''}`}>
              <label htmlFor={`${uid}-password`}>{t('login.password')}</label>
              <div className="lg-pw">
                <input
                  ref={passwordRef}
                  id={`${uid}-password`}
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? `${uid}-password-err` : undefined}
                />
                <button type="button" className="lg-show" aria-pressed={show} aria-label={show ? t('login.hideLabel') : t('login.showLabel')} onClick={() => setShow((v) => !v)}>
                  <Icon name={show ? 'ban' : 'eye'} size={16} />
                  <span aria-hidden="true">{show ? t('login.hide') : t('login.show')}</span>
                </button>
              </div>
              {errors.password && (
                <p id={`${uid}-password-err`} className="lg-err">
                  <Icon name="alert" size={14} />
                  {t(errors.password)}
                </p>
              )}
            </div>
            <button type="submit" className="lg-submit" disabled={locked}>
              <Icon name="lock" size={16} />
              {t('login.submit')}
            </button>
          </form>

          <details className="lg-demo">
            <summary>{t('login.demoTitle')}</summary>
            <p className="lg-demo-note">{t('login.demoNote', { pw: MEMBER_PASSWORD, apw: ADMIN_PASSWORD })}</p>
            <ul>
              <li className="lg-acc lg-acc--admin">
                <span className="lg-acc-who">
                  <strong>{t('strip.admin')}</strong>
                  <span>{t('login.admin')}</span>
                  <code>{admin.email}</code>
                </span>
                <button type="button" onClick={() => fill(admin)} aria-label={t('login.useLabel', { who: t('strip.admin') })}>
                  {t('login.use')}
                </button>
              </li>
              {members.map((a) => {
                const p = personaById(a.id);
                return (
                  <li key={a.id} className="lg-acc">
                    <span className="lg-acc-who">
                      <strong>{cleanName(p.label)}</strong>
                      <span>{p.title.split(',')[0]}</span>
                      <code>{a.email}</code>
                    </span>
                    <button type="button" onClick={() => fill(a)} aria-label={t('login.useLabel', { who: cleanName(p.label) })}>
                      {t('login.use')}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="lg-demo-only">{t('login.demoOnly')}</p>
          </details>
        </div>
      </main>
    </div>
  );
}
