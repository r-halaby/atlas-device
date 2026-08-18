import React from 'react';
import { describeAction } from '../mock/mockSageAPI.js';

// Full-frame overlay. Rendered inside the same 480-design frame that App uses,
// so all sizes are in design pixels — the frame's CSS zoom takes them to
// panel pixels.

const BG = 'rgba(10,10,10,0.95)';
const RED = '#FF4D4D';
const CYAN = '#00E5FF';
const WHITE = '#ffffff';
const MUTED = 'rgba(255,255,255,0.55)';

const S = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 90,
    background: BG,
    color: WHITE,
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
    fontFamily: 'inherit',
  },
  wordmark: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.4em',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    minHeight: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: MUTED,
    letterSpacing: '0.2px',
    marginBottom: 12,
  },
  bottomLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: MUTED,
    marginTop: 'auto',
    paddingTop: 8,
  },
  recDot: (blink) => ({
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: RED,
    boxShadow: `0 0 24px ${RED}`,
    opacity: blink ? 1 : 0.35,
    transition: 'opacity 400ms ease',
  }),
  spinner: {
    width: 24,
    height: 24,
    border: `3px solid rgba(255,255,255,0.15)`,
    borderTopColor: CYAN,
    borderRadius: '50%',
    animation: 'sage-spin 900ms linear infinite',
  },
  waveform: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
  },
  waveBar: (i) => ({
    width: 3,
    height: `${20 + ((i * 13) % 20)}px`,
    background: RED,
    borderRadius: 2,
    animation: `sage-wave 900ms ease-in-out ${i * 90}ms infinite`,
  }),
  resultText: {
    fontSize: 18,
    fontWeight: 600,
    color: WHITE,
    textAlign: 'center',
    lineHeight: 1.25,
    letterSpacing: '-0.3px',
    padding: '0 8px',
  },
  actions: {
    display: 'flex',
    gap: 24,
    marginTop: 8,
  },
  actionBtn: (color) => ({
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'transparent',
    border: `2px solid ${color}`,
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 24,
    fontWeight: 500,
  }),
  candidateList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    width: '100%',
    maxHeight: 200,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  candidateRow: {
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    fontSize: 13,
    fontWeight: 500,
    color: WHITE,
    textAlign: 'left',
    cursor: 'pointer',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 500,
    color: MUTED,
    textAlign: 'center',
  },
};

// CSS keyframes injected once — StyleSheet.insertRule would be cleaner but
// this keeps the component self-contained.
const KEYFRAMES = `
  @keyframes sage-spin { to { transform: rotate(360deg); } }
  @keyframes sage-wave {
    0%, 100% { transform: scaleY(0.4); }
    50%      { transform: scaleY(1.4); }
  }
`;

export default function SageOverlay({
  view,
  pendingAction,
  error,
  projects,
  onConfirm,
  onCancel,
  onChooseCandidate,
}) {
  const [blink, setBlink] = React.useState(true);
  React.useEffect(() => {
    if (view !== 'recording') return;
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, [view]);

  if (view === 'idle') return null;

  return (
    <div style={S.overlay} onTouchStart={(e) => e.stopPropagation()}>
      <style>{KEYFRAMES}</style>
      <div style={S.wordmark}>Sage</div>

      {view === 'recording' && (
        <>
          <div style={S.body}>
            <div style={S.recDot(blink)} />
            <div style={S.waveform}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={S.waveBar(i)} />
              ))}
            </div>
          </div>
          <div style={S.bottomLabel}>Listening…</div>
        </>
      )}

      {view === 'processing' && (
        <>
          <div style={S.body}>
            <div style={S.spinner} />
          </div>
          <div style={S.bottomLabel}>Thinking…</div>
        </>
      )}

      {view === 'result' && pendingAction && (
        <>
          <div style={S.body}>
            <div style={S.label}>Confirm</div>
            <div style={S.resultText}>{describeAction(pendingAction)}</div>
            <div style={S.actions}>
              <div
                style={S.actionBtn(RED)}
                onClick={onCancel}
                role="button"
                aria-label="Cancel"
              >×</div>
              <div
                style={S.actionBtn(CYAN)}
                onClick={onConfirm}
                role="button"
                aria-label="Confirm"
              >✓</div>
            </div>
          </div>
        </>
      )}

      {view === 'ambiguous' && pendingAction && (
        <>
          <div style={S.body}>
            <div style={S.label}>Which one?</div>
            <div style={S.resultText}>{pendingAction.question || 'Pick a project'}</div>
            <ul style={S.candidateList}>
              {(pendingAction.candidates ?? projects.map((p) => p.name)).map((name) => (
                <li
                  key={name}
                  style={S.candidateRow}
                  onClick={() => onChooseCandidate({ project: name })}
                >{name}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {view === 'error' && (
        <>
          <div style={S.body}>
            <div style={S.errorText}>{error || 'Didn’t catch that'}</div>
            <div style={S.actions}>
              <div
                style={S.actionBtn(CYAN)}
                onClick={onCancel}
                role="button"
                aria-label="Dismiss"
              >✓</div>
            </div>
          </div>
          <div style={S.bottomLabel}>Press Sage to try again</div>
        </>
      )}
    </div>
  );
}
