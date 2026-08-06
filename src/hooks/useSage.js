import { useEffect, useRef, useState, useCallback } from 'react';

// Bridges pi/sage_listener.py to the UI via a local WebSocket. When the
// Python side isn't running (e.g. during browser-only dev), the hook stays
// in 'idle' forever — the overlay simply never appears. That's the point:
// nothing breaks on a laptop.

const WS_URL = 'ws://localhost:8765';

// Messages the Python side may send:
//   { event: 'recording_start' }
//   { event: 'recording_end' }
//   { event: 'processing' }
//   { event: 'result',    action: { action, ...fields } }
//   { event: 'ambiguous', action: { action: 'ambiguous', question, candidates? } }
//   { event: 'error',     message }
//   { event: 'dismiss' }                          // Sage button pressed while overlay was up

// Messages we send back:
//   { event: 'confirm', action }
//   { event: 'cancel' }

export function useSage({ onConfirm } = {}) {
  const [view, setView] = useState('idle');
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const connect = () => {
      if (cancelled) return;
      let ws;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        retryTimer = setTimeout(connect, 3000);
        return;
      }
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        if (cancelled) return;
        setConnected(true);
      });

      ws.addEventListener('message', (ev) => {
        if (cancelled) return;
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        switch (msg.event) {
          case 'recording_start':
            setError(null);
            setPendingAction(null);
            setView('recording');
            break;
          case 'recording_end':
            // Bridge state — Python is about to send 'processing'.
            break;
          case 'processing':
            setView('processing');
            break;
          case 'result':
            setPendingAction(msg.action ?? null);
            setView('result');
            break;
          case 'ambiguous':
            setPendingAction(msg.action ?? null);
            setView('ambiguous');
            break;
          case 'error':
            setError(msg.message ?? 'Didn’t catch that');
            setView('error');
            break;
          case 'dismiss':
            setView('idle');
            setPendingAction(null);
            setError(null);
            break;
          default:
            break;
        }
      });

      const scheduleRetry = () => {
        setConnected(false);
        if (cancelled) return;
        retryTimer = setTimeout(connect, 3000);
      };
      ws.addEventListener('close', scheduleRetry);
      ws.addEventListener('error', () => ws.close());
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const confirm = useCallback(() => {
    if (pendingAction && onConfirm) onConfirm(pendingAction);
    send({ event: 'confirm', action: pendingAction });
    setView('idle');
    setPendingAction(null);
    setError(null);
  }, [pendingAction, onConfirm, send]);

  const cancel = useCallback(() => {
    send({ event: 'cancel' });
    setView('idle');
    setPendingAction(null);
    setError(null);
  }, [send]);

  const chooseAmbiguousOption = useCallback((choice) => {
    // For ambiguous cases the UI picks a value (usually a project name); we
    // resolve to a concrete action by merging the choice into pendingAction.
    if (!pendingAction) return;
    const resolved = { ...pendingAction, ...choice };
    if (onConfirm) onConfirm(resolved);
    send({ event: 'confirm', action: resolved });
    setView('idle');
    setPendingAction(null);
  }, [pendingAction, onConfirm, send]);

  return { view, pendingAction, error, connected, confirm, cancel, chooseAmbiguousOption };
}
