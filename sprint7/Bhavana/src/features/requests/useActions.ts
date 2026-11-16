// Sprint 5 (Purab): send an action to the data adapter and report what happened.
// Errors from the rules (not allowed, missing text) come back as a message to show on screen.
import { useState } from 'react';
import { actOnRequest } from '../../data/api';
import { ACTION_LABEL, type ActionId, type ActionInput, type Persona, type ServiceRequest } from './requests';

export function useActions(r: ServiceRequest, persona: Persona, onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function act(action: ActionId, input: ActionInput = {}) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await actOnRequest(r.id, persona, action, input);
      setMessage(`Done: ${ACTION_LABEL[action]}.`);
      onDone?.();
    } catch (e) {
      const name = (e as Error).name;
      const text = (e as Error).message;
      setError(name === 'PermissionError' ? `Not allowed. ${text}` : text);
    } finally {
      setBusy(false);
    }
  }

  return { act, busy, message, error };
}
