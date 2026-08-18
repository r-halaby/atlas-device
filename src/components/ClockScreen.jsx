import React, { useEffect, useState } from 'react';

// Minimal wall-clock face inspired by Braun's quartz — 60 ticks, four
// numerals, three hands. Ticks 15 apart get width; the rest are hairlines.
// Live time; re-renders once a second.
//
// SVG is authored in a 480x480 viewBox to match the design canvas. The
// enclosing frame's CSS zoom scales it up to 720 on the panel.

const SIZE = 480;
const CENTER = SIZE / 2;
const OUTER = 218;      // tick outer radius
const MINOR_LEN = 6;    // minute tick
const MAJOR_LEN = 14;   // five-minute tick
const NUMERAL_R = 178;  // where 12/3/6/9 sit

const FACE = '#f5f5f5';   // matches C.bg so it feels part of the frame
const INK  = '#0a0a0a';   // hands + ticks + numerals

const NUMERALS = [
  { n: '12', angle: 0 },
  { n: '3',  angle: 90 },
  { n: '6',  angle: 180 },
  { n: '9',  angle: 270 },
];

function pointOnRing(angleDeg, r) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

export default function ClockScreen() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle   = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = i * 6;
    const major = i % 5 === 0;
    const len = major ? MAJOR_LEN : MINOR_LEN;
    const width = major ? 4 : 1.5;
    return (
      <g key={i} transform={`rotate(${angle} ${CENTER} ${CENTER})`}>
        <rect
          x={CENTER - width / 2}
          y={CENTER - OUTER}
          width={width}
          height={len}
          fill={INK}
        />
      </g>
    );
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: FACE,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      isolation: 'isolate',
      contain: 'paint',
    }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
        {/* Explicit opaque fill inside the SVG in case Chromium's Wayland
            compositor doesn't paint the parent div's background under the
            SVG cleanly on layer swap. */}
        <rect width={SIZE} height={SIZE} fill={FACE} />
        {ticks}

        {NUMERALS.map(({ n, angle }) => {
          const [x, y] = pointOnRing(angle, NUMERAL_R);
          return (
            <text
              key={n}
              x={x}
              y={y}
              fill={INK}
              fontFamily="Inter, system-ui, sans-serif"
              fontSize={44}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
              letterSpacing="-1"
            >{n}</text>
          );
        })}

        {/* Hour hand */}
        <g transform={`rotate(${hourAngle} ${CENTER} ${CENTER})`}>
          <rect
            x={CENTER - 5}
            y={CENTER - 100}
            width={10}
            height={112}
            rx={5}
            fill={INK}
          />
        </g>

        {/* Minute hand */}
        <g transform={`rotate(${minuteAngle} ${CENTER} ${CENTER})`}>
          <rect
            x={CENTER - 3.5}
            y={CENTER - 150}
            width={7}
            height={162}
            rx={3.5}
            fill={INK}
          />
        </g>

        {/* Second hand — thin, with a short tail past the pivot */}
        <g transform={`rotate(${secondAngle} ${CENTER} ${CENTER})`}>
          <rect
            x={CENTER - 1}
            y={CENTER - 175}
            width={2}
            height={210}
            fill={INK}
          />
        </g>

        {/* Center pivot */}
        <circle cx={CENTER} cy={CENTER} r={7} fill={INK} />
      </svg>
    </div>
  );
}
