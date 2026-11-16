// KAN-51 (Bhavana): the Chats page (#/chats).
//   - your conversations: about a request, with your group, with a member, or direct
//   - a chat about a request opens from the request page ("Message ... about this request")
//   - organizations (a community group, school, library or the BIA) can message their members
//   - safety: "Who can message me", block, and report a message to Neighbr staff
// Opening a chat marks it read (the bell's "New message" goes away).
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  blockInChat,
  getChat,
  getChatContacts,
  getChats,
  getMessageSetting,
  markChatRead,
  onDataChange,
  openRequestChat,
  reportMessage,
  sendMessage,
  setMessageSetting,
  startChat,
  unblockInChat,
} from '../../data/api';
import { useIsPhone } from '../../app/useIsPhone';
import type { Persona } from '../requests/requests';
import { MESSAGE_MAX, REPORT_REASONS, SETTING_LABEL, endSentence, formatWhen, type ChatView, type MessageSetting, type ReportReason } from './chats';
import './Chats.css';

/** "#/chats?c=chat-1" -> { c: "chat-1" } */
function hashParams(): URLSearchParams {
  const q = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(q);
}

export default function ChatsPage({ persona }: { persona: Persona }) {
  const [chats, setChats] = useState<ChatView[] | null>(null);
  const [selected, setSelected] = useState<string | null>(() => hashParams().get('c'));
  const [composing, setComposing] = useState(false);
  const [problem, setProblem] = useState('');
  const phone = useIsPhone();

  const load = useCallback(() => {
    getChats(persona).then(setChats);
  }, [persona]);

  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  // Arriving from a request page (#/chats?request=req-07) or the bell (#/chats?c=...).
  useEffect(() => {
    const onHash = () => {
      const params = hashParams();
      const requestId = params.get('request');
      if (requestId) {
        openRequestChat(persona, requestId)
          .then((id) => {
            setSelected(id);
            setComposing(false);
            window.history.replaceState(null, '', `#/chats?c=${encodeURIComponent(id)}`);
          })
          .catch((e: Error) => setProblem(e.message));
      } else if (params.get('c')) {
        setSelected(params.get('c'));
        setComposing(false);
      }
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [persona]);

  const open = (id: string) => {
    setSelected(id);
    setComposing(false);
    window.history.replaceState(null, '', `#/chats?c=${encodeURIComponent(id)}`);
  };
  const back = () => {
    setSelected(null);
    setComposing(false);
    window.history.replaceState(null, '', '#/chats');
  };

  const showList = !phone || (!selected && !composing);
  const showPane = !phone || selected || composing;

  return (
    <div className="ch-page">
      <p className="ch-demo">Demo: you are {endSentence(persona.label.replace(/\s*\(demo\)/, ''))} Switch people with Viewing as. Sample messages are illustrative.</p>
      {problem && (
        <p className="ch-error" role="alert">
          {problem}
        </p>
      )}
      <div className="ch-layout">
        {showList && (
          <section className="ch-list" aria-labelledby="ch-title">
            <h1 id="ch-title" className="ch-h1">
              Chats
            </h1>
            <p className="ch-muted">Messages about your requests, with your groups and organizations, and with neighbours.</p>
            <button type="button" className="ch-btn ch-btn--primary" onClick={() => { setComposing(true); setSelected(null); }}>
              New message
            </button>
            {chats === null ? (
              <p className="ch-muted">Loading chats…</p>
            ) : chats.length === 0 ? (
              <p className="ch-empty">No chats yet. Open a request and choose "Message … about this request", or start a new message.</p>
            ) : (
              <ul className="ch-items" aria-label="Your chats">
                {chats.map((c) => {
                  const last = c.messages.at(-1);
                  return (
                    <li key={c.id}>
                      <button type="button" className={`ch-item${c.id === selected ? ' is-current' : ''}${c.unread ? ' is-unread' : ''}`} aria-current={c.id === selected ? 'true' : undefined} onClick={() => open(c.id)}>
                        <span className="ch-item-top">
                          <strong>{c.title}</strong>
                          {c.unread > 0 && <span className="ch-new">{c.unread} new</span>}
                        </span>
                        <span className="ch-item-label">
                          {c.label}
                          {c.kind === 'request' ? ` · ${c.otherName}` : ''}
                          {c.blocked ? ' · Blocked' : ''}
                        </span>
                        {last && (
                          <span className="ch-item-last">
                            {last.who}: {last.text}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <MessageSettingBox persona={persona} />
          </section>
        )}
        {showPane && (
          <section className="ch-pane" aria-label={composing ? 'New message' : 'Conversation'}>
            {composing ? (
              <NewMessage persona={persona} onCancel={back} onStarted={open} />
            ) : selected ? (
              <Thread key={selected} persona={persona} chatId={selected} onBack={phone ? back : undefined} />
            ) : (
              <p className="ch-pane-empty">Choose a chat from the list.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- one conversation

function Thread({ persona, chatId, onBack }: { persona: Persona; chatId: string; onBack?: () => void }) {
  const [chat, setChat] = useState<ChatView | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const uid = useId();
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const load = () => getChat(persona, chatId).then(setChat);
    load();
    return onDataChange(load);
  }, [persona, chatId]);

  // Opening the chat marks it read.
  useEffect(() => {
    if (chat && chat.unread > 0) markChatRead(persona, chatId);
  }, [chat, persona, chatId]);

  useEffect(() => {
    titleRef.current?.focus();
  }, [chatId]);

  if (chat === undefined) return <p className="ch-muted">Loading…</p>;
  if (chat === null)
    return (
      <p className="ch-pane-empty" role="alert">
        You don't have access to this chat.
      </p>
    );

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setNote('');
    try {
      await sendMessage(persona, chat.id, text);
      setText('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
      boxRef.current?.focus();
    }
  };

  const doBlock = async () => {
    try {
      await blockInChat(persona, chat.id);
      setConfirmBlock(false);
      setNote(`You blocked ${endSentence(chat.otherName)} They can't message you, and they aren't told.`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const doUnblock = async () => {
    await unblockInChat(persona, chat.id);
    setNote(`You unblocked ${endSentence(chat.otherName)}`);
  };

  return (
    <article className="ch-thread" aria-labelledby={`${uid}-title`}>
      {onBack && (
        <button type="button" className="ch-back" onClick={onBack}>
          ← Back to chats
        </button>
      )}
      <p className="ch-eyebrow">{chat.label}</p>
      <h2 id={`${uid}-title`} className="ch-title" tabIndex={-1} ref={titleRef}>
        {chat.title}
      </h2>
      <p className="ch-muted">
        {chat.kind === 'request' ? (
          <>
            Between you and {endSentence(chat.otherName)} <a href={`#/requests?id=${encodeURIComponent(chat.requestId ?? '')}`}>Open the request</a>
          </>
        ) : (
          <>Between you and {endSentence(chat.otherName)} Only the two of you see these messages.</>
        )}
      </p>

      <div className="ch-tools">
        {chat.canBlock.ok ? (
          chat.blocked ? (
            <button type="button" className="ch-btn" onClick={doUnblock}>
              Unblock {chat.otherName}
            </button>
          ) : confirmBlock ? (
            <div className="ch-confirm" role="group" aria-label={`Block ${chat.otherName}?`}>
              <p>
                Block {chat.otherName}? They won't be able to message you, and they aren't told. You can unblock any time.
              </p>
              <button type="button" className="ch-btn ch-btn--danger" onClick={doBlock}>
                Yes, block
              </button>
              <button type="button" className="ch-btn" onClick={() => setConfirmBlock(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="ch-btn" onClick={() => setConfirmBlock(true)}>
              Block {chat.otherName}
            </button>
          )
        ) : (
          <p className="ch-hint">{chat.canBlock.reason}</p>
        )}
      </div>

      <div aria-live="polite">{note && <p className="ch-ok">{note}</p>}</div>

      {chat.messages.length === 0 ? (
        <p className="ch-empty">No messages yet. Say hello.</p>
      ) : (
        <ol className="ch-messages" aria-label="Messages">
          {chat.messages.map((m) => (
            <li key={m.id} className={`ch-msg${m.mine ? ' is-mine' : ''}`}>
              <p className="ch-msg-who">
                <strong>{m.who}</strong> <span>{formatWhen(m.at)}</span>
              </p>
              <p className="ch-msg-text">{m.text}</p>
              {!m.mine &&
                (m.reported ? (
                  <p className="ch-reported">You reported this. Neighbr staff will review it.</p>
                ) : reporting === m.id ? (
                  <ReportForm
                    onCancel={() => setReporting(null)}
                    onSend={async (reason, why) => {
                      await reportMessage(persona, chat.id, m.id, reason, why);
                      setReporting(null);
                      setNote('Thanks. Neighbr staff will review the message. The sender is not told who reported it.');
                    }}
                  />
                ) : (
                  <button type="button" className="ch-link" onClick={() => setReporting(m.id)} aria-label={`Report this message from ${m.who}`}>
                    Report
                  </button>
                ))}
            </li>
          ))}
        </ol>
      )}

      {chat.canSend.ok ? (
        <form className="ch-send" onSubmit={send} noValidate>
          <label htmlFor={`${uid}-box`}>Message to {chat.otherName}</label>
          <textarea
            id={`${uid}-box`}
            ref={boxRef}
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${uid}-hint${error ? ` ${uid}-err` : ''}`}
          />
          <p id={`${uid}-hint`} className="ch-hint">
            Don't share your home address or passwords. {text.length} / {MESSAGE_MAX}
          </p>
          {error && (
            <p id={`${uid}-err`} className="ch-error">
              {error}
            </p>
          )}
          <button type="submit" className="ch-btn ch-btn--primary">
            Send
          </button>
        </form>
      ) : (
        <p className="ch-locked">{chat.canSend.reason}</p>
      )}
    </article>
  );
}

function ReportForm({ onSend, onCancel }: { onSend: (reason: ReportReason, note: string) => Promise<void>; onCancel: () => void }) {
  const uid = useId();
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [why, setWhy] = useState('');
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <form
      className="ch-report"
      aria-label="Report this message"
      onSubmit={(e) => {
        e.preventDefault();
        void onSend(reason, why);
      }}
    >
      <label htmlFor={`${uid}-reason`}>Why are you reporting it?</label>
      <select id={`${uid}-reason`} ref={first} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
        {REPORT_REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <label htmlFor={`${uid}-why`}>Anything else? (optional)</label>
      <input id={`${uid}-why`} type="text" value={why} onChange={(e) => setWhy(e.target.value)} />
      <div className="ch-row">
        <button type="submit" className="ch-btn ch-btn--danger">
          Send report
        </button>
        <button type="button" className="ch-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- new message

function NewMessage({ persona, onStarted, onCancel }: { persona: Persona; onStarted: (id: string) => void; onCancel: () => void }) {
  const uid = useId();
  const [contacts, setContacts] = useState<{ id: string; name: string }[] | null>(null);
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const first = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    getChatContacts(persona).then((c) => {
      setContacts(c);
      setTo(c[0]?.id ?? '');
    });
  }, [persona]);
  useEffect(() => {
    if (contacts?.length) first.current?.focus();
  }, [contacts]);

  if (contacts === null) return <p className="ch-muted">Loading…</p>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Write a message first.');
      return;
    }
    try {
      onStarted(await startChat(persona, to, text));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <article className="ch-thread" aria-labelledby={`${uid}-title`}>
      <button type="button" className="ch-back" onClick={onCancel}>
        ← Back to chats
      </button>
      <h2 id={`${uid}-title`} className="ch-title">
        New message
      </h2>
      {contacts.length === 0 ? (
        <p className="ch-muted">
          {persona.kind === 'staff' || persona.kind === 'copy'
            ? 'You message people about their requests. Open a request and choose "Message the sender".'
            : 'Join a group in Community to message it. To message a seller, use "Message the seller" in the Marketplace.'}
        </p>
      ) : (
        <form className="ch-send" onSubmit={submit} noValidate>
          <label htmlFor={`${uid}-to`}>To</label>
          <select id={`${uid}-to`} ref={first} value={to} onChange={(e) => { setTo(e.target.value); setError(''); }}>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor={`${uid}-text`}>Message</label>
          <textarea id={`${uid}-text`} rows={4} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} aria-invalid={error ? true : undefined} aria-describedby={error ? `${uid}-err` : undefined} />
          {error && (
            <p id={`${uid}-err`} className="ch-error" role="alert">
              {error}
            </p>
          )}
          <div className="ch-row">
            <button type="submit" className="ch-btn ch-btn--primary">
              Send
            </button>
            <button type="button" className="ch-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- who can message me

function MessageSettingBox({ persona }: { persona: Persona }) {
  const uid = useId();
  const [value, setValue] = useState<MessageSetting>('anyone');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getMessageSetting(persona).then(setValue);
  }, [persona]);
  if (persona.kind === 'copy' || (persona.kind === 'staff' && persona.profileId === 'profile-city')) return null;
  return (
    <div className="ch-setting">
      <label htmlFor={`${uid}-who`}>Who can message me</label>
      <select
        id={`${uid}-who`}
        value={value}
        onChange={(e) => {
          const v = e.target.value as MessageSetting;
          setValue(v);
          void setMessageSetting(persona, v).then(() => setSaved(true));
        }}
      >
        {(Object.keys(SETTING_LABEL) as MessageSetting[]).map((k) => (
          <option key={k} value={k}>
            {SETTING_LABEL[k]}
          </option>
        ))}
      </select>
      <p className="ch-hint" aria-live="polite">
        {saved ? 'Saved. ' : ''}Chats about your requests always work.
      </p>
    </div>
  );
}
