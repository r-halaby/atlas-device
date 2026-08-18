import React, { useEffect, useRef, useState } from 'react';

// TEMP DIAGNOSTIC BUILD — all dismiss paths disabled. Splash stays up and
// prints a live event log so we can see what fires on the Pi's Chromium.
export default function SplashScreen({ onDone }) {
  const videoRef = useRef(null);
  const [log, setLog] = useState([`0.00s mount`]);
  const t0 = useRef(performance.now());

  const push = (msg) => {
    const t = ((performance.now() - t0.current) / 1000).toFixed(2);
    setLog((l) => [...l, `${t}s ${msg}`]);
  };

  useEffect(() => {
    push('effect');
    // DO NOT dismiss automatically — this build is diagnostic.
    // Tap the splash to force dismiss when done reading.
  }, []);

  return (
    <div
      onClick={() => {
        push('CLICK');
        setTimeout(onDone, 400);
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 13,
        padding: 12,
        zIndex: 100,
        overflow: 'auto',
        cursor: 'pointer',
      }}
    >
      <div style={{ marginBottom: 8 }}>SPLASH (diag) — tap to close</div>
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadStart={() => push('loadstart')}
        onLoadedMetadata={(e) => push(`meta d=${e.target.duration.toFixed(2)}`)}
        onLoadedData={() => push('loadeddata')}
        onCanPlay={() => push('canplay')}
        onPlay={() => push('play')}
        onPlaying={() => push('playing')}
        onEnded={() => push('ENDED')}
        onError={(e) => push(`ERROR code=${e.target.error?.code} msg=${e.target.error?.message ?? ''}`)}
        onStalled={() => push('stalled')}
        onSuspend={() => push('suspend')}
        onAbort={() => push('abort')}
        style={{
          width: '100%',
          height: 100,
          background: '#333',
          marginBottom: 8,
        }}
      />
      {log.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
