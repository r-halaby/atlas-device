import React, { useEffect, useRef, useState } from 'react';

// Boot-time intro that plays over the frame and unmounts when the video ends.
// Also dismissable by tap. Autoplay is muted so Chromium doesn't block it.
export default function SplashScreen({ onDone }) {
  const videoRef = useRef(null);
  const [fading, setFading] = useState(false);

  const dismiss = () => {
    if (fading) return;
    setFading(true);
    // Fade duration matches the CSS transition below.
    setTimeout(onDone, 320);
  };

  // Hard timeout: if the video hasn't ended in this long, dismiss anyway so
  // the kiosk never gets stuck on a black splash. Longer than the video's
  // real length; if we hit this, something (codec, autoplay, network) failed.
  useEffect(() => {
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        opacity: fading ? 0 : 1,
        transition: 'opacity 320ms ease',
        cursor: 'pointer',
      }}
    >
      {/* TEMP DIAGNOSTIC: visible marker so we can tell whether the splash
          component is mounting at all vs. whether the video is failing. */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        color: '#fff',
        fontSize: 14,
        fontFamily: 'monospace',
        zIndex: 2,
      }}>
        SPLASH MOUNTED (onEnded disabled)
      </div>
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={() => {
          // eslint-disable-next-line no-console
          console.log('[splash] video loaded');
        }}
        onCanPlay={() => {
          // eslint-disable-next-line no-console
          console.log('[splash] video canPlay');
        }}
        onPlay={() => {
          // eslint-disable-next-line no-console
          console.log('[splash] video play');
        }}
        onError={(e) => {
          // Log for debugging; do NOT auto-dismiss on error.
          // eslint-disable-next-line no-console
          console.error('[splash] video error', e?.target?.error);
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}
