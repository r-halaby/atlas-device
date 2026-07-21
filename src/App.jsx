import React, { useState, useEffect, useRef } from 'react';

// -------------------- Mock data --------------------
const mockData = {
  pulse: {
    status: 'Healthy',
    subtitle: 'Stable operations with capacity for growth',
    projects: 'Smooth',
    cashFlow: '87%',
    todos: [
      { id: 1, text: 'Update deck design', done: false },
      { id: 2, text: 'Schedule meeting with Brian', done: false },
      { id: 3, text: 'Review quarterly data with Rahmi', done: false },
    ],
    calendar: [
      { date: 'July 14', color: 'yellow' },
      { date: 'July 15', color: 'green' },
      { date: 'July 16', color: 'green' },
      { date: 'July 17', color: 'green', today: true },
      { date: 'July 18', color: 'yellow' },
      { date: 'July 19', color: 'yellow' },
      { date: 'July 20', color: 'red' },
      { date: 'July 21', color: 'red' },
    ],
  },
  canvas: {
    workspace: 'Agency',
    projects: [
      { id: 1, name: 'Project Name' },
      { id: 2, name: 'Project Name' },
      { id: 3, name: 'Project Name' },
      { id: 4, name: 'Project Name' },
      { id: 5, name: 'Project Name' },
      { id: 6, name: 'Project Name' },
    ],
  },
};

// -------------------- Design tokens --------------------
const HEALTH_STYLES = {
  healthy: {
    color: '#bbf7d0',
    gradient:
      'linear-gradient(135deg, #14532d 0%, #166534 45%, rgba(20,83,45,0.15) 100%)',
    ring: 'rgba(134,239,172,0.25)',
  },
  strained: {
    color: '#fde68a',
    gradient:
      'linear-gradient(135deg, #713f12 0%, #854d0e 45%, rgba(113,63,18,0.15) 100%)',
    ring: 'rgba(253,230,138,0.25)',
  },
  critical: {
    color: '#fca5a5',
    gradient:
      'linear-gradient(135deg, #7f1d1d 0%, #991b1b 45%, rgba(127,29,29,0.15) 100%)',
    ring: 'rgba(252,165,165,0.25)',
  },
};

const BAR_COLORS = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
// Bar width encodes relative workload
const BAR_WIDTHS = { green: 35, yellow: 65, red: 100 };

function statusKey(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('strain')) return 'strained';
  if (s.includes('critic')) return 'critical';
  return 'healthy';
}

// -------------------- Component --------------------
export default function App() {
  const [screen, setScreen] = useState(0); // 0=pulse, 1=canvas
  const [todos, setTodos] = useState(mockData.pulse.todos);
  const [focusIdx, setFocusIdx] = useState(0);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const calendarRef = useRef(null);
  const canvasRef = useRef(null);

  const toggleTodo = (id) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  // Touch swipe (horizontal) switches screens
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setScreen(1);
      else setScreen(0);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Rotary encoder — simulated via keyboard.
  // ArrowLeft/Right: switch screen. ArrowUp/Down: scroll/focus. Enter/Space: click.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        setScreen(0);
      } else if (e.key === 'ArrowRight') {
        setScreen(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowUp' ? -1 : 1;
        if (screen === 0) {
          setFocusIdx((i) => Math.max(0, Math.min(todos.length - 1, i + dir)));
          calendarRef.current?.scrollBy({ top: dir * 42, behavior: 'smooth' });
        } else {
          canvasRef.current?.scrollBy({ top: dir * 90, behavior: 'smooth' });
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (screen === 0 && todos[focusIdx]) {
          e.preventDefault();
          toggleTodo(todos[focusIdx].id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, focusIdx, todos]);

  const health = mockData.pulse;
  const hk = statusKey(health.status);
  const hs = HEALTH_STYLES[hk];

  return (
    <div style={S.root}>
      <div
        style={S.frame}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {screen === 0 ? (
          <div style={S.pulse}>
            <div style={S.pulseCols}>
              {/* Left column: health + todos */}
              <div style={S.leftCol}>
                <div
                  style={{
                    ...S.healthCard,
                    background: hs.gradient,
                    boxShadow: `inset 0 0 0 1px ${hs.ring}`,
                  }}
                >
                  <div style={{ ...S.statusWord, color: hs.color }}>
                    {health.status}
                  </div>
                  <div style={S.subtitle}>{health.subtitle}</div>
                  <div style={S.statsRow}>
                    <div style={S.stat}>
                      <span style={S.statLabel}>Projects:</span>
                      <span style={S.statValue}>{health.projects}</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.stat}>
                      <span style={S.statLabel}>Cash Flow:</span>
                      <span style={S.statValue}>{health.cashFlow}</span>
                    </div>
                  </div>
                </div>

                <div style={S.todosBlock}>
                  <div style={S.sectionLabel}>To-Dos</div>
                  <ul style={S.todoList}>
                    {todos.map((t, i) => {
                      const focused = focusIdx === i;
                      return (
                        <li
                          key={t.id}
                          style={{
                            ...S.todoItem,
                            background: focused
                              ? 'rgba(255,255,255,0.04)'
                              : 'transparent',
                            outline: focused
                              ? '1px solid rgba(255,255,255,0.12)'
                              : '1px solid transparent',
                          }}
                          onClick={() => {
                            setFocusIdx(i);
                            toggleTodo(t.id);
                          }}
                        >
                          <span
                            style={{
                              ...S.checkbox,
                              borderColor: t.done ? '#4ade80' : '#525252',
                              background: t.done ? '#4ade80' : 'transparent',
                            }}
                          >
                            {t.done && <span style={S.check}>✓</span>}
                          </span>
                          <span
                            style={{
                              ...S.todoText,
                              color: t.done ? '#737373' : '#f5f5f5',
                              textDecoration: t.done ? 'line-through' : 'none',
                            }}
                          >
                            {t.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div style={S.seeAll}>See All →</div>
                </div>
              </div>

              {/* Right column: calendar strip */}
              <div
                ref={calendarRef}
                className="kiosk-scroll"
                style={S.calendarCol}
              >
                {mockData.pulse.calendar.map((d) => {
                  const [, dayNum] = d.date.split(' ');
                  return (
                    <div key={d.date} style={S.calRow}>
                      <div style={S.calDateBlock}>
                        <div
                          style={{
                            ...S.calDay,
                            color: d.today ? '#fff' : '#a3a3a3',
                            fontWeight: d.today ? 700 : 500,
                          }}
                        >
                          {dayNum}
                        </div>
                        {d.today && <div style={S.todayLabel}>TODAY</div>}
                      </div>
                      <div style={S.calBarTrack}>
                        <div
                          style={{
                            ...S.calBar,
                            width: BAR_WIDTHS[d.color] + '%',
                            background: BAR_COLORS[d.color],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={canvasRef}
            className="kiosk-scroll"
            style={S.canvas}
          >
            <div style={S.workspaceLabel}>{mockData.canvas.workspace}</div>
            <div style={S.grid}>
              {mockData.canvas.projects.map((p) => (
                <div key={p.id} style={S.projectCard}>
                  <div style={S.thumb} />
                  <div style={S.projectName}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom dot indicator */}
        <div style={S.dots}>
          {[0, 1].map((i) => (
            <div
              key={i}
              onClick={() => setScreen(i)}
              style={{
                ...S.dot,
                width: screen === i ? 22 : 6,
                background: screen === i ? '#f5f5f5' : '#404040',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------- Styles --------------------
const S = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
  },
  frame: {
    position: 'relative',
    width: 480,
    height: 480,
    background: '#0a0a0a',
    color: '#f5f5f5',
    overflow: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },

  // ---- Pulse screen ----
  pulse: {
    width: '100%',
    height: '100%',
    padding: 14,
    paddingBottom: 30,
  },
  pulseCols: {
    display: 'flex',
    gap: 12,
    width: '100%',
    height: '100%',
  },
  leftCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
  },
  calendarCol: {
    width: 110,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    paddingRight: 2,
  },

  healthCard: {
    borderRadius: 14,
    padding: 14,
    minHeight: 168,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  statusWord: {
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: -1.2,
    lineHeight: 1,
    marginTop: 2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 1.3,
    color: 'rgba(255,255,255,0.78)',
    maxWidth: 240,
  },
  statsRow: {
    marginTop: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
    fontSize: 11.5,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: 500,
  },
  statValue: {
    color: '#fff',
    fontWeight: 700,
  },
  statDivider: {
    width: 1,
    height: 12,
    background: 'rgba(255,255,255,0.25)',
  },

  todosBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#737373',
    marginBottom: 8,
    fontWeight: 600,
  },
  todoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 10px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1.5px solid #525252',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 120ms ease',
  },
  check: {
    color: '#0a0a0a',
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  todoText: {
    fontSize: 14,
    fontWeight: 500,
  },
  seeAll: {
    marginTop: 6,
    fontSize: 12,
    color: '#a3a3a3',
    fontWeight: 500,
    paddingLeft: 10,
  },

  // ---- Calendar ----
  calRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
  },
  calDateBlock: {
    width: 34,
    flexShrink: 0,
  },
  calDay: {
    fontSize: 16,
    lineHeight: 1,
  },
  todayLabel: {
    marginTop: 2,
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#f5f5f5',
    fontWeight: 700,
  },
  calBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  calBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 200ms ease',
  },

  // ---- Canvas screen ----
  canvas: {
    width: '100%',
    height: '100%',
    padding: 18,
    paddingBottom: 30,
    overflowY: 'auto',
  },
  workspaceLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: '#737373',
    marginBottom: 14,
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  projectCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  thumb: {
    width: '100%',
    aspectRatio: '4 / 3',
    borderRadius: 10,
    background:
      'linear-gradient(135deg, #262626 0%, #1a1a1a 100%)',
    border: '1px solid #262626',
  },
  projectName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e5e5e5',
  },

  // ---- Dots ----
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'width 200ms ease, background 200ms ease',
  },
};
