import React, { useState, useEffect, useRef } from 'react';

// -------------------- Mock data --------------------
// The calendar holds a whole month; only CAL_WINDOW days sit on screen at once
// and scrolling slides that window one day at a time.
const CAL_TODAY_DAY = 17;
const CAL_COLOR_CYCLE = ['green', 'yellow', 'green', 'green', 'yellow', 'red', 'green'];
const CAL_COLOR_OVERRIDES = {
  14: 'yellow',
  15: 'green',
  16: 'green',
  17: 'green',
  18: 'yellow',
  19: 'yellow',
  20: 'red',
};

function buildCalendar() {
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return {
      date: `July ${day}`,
      color:
        CAL_COLOR_OVERRIDES[day] ?? CAL_COLOR_CYCLE[i % CAL_COLOR_CYCLE.length],
      today: day === CAL_TODAY_DAY,
    };
  });
}

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
    calendar: buildCalendar(),
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
      { id: 7, name: 'Project Name' },
      { id: 8, name: 'Project Name' },
      { id: 9, name: 'Project Name' },
    ],
  },
};

// -------------------- Design tokens (from Figma) --------------------
const C = {
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#e5e5e5',
  divider: 'rgba(198,198,198,0.4)',
  text: '#0a0a0a',
  textMuted: '#a4a4a4',
  textMedium: '#4f4f4f',
  green: '#00db75',
  greenDeep: '#00b963',
  yellow: '#fdd33b',
  red: '#e52a05',
};

const HEALTH_GRADIENTS = {
  healthy:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #d6f7e6 55%, #7ee9b0 85%, #00db75 105%)',
  strained:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #fff2c4 55%, #ffe07a 85%, #fdd33b 105%)',
  critical:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #ffd6cc 55%, #ff8f74 85%, #e52a05 105%)',
};

const BAR_COLORS = {
  green: { active: C.green, faded: '#a9e5c8' },
  yellow: { active: C.yellow, faded: '#fbe7a1' },
  red: { active: C.red, faded: '#f5a58f' },
};

const CAL_DAYS = mockData.pulse.calendar;
const TODAY_IDX = CAL_DAYS.findIndex((d) => d.today);

// Seven days on screen at a time; the middle slot is the focal one.
const CAL_WINDOW = 7;
const CAL_CENTER = (CAL_WINDOW - 1) / 2;
const CAL_MAX_START = Math.max(0, CAL_DAYS.length - CAL_WINDOW);
const CAL_ROW_PITCH = 48; // row height + gap — converts drag distance into days

const clampCalStart = (i) => Math.max(0, Math.min(CAL_MAX_START, i));

// Bar width tapers by distance from the centered slot — center widest, edges narrowest.
const BAR_WIDTHS_BY_DIST = [128, 108, 92, 74];
function barPx(slot) {
  const dist = Math.abs(slot - CAL_CENTER);
  return BAR_WIDTHS_BY_DIST[dist] ?? BAR_WIDTHS_BY_DIST[BAR_WIDTHS_BY_DIST.length - 1];
}

function statusKey(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('strain')) return 'strained';
  if (s.includes('critic')) return 'critical';
  return 'healthy';
}

// -------------------- Tiny inline icons --------------------
const IconChevron = ({ dir = 'right', size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    style={{
      transform: dir === 'left' ? 'rotate(180deg)' : 'none',
      display: 'block',
    }}
  >
    <path
      d="M4 2 L8 6 L4 10"
      stroke={C.text}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const IconPlus = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path
      d="M6 2 V10 M2 6 H10"
      stroke={C.text}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IconGrid = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="3.5" height="3.5" rx="0.6" fill={C.text} />
    <rect x="7" y="1.5" width="3.5" height="3.5" rx="0.6" fill={C.text} />
    <rect x="1.5" y="7" width="3.5" height="3.5" rx="0.6" fill={C.text} />
    <rect x="7" y="7" width="3.5" height="3.5" rx="0.6" fill={C.text} />
  </svg>
);

const IconList = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <circle cx="2" cy="3" r="0.9" fill={C.text} />
    <circle cx="2" cy="6" r="0.9" fill={C.text} />
    <circle cx="2" cy="9" r="0.9" fill={C.text} />
    <path
      d="M4.5 3 H10 M4.5 6 H10 M4.5 9 H10"
      stroke={C.text}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

// -------------------- Component --------------------
export default function App() {
  const [screen, setScreen] = useState(0); // 0=pulse, 1=canvas
  const [todos, setTodos] = useState(mockData.pulse.todos);
  const [focusIdx, setFocusIdx] = useState(0);
  // Index of the first day in the visible 7-day calendar window.
  const [calStart, setCalStart] = useState(() => clampCalStart(TODAY_IDX - CAL_CENTER));

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const canvasScrollRef = useRef(null);

  const stepCal = (days) => setCalStart((s) => clampCalStart(s + days));

  const toggleTodo = (id) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setScreen(0);
      else if (e.key === 'ArrowRight') setScreen(1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowUp' ? -1 : 1;
        if (screen === 0) {
          setFocusIdx((i) => Math.max(0, Math.min(todos.length - 1, i + dir)));
          stepCal(dir);
        } else {
          canvasScrollRef.current?.scrollBy({ top: dir * 120, behavior: 'smooth' });
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

  return (
    <div style={S.root}>
      <div
        style={S.frame}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {screen === 0 ? (
          <PulseScreen
            health={health}
            hk={hk}
            todos={todos}
            focusIdx={focusIdx}
            setFocusIdx={setFocusIdx}
            toggleTodo={toggleTodo}
            calStart={calStart}
            stepCal={stepCal}
          />
        ) : (
          <CanvasScreen scrollRef={canvasScrollRef} />
        )}

        <div style={S.dots}>
          {[0, 1].map((i) => (
            <div
              key={i}
              onClick={() => setScreen(i)}
              style={{
                ...S.dot,
                width: screen === i ? 22 : 6,
                background: screen === i ? C.text : '#cccccc',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------- Pulse screen --------------------
function PulseScreen({
  health,
  hk,
  todos,
  focusIdx,
  setFocusIdx,
  toggleTodo,
  calStart,
  stepCal,
}) {
  // Wheel and drag both accumulate distance and spend it a whole day at a time,
  // so the window never lands between days.
  const wheelAcc = useRef(0);
  const dragFrom = useRef(null);

  const onWheel = (e) => {
    wheelAcc.current += e.deltaY;
    const days = Math.trunc(wheelAcc.current / CAL_ROW_PITCH);
    if (days) {
      wheelAcc.current -= days * CAL_ROW_PITCH;
      stepCal(days);
    }
  };

  const onCalTouchStart = (e) => {
    dragFrom.current = e.touches[0].clientY;
  };
  const onCalTouchMove = (e) => {
    if (dragFrom.current == null) return;
    const dy = dragFrom.current - e.touches[0].clientY; // drag up → later days
    const days = Math.trunc(dy / CAL_ROW_PITCH);
    if (days) {
      dragFrom.current -= days * CAL_ROW_PITCH;
      stepCal(days);
    }
  };
  const onCalTouchEnd = () => {
    dragFrom.current = null;
  };

  const visible = CAL_DAYS.slice(calStart, calStart + CAL_WINDOW);
  const month = (visible[CAL_CENTER] ?? CAL_DAYS[0])?.date.split(' ')[0];

  return (
    <div style={S.pulse}>
      <div style={S.pageLabel}>Pulse</div>

      <div style={S.pulseCols}>
        <div style={S.leftCol}>
          {/* Today / Health card */}
          <div
            style={{
              ...S.card,
              ...S.todayCard,
              background: HEALTH_GRADIENTS[hk],
            }}
          >
            <div>
              <div style={S.cardTitle}>Today</div>
              <div style={S.todaySubtitle}>{health.subtitle}</div>
            </div>
            <div style={S.todayFooter}>
              <div style={S.projectsBlock}>
                <div style={S.projectsLabel}>Projects</div>
                <div style={S.projectsValue}>{health.projects}</div>
              </div>
              <div style={S.statusBig}>{health.status}</div>
            </div>
          </div>

          {/* To-Dos card */}
          <div style={{ ...S.card, ...S.todosCard }}>
            <div style={S.todosHeader}>
              <div style={S.cardTitle}>To-Dos</div>
              <div style={S.iconBtn}>
                <IconPlus />
              </div>
            </div>
            <ul style={S.todoList}>
              {todos.map((t, i) => {
                const focused = focusIdx === i;
                return (
                  <li
                    key={t.id}
                    style={{
                      ...S.todoItem,
                      background: focused
                        ? 'rgba(0,0,0,0.03)'
                        : 'transparent',
                    }}
                    onClick={() => {
                      setFocusIdx(i);
                      toggleTodo(t.id);
                    }}
                  >
                    <span
                      style={{
                        ...S.checkbox,
                        borderColor: t.done ? C.text : '#c0c0c0',
                        background: t.done ? C.text : 'transparent',
                      }}
                    >
                      {t.done && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M2 5.2 L4.2 7.2 L8 3"
                            stroke="#ffffff"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      style={{
                        ...S.todoText,
                        color: t.done ? C.textMuted : C.text,
                        textDecoration: t.done ? 'line-through' : 'none',
                      }}
                    >
                      {t.text}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div style={S.seeAll}>See All</div>
          </div>
        </div>

        {/* Calendar card */}
        <div style={{ ...S.card, ...S.calendarCard }}>
          <div style={S.calendarHeader}>
            <div style={S.monthNav}>
              <IconChevron dir="left" size={11} />
              <span style={S.monthName}>{month}</span>
              <IconChevron dir="right" size={11} />
            </div>
            <div style={S.viewToggle}>
              <div style={S.viewToggleBtn}>
                <IconGrid size={11} />
              </div>
              <div style={{ ...S.viewToggleBtn, background: '#ffffff' }}>
                <IconList size={11} />
              </div>
            </div>
          </div>

          <div
            style={S.calendarBody}
            onWheel={onWheel}
            onTouchStart={onCalTouchStart}
            onTouchMove={onCalTouchMove}
            onTouchEnd={onCalTouchEnd}
          >
            {visible.map((d, slot) => {
              const bar = BAR_COLORS[d.color];
              const isPast = TODAY_IDX >= 0 && calStart + slot < TODAY_IDX;
              const fill = isPast ? bar.faded : bar.active;
              // The centered day carries the emphasis, Today included.
              const isCenter = slot === CAL_CENTER;
              return (
                <div key={d.date} style={S.calRow}>
                  <div
                    style={{
                      ...S.calDate,
                      color: isCenter ? C.text : '#c9c9c9',
                      fontWeight: isCenter ? 700 : 500,
                    }}
                  >
                    {d.today ? 'Today' : d.date}
                  </div>
                  <div
                    style={{
                      ...S.calBar,
                      width: barPx(slot),
                      height: isCenter ? 48 : 40,
                      background: fill,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- Canvas screen --------------------
function CanvasScreen({ scrollRef }) {
  return (
    <div style={S.canvas}>
      <div style={S.pageLabel}>Canvases</div>
      <div ref={scrollRef} className="kiosk-scroll" style={S.canvasScroll}>
        <div style={S.grid}>
          {mockData.canvas.projects.map((p, i) => (
            <div key={p.id} style={S.projectCard}>
              <div style={S.thumb}>
                <ProjectThumb seed={i} />
              </div>
              <div style={S.projectName}>{p.name}</div>
              <div style={S.projectMeta}>Active • Edited 3h ago</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Decorative canvas-thumbnail pattern (mocked whiteboard look)
function ProjectThumb({ seed }) {
  const rects = [
    { x: 20, y: 40, w: 44, h: 32, color: '#f5f5f5' },
    { x: 72, y: 34, w: 30, h: 24, color: '#e6e6e6' },
    { x: 110, y: 44, w: 40, h: 28, color: '#efefef' },
    { x: 30, y: 80, w: 36, h: 24, color: '#eeeeee' },
    { x: 78, y: 78, w: 48, h: 28, color: '#f0f0f0' },
    { x: 132, y: 82, w: 22, h: 22, color: '#e6e6e6' },
  ];
  return (
    <svg
      viewBox="0 0 180 130"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="180" height="130" fill="#fafafa" />
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x + (seed % 3) * 2}
          y={r.y}
          width={r.w}
          height={r.h}
          rx="3"
          fill={r.color}
          stroke="#e5e5e5"
          strokeWidth="0.6"
        />
      ))}
      <path
        d="M45 60 C 70 55, 90 70, 130 70"
        stroke="#d4d4d4"
        strokeWidth="0.8"
        fill="none"
      />
    </svg>
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
    background: C.bg,
    color: C.text,
    overflow: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },

  pageLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: C.text,
    letterSpacing: '-0.2px',
    marginBottom: 6,
  },

  // ---- Pulse screen ----
  pulse: {
    width: '100%',
    height: '100%',
    padding: 14,
    paddingBottom: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  pulseCols: {
    flex: 1,
    display: 'flex',
    gap: 10,
    minHeight: 0,
  },
  leftCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
  },

  card: {
    background: C.card,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    overflow: 'hidden',
  },

  // ---- Today card ----
  todayCard: {
    flex: '0 0 auto',
    height: 172,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.3px',
    lineHeight: 1.1,
  },
  todaySubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: 500,
    color: C.textMuted,
    lineHeight: 1.35,
    maxWidth: '68%',
  },
  todayFooter: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  projectsBlock: { display: 'flex', flexDirection: 'column', gap: 2 },
  projectsLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: C.textMuted,
    letterSpacing: '0.2px',
  },
  projectsValue: {
    fontSize: 13,
    fontWeight: 500,
    color: C.text,
    letterSpacing: '-0.2px',
  },
  statusBig: {
    fontSize: 40,
    fontWeight: 400,
    color: C.text,
    letterSpacing: '-2px',
    lineHeight: 0.95,
    textAlign: 'right',
  },

  // ---- To-Dos card ----
  todosCard: {
    flex: 1,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  todosHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: '#f5f5f5',
    border: `1px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  todoList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '4px 4px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: '1.4px solid #c0c0c0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 120ms ease',
  },
  todoText: {
    fontSize: 12.5,
    fontWeight: 500,
    lineHeight: 1.2,
  },
  seeAll: {
    marginTop: 6,
    fontSize: 11,
    color: C.textMuted,
    fontWeight: 500,
  },

  // ---- Calendar card ----
  calendarCard: {
    flex: '0 0 210px',
    background: '#efefef',
    border: 'none',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  calendarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  monthName: {
    fontSize: 17,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.4px',
  },
  viewToggle: {
    display: 'flex',
    background: 'transparent',
    borderRadius: 8,
    padding: 2,
    gap: 2,
    border: `1px solid ${C.border}`,
  },
  viewToggleBtn: {
    width: 22,
    height: 20,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    touchAction: 'none', // the window is stepped by hand, not natively scrolled
  },
  calRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexShrink: 0,
  },
  calDate: {
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.1px',
  },
  calBar: {
    borderRadius: 8,
    transition: 'width 200ms ease, height 200ms ease, background 200ms ease',
    flexShrink: 0,
  },

  // ---- Canvas screen ----
  canvas: {
    width: '100%',
    height: '100%',
    padding: 14,
    paddingBottom: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  canvasScroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    columnGap: 10,
    rowGap: 14,
  },
  projectCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },
  thumb: {
    width: '100%',
    aspectRatio: '5 / 3',
    borderRadius: 8,
    background: '#efefef',
    overflow: 'hidden',
  },
  projectName: {
    fontSize: 11,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.2px',
    lineHeight: 1.1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectMeta: {
    fontSize: 9,
    fontWeight: 500,
    color: C.textMuted,
    marginTop: -2,
    lineHeight: 1.1,
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
