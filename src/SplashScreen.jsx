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
  // real length (~4s) so a normal play never trips it.
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
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={(e) => {
          // Log for debugging; do NOT auto-dismiss on error. If we did, a
          // codec failure would flash the splash and disappear in a single
          // frame — worse UX than a plain black screen for the fallback
          // timeout above.
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
