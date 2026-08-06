import React, { useRef, useState } from 'react';

// Boot-time intro that plays over the frame and unmounts when the video ends.
// Also dismissable by tap — Chromium on the Pi will autoplay muted, but the
// user can skip if they've seen it enough.
export default function SplashScreen({ onDone }) {
  const videoRef = useRef(null);
  const [fading, setFading] = useState(false);

  const dismiss = () => {
    if (fading) return;
    setFading(true);
    // Fade duration matches the CSS transition below.
    setTimeout(onDone, 320);
  };

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
        // If autoplay is blocked for any reason, don't leave a black screen up
        // forever — dismiss after a hard timeout.
        onError={dismiss}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}
