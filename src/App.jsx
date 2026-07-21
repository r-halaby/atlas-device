import React, { useState, useEffect, useRef } from 'react';

// -------------------- Mock data --------------------
// The calendar holds a whole month; only CAL_WINDOW days sit on screen at once
// and scrolling slides that window one day at a time.
const CAL_YEAR = 2026;
const CAL_MONTH_INDEX = 6; // July
const CAL_DAYS_IN_MONTH = 31;
const CAL_TODAY_DAY = 17;
// Health is only known a week out; past that a day is grey rather than green.
const CAL_HORIZON_DAY = CAL_TODAY_DAY + 6;
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
  return Array.from({ length: CAL_DAYS_IN_MONTH }, (_, i) => {
    const day = i + 1;
    return {
      day,
      date: `July ${day}`,
      color:
        day > CAL_HORIZON_DAY
          ? 'grey'
          : (CAL_COLOR_OVERRIDES[day] ??
            CAL_COLOR_CYCLE[i % CAL_COLOR_CYCLE.length]),
      today: day === CAL_TODAY_DAY,
    };
  });
}

const mockData = {
  pulse: {
    cashFlow: '87%',
    // More than the Pulse card can show — the card lists what fits and
    // See All opens the rest.
    todos: [
      {
        id: 1,
        text: 'Update deck design',
        done: false,
        collection: 'No Collection',
        file: 'puma_f1_files',
        canvas: 'Puma Invite Concepts-02',
        assignee: null,
        dueIn: 2,
      },
      {
        id: 2,
        text: 'Schedule meeting with Brian',
        done: false,
        collection: 'No Collection',
        file: 'puma_f1_files',
        canvas: 'Puma Invite Concepts-02',
        assignee: null,
        dueIn: -39,
      },
      {
        id: 3,
        text: 'Review quarterly data with Rahmi',
        done: false,
        collection: 'No Collection',
        file: 'Creator Day Design',
        canvas: 'Creator Day Concepts-01',
        assignee: 'AC',
        dueIn: 0,
      },
      {
        id: 4,
        text: 'Send Northwind the revised invoice',
        done: false,
        collection: 'Finance',
        file: 'northwind_files',
        canvas: 'Northwind Retainer-01',
        assignee: null,
        dueIn: 5,
      },
      {
        id: 5,
        text: 'Draft Q3 retainer proposal',
        done: false,
        collection: 'Q3 Planning',
        file: 'northwind_files',
        canvas: 'Northwind Retainer-02',
        assignee: 'RH',
        dueIn: 12,
      },
      {
        id: 6,
        text: 'Pull analytics for the Vega launch',
        done: true,
        collection: 'No Collection',
        file: 'vega_launch',
        canvas: 'Vega Launch Deck-02',
        assignee: 'RH',
        dueIn: null,
      },
      {
        id: 7,
        text: 'Reply to Priya about the workshop',
        done: false,
        collection: 'No Collection',
        file: 'creator_day',
        canvas: 'Creator Day Concepts-03',
        assignee: 'AC',
        dueIn: -4,
      },
      {
        id: 8,
        text: 'Archive last quarter\u2019s canvases',
        done: true,
        collection: 'Housekeeping',
        file: 'archive_2026',
        canvas: 'Q2 Canvases',
        assignee: null,
        dueIn: null,
      },
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

// Each day's calendar color is its health signal, so the Today card and the
// calendar bar for the centered day always tell the same story.
const DAY_HEALTH = {
  green: {
    tone: 'healthy',
    status: 'Healthy',
    subtitle: 'Stable operations with capacity for growth',
    projects: 'Smooth',
  },
  yellow: {
    tone: 'strained',
    status: 'Caution',
    subtitle: 'Load is building — a few things need attention',
    projects: 'Tight',
  },
  red: {
    tone: 'critical',
    status: 'Critical',
    subtitle: 'Overcommitted — something has to give',
    projects: 'Blocked',
  },
  grey: {
    tone: 'unknown',
    status: 'Not yet',
    subtitle: 'Beyond the forecast — nothing logged for this day',
    projects: '—',
  },
};

const HEALTH_GRADIENTS = {
  healthy:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #d6f7e6 55%, #7ee9b0 85%, #00db75 105%)',
  strained:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #fff2c4 55%, #ffe07a 85%, #fdd33b 105%)',
  critical:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #ffd6cc 55%, #ff8f74 85%, #e52a05 105%)',
  unknown:
    'linear-gradient(105deg, #ffffff 0%, #ffffff 22%, #f0f0ec 55%, #e0e0da 85%, #cbcbc3 105%)',
};

const C_GREY = '#cbcbc3';

const BAR_COLORS = {
  green: { active: C.green, faded: '#a9e5c8' },
  yellow: { active: C.yellow, faded: '#fbe7a1' },
  red: { active: C.red, faded: '#f5a58f' },
  grey: { active: C_GREY, faded: '#e2e2dc' },
};

const CAL_DAYS = mockData.pulse.calendar;

// Month grid runs Monday-first, so the 1st needs leading blanks to land under
// its real weekday.
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const CAL_LEAD_BLANKS =
  (new Date(CAL_YEAR, CAL_MONTH_INDEX, 1).getDay() + 6) % 7;
const TODAY_IDX = CAL_DAYS.findIndex((d) => d.today);

// Seven days on screen at a time; the middle slot is the focal one.
const CAL_WINDOW = 7;
const CAL_CENTER = (CAL_WINDOW - 1) / 2;
const CAL_MAX_START = Math.max(0, CAL_DAYS.length - CAL_WINDOW);
const CAL_ROW_PITCH = 48; // row height + gap — converts drag distance into days

const clampCalStart = (i) => Math.max(0, Math.min(CAL_MAX_START, i));

// Height of the visible window: six 40px rows, one 48px center row, 8px gaps.
const CAL_VIEWPORT_H = (CAL_WINDOW - 1) * CAL_ROW_PITCH + 48;

// Bar width tapers by distance from the centered day — center widest, edges narrowest.
const BAR_WIDTHS_BY_DIST = [128, 108, 92, 74];
function barPx(offsetFromCenter) {
  const dist = Math.abs(offsetFromCenter);
  return BAR_WIDTHS_BY_DIST[dist] ?? BAR_WIDTHS_BY_DIST[BAR_WIDTHS_BY_DIST.length - 1];
}

// -------------------- Tiny inline icons --------------------
const IconChevron = ({ dir = 'right', size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    style={{
      transform:
        dir === 'left'
          ? 'rotate(180deg)'
          : dir === 'down'
            ? 'rotate(90deg)'
            : 'none',
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

const IconX = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path
      d="M3 3 L9 9 M9 3 L3 9"
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
  // See All covers the whole frame with the full to-do list; the calendar's
  // grid toggle covers it with the month view.
  const [todosOpen, setTodosOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [todoFilter, setTodoFilter] = useState('all'); // all | open | done
  const [facets, setFacets] = useState({
    canvas: ANY_CANVAS,
    user: ANY_USER,
    date: ANY_DATE,
  });
  // Index of the first day in the visible 7-day calendar window.
  const [calStart, setCalStart] = useState(() => clampCalStart(TODAY_IDX - CAL_CENTER));

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const canvasScrollRef = useRef(null);

  const stepCal = (days) => setCalStart((s) => clampCalStart(s + days));
  const centerCal = (idx) => setCalStart(clampCalStart(idx - CAL_CENTER));

  const toggleTodo = (id) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  const changeFilter = (f) => {
    setTodoFilter(f);
    setFocusIdx(0);
  };
  const setFacet = (key, value) => {
    setFacets((prev) => ({ ...prev, [key]: value }));
    setFocusIdx(0);
  };

  // Options come off the whole list, not the filtered one, so narrowing by
  // canvas doesn't empty out the user and date menus.
  const facetOptions = {
    canvas: [ANY_CANVAS, ...new Set(todos.map((t) => t.canvas))],
    user: [
      ANY_USER,
      ...new Set(todos.filter((t) => t.assignee).map((t) => t.assignee)),
      UNASSIGNED,
    ],
    date: DATE_OPTIONS,
  };

  // What the to-do page is showing. Keyboard focus walks this same list, so it
  // can never land on a row the filters are hiding.
  const pageTodos = todos.filter((t) => {
    if (todoFilter === 'open' && t.done) return false;
    if (todoFilter === 'done' && !t.done) return false;
    if (facets.canvas !== ANY_CANVAS && t.canvas !== facets.canvas) return false;
    if (facets.user === UNASSIGNED) {
      if (t.assignee) return false;
    } else if (facets.user !== ANY_USER && t.assignee !== facets.user) {
      return false;
    }
    return matchesDate(t, facets.date);
  });

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
      // While a full-frame page is up it owns the gesture: swipe back to
      // leave, and don't let a swipe change the screen underneath it.
      if (todosOpen) {
        if (dx > 0) setTodosOpen(false);
      } else if (monthOpen) {
        if (dx > 0) setMonthOpen(false);
      } else if (dx < 0) setScreen(1);
      else setScreen(0);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const onKey = (e) => {
      if (todosOpen) {
        if (e.key === 'Escape' || e.key === 'ArrowLeft') setTodosOpen(false);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const dir = e.key === 'ArrowUp' ? -1 : 1;
          setFocusIdx((i) =>
            Math.max(0, Math.min(pageTodos.length - 1, i + dir))
          );
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (pageTodos[focusIdx]) toggleTodo(pageTodos[focusIdx].id);
        }
        return;
      }
      if (monthOpen) {
        if (e.key === 'Escape' || e.key === 'ArrowLeft') setMonthOpen(false);
        return;
      }
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
  }, [screen, focusIdx, todos, todosOpen, monthOpen, pageTodos.length]);

  return (
    <div style={S.root}>
      <div
        style={S.frame}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {todosOpen ? (
          <TodosScreen
            todos={pageTodos}
            total={todos.length}
            filter={todoFilter}
            setFilter={changeFilter}
            facets={facets}
            facetOptions={facetOptions}
            setFacet={setFacet}
            focusIdx={focusIdx}
            setFocusIdx={setFocusIdx}
            toggleTodo={toggleTodo}
            onBack={() => setTodosOpen(false)}
          />
        ) : monthOpen ? (
          <MonthScreen
            onClose={() => setMonthOpen(false)}
            onPickDay={(idx) => {
              centerCal(idx);
              setMonthOpen(false);
            }}
          />
        ) : screen === 0 ? (
          <PulseScreen
            todos={todos}
            focusIdx={focusIdx}
            setFocusIdx={setFocusIdx}
            toggleTodo={toggleTodo}
            calStart={calStart}
            stepCal={stepCal}
            centerCal={centerCal}
            onSeeAll={() => setTodosOpen(true)}
            onOpenMonth={() => setMonthOpen(true)}
          />
        ) : (
          <CanvasScreen scrollRef={canvasScrollRef} />
        )}

        {/* The dots page between Pulse and Canvases. The full-frame pages are
            not among them, so the dots hide while one is up. */}
        {!todosOpen && !monthOpen && (
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
        )}
      </div>
    </div>
  );
}

// -------------------- Pulse screen --------------------
function PulseScreen({
  todos,
  focusIdx,
  setFocusIdx,
  toggleTodo,
  calStart,
  stepCal,
  centerCal,
  onSeeAll,
  onOpenMonth,
}) {
  // Wheel and drag both accumulate distance and spend it a whole day at a time,
  // so the window never lands between days.
  const wheelAcc = useRef(0);
  const dragFrom = useRef(null); // moving reference, drawn down as steps are spent
  const dragOrigin = useRef(null); // fixed, only to tell a tap from a drag
  const dragged = useRef(false);

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
    dragOrigin.current = e.touches[0].clientY;
    dragged.current = false;
  };
  const onCalTouchMove = (e) => {
    if (dragFrom.current == null) return;
    const y = e.touches[0].clientY;
    if (Math.abs(dragOrigin.current - y) > 6) dragged.current = true;
    const dy = dragFrom.current - y; // drag up → later days
    const days = Math.trunc(dy / CAL_ROW_PITCH);
    if (days) {
      dragFrom.current -= days * CAL_ROW_PITCH;
      stepCal(days);
    }
  };
  const onCalTouchEnd = () => {
    dragFrom.current = null;
  };

  // Tapping a day brings it to the center — but a drag ends in a click too, so
  // only an unmoved finger counts as a tap.
  const onDayClick = (idx) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    centerCal(idx);
  };

  // The Today card reads off the centered day, so both panels stay in step.
  const centerIdx = calStart + CAL_CENTER;
  const centerDay = CAL_DAYS[centerIdx] ?? CAL_DAYS[0];
  // The header names the week on screen, not the month.
  const first = CAL_DAYS[calStart];
  const last = CAL_DAYS[Math.min(calStart + CAL_WINDOW - 1, CAL_DAYS.length - 1)];
  const abbr = (d) => d.date.split(' ')[0].slice(0, 3);
  const weekRange =
    abbr(first) === abbr(last)
      ? `${abbr(first)} ${first.day} – ${last.day}`
      : `${abbr(first)} ${first.day} – ${abbr(last)} ${last.day}`;
  const health = DAY_HEALTH[centerDay.color];

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
              background: HEALTH_GRADIENTS[health.tone],
            }}
          >
            <div>
              <div style={S.cardTitle}>
                {centerDay.today ? 'Today' : centerDay.date}
              </div>
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
            <ul className="kiosk-scroll" style={S.todoList}>
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
            <div style={S.seeAll} onClick={onSeeAll}>
              See All
            </div>
          </div>
        </div>

        {/* Calendar card */}
        <div style={{ ...S.card, ...S.calendarCard }}>
          <div style={S.calendarHeader}>
            <div style={S.monthNav}>
              <div style={S.weekNavBtn} onClick={() => stepCal(-CAL_WINDOW)}>
                <IconChevron dir="left" size={11} />
              </div>
              <span style={S.weekRange}>{weekRange}</span>
              <div style={S.weekNavBtn} onClick={() => stepCal(CAL_WINDOW)}>
                <IconChevron dir="right" size={11} />
              </div>
            </div>
            <div style={S.viewToggle}>
              <div style={S.viewToggleBtn} onClick={onOpenMonth}>
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
            <div style={S.calViewport}>
              {/* Every day is rendered once, in fixed DOM order — only the
                  strip's offset and each bar's size change, so the browser
                  has a stable "before" style to transition from. */}
              <div
                style={{
                  ...S.calStrip,
                  transform: `translateY(${-calStart * CAL_ROW_PITCH}px)`,
                }}
              >
                {CAL_DAYS.map((d, idx) => {
                  const bar = BAR_COLORS[d.color];
                  // The centered day carries the emphasis, Today included.
                  const isCenter = idx === centerIdx;
                  // Only past days away from the center fade — the centered day
                  // always reads at full saturation, as does anything upcoming.
                  const isPast = TODAY_IDX >= 0 && idx < TODAY_IDX && !isCenter;
                  const fill = isPast ? bar.faded : bar.active;
                  return (
                    <div
                      key={d.date}
                      style={S.calRow}
                      onClick={() => onDayClick(idx)}
                    >
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
                          width: barPx(idx - centerIdx),
                          height: isCenter ? 48 : 40,
                          background: fill,
                          boxShadow: `0 0 0 2px ${isCenter ? C.text : 'transparent'}`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- Month page --------------------
// Behind the calendar card's grid toggle. Monday-first month grid, one circle
// per day coloured by that day's health.
function MonthScreen({ onClose, onPickDay }) {
  const cells = [
    ...Array.from({ length: CAL_LEAD_BLANKS }, (_, i) => ({ blank: true, key: `b${i}` })),
    ...CAL_DAYS.map((d, idx) => ({ d, idx, key: d.date })),
  ];

  return (
    <div style={S.monthPage}>
      <div style={S.monthHeader}>
        <div style={S.monthNav}>
          <IconChevron dir="left" size={12} />
          <span style={S.monthNameBig}>
            {CAL_DAYS[0].date.split(' ')[0]}
          </span>
          <IconChevron dir="right" size={12} />
        </div>
        <div style={S.closeBtn} onClick={onClose}>
          <IconX size={11} />
        </div>
      </div>

      <div style={S.weekHead}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={S.weekHeadCell}>
            {w}
          </div>
        ))}
      </div>

      <div style={S.monthGrid}>
        {cells.map((c) =>
          c.blank ? (
            <div key={c.key} style={S.dayBlank} />
          ) : (
            <div
              key={c.key}
              style={{
                ...S.dayCell,
                background: BAR_COLORS[c.d.color].active,
                boxShadow: c.d.today ? `0 0 0 2px ${C.text}` : 'none',
              }}
              onClick={() => onPickDay(c.idx)}
            >
              {c.d.day}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// -------------------- To-Dos page --------------------
// The full list, behind the Pulse card's See All. Covers the whole frame, so
// it carries its own way back rather than relying on the dots.
const TODO_FILTERS = ['All', 'Open', 'Done'];

const ANY_CANVAS = 'All Canvases';
const ANY_USER = 'All Users';
const ANY_DATE = 'Any Date';
const UNASSIGNED = 'Unassigned';
const DATE_OPTIONS = [ANY_DATE, 'Overdue', 'Due today', 'Next 7 days', 'No date'];

// dueIn is days from today: negative is overdue, null is undated.
function matchesDate(t, opt) {
  switch (opt) {
    case 'Overdue':
      return t.dueIn != null && t.dueIn < 0;
    case 'Due today':
      return t.dueIn === 0;
    case 'Next 7 days':
      return t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 7;
    case 'No date':
      return t.dueIn == null;
    default:
      return true;
  }
}

function TodosScreen({
  todos,
  total,
  filter,
  setFilter,
  facets,
  facetOptions,
  setFacet,
  focusIdx,
  setFocusIdx,
  toggleTodo,
  onBack,
}) {
  const [openMenu, setOpenMenu] = useState(null); // canvas | user | date | null

  const FACETS = [
    { key: 'canvas', any: ANY_CANVAS },
    { key: 'user', any: ANY_USER },
    { key: 'date', any: ANY_DATE },
  ];

  return (
    <div style={S.todosPage}>
      {/* Header and filters stay put; only the list below them scrolls. */}
      <div style={S.todosPageHeader}>
        <div style={S.backBtn} onClick={onBack}>
          <IconChevron dir="left" size={12} />
        </div>
        <div style={S.todosPageTitle}>All To-Dos</div>
        <div style={S.newTodoBtn}>
          <IconPlus size={10} />
          <span>New To-Do</span>
        </div>
      </div>

      <div style={S.segmented}>
        {TODO_FILTERS.map((f) => {
          const key = f.toLowerCase();
          const on = key === filter;
          return (
            <div
              key={f}
              onClick={() => setFilter(key)}
              style={{
                ...S.segItem,
                background: on ? C.card : 'transparent',
                color: on ? C.text : C.textMuted,
                fontWeight: on ? 600 : 500,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {f}
            </div>
          );
        })}
      </div>

      {/* An open menu lays a backdrop over the page so a tap anywhere else
          dismisses it rather than falling through to a to-do row. */}
      {openMenu && (
        <div style={S.menuBackdrop} onClick={() => setOpenMenu(null)} />
      )}

      <div style={S.dropdownRow}>
        {FACETS.map(({ key, any }) => {
          const value = facets[key];
          const active = value !== any;
          return (
            <div key={key} style={S.dropdownWrap}>
              <div
                style={{
                  ...S.dropdown,
                  color: active ? C.text : C.textMuted,
                  background: active ? '#e6e6e6' : '#f0f0f0',
                }}
                onClick={() => setOpenMenu(openMenu === key ? null : key)}
              >
                <span style={S.dropdownLabel}>{value}</span>
                <IconChevron dir="down" size={9} />
              </div>

              {openMenu === key && (
                <div className="kiosk-scroll" style={S.menu}>
                  {facetOptions[key].map((opt) => (
                    <div
                      key={opt}
                      style={{
                        ...S.menuItem,
                        color: opt === value ? C.text : C.textMedium,
                        fontWeight: opt === value ? 600 : 500,
                        background:
                          opt === value ? 'rgba(0,0,0,0.04)' : 'transparent',
                      }}
                      onClick={() => {
                        setFacet(key, opt);
                        setOpenMenu(null);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ul className="kiosk-scroll" style={S.todosPageList}>
        {todos.map((t, i) => {
          const focused = focusIdx === i;
          return (
            <li
              key={t.id}
              style={{
                ...S.todoRow,
                background: focused ? 'rgba(0,0,0,0.03)' : 'transparent',
              }}
              onClick={() => {
                setFocusIdx(i);
                toggleTodo(t.id);
              }}
            >
              <span
                style={{
                  ...S.checkbox,
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  marginTop: 1,
                  borderColor: t.done ? C.text : '#d4d4d4',
                  background: t.done ? C.text : 'transparent',
                }}
              >
                {t.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
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

              <div style={S.todoRowBody}>
                <div style={S.todoRowTitleLine}>
                  <span
                    style={{
                      ...S.todoRowTitle,
                      color: t.done ? C.textMuted : C.text,
                      textDecoration: t.done ? 'line-through' : 'none',
                    }}
                  >
                    {t.text}
                  </span>
                  {t.dueIn != null && t.dueIn < 0 && !t.done && (
                    <span style={S.overduePill}>{-t.dueIn}d overdue</span>
                  )}
                </div>
                <div style={S.todoRowMeta}>
                  {[t.collection, t.file, t.canvas].join('  ·  ')}
                </div>
              </div>

              {t.assignee && <span style={S.avatar}>{t.assignee}</span>}
            </li>
          );
        })}

        {todos.length === 0 && (
          <li style={S.todosEmpty}>No to-dos match these filters — {total} in all</li>
        )}
      </ul>
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
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '4px 4px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 120ms ease',
    // Without this the rows compress in the column flex instead of scrolling.
    flexShrink: 0,
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
    cursor: 'pointer',
  },

  // ---- Month page ----
  monthPage: {
    width: '100%',
    height: '100%',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    background: C.bg,
  },
  monthHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  monthNameBig: {
    fontSize: 22,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    background: C.card,
    border: `1px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  weekHead: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 8,
    margin: '18px 0 8px',
    flexShrink: 0,
  },
  weekHeadCell: {
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: '0.7px',
    color: '#c2c2c2',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 8,
    alignContent: 'start',
  },
  dayBlank: {
    aspectRatio: '1 / 1',
  },
  dayCell: {
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
    cursor: 'pointer',
  },

  // ---- To-Dos page ----
  todosPage: {
    width: '100%',
    height: '100%',
    padding: 14,
    paddingBottom: 0, // the list runs to the bottom edge
    display: 'flex',
    flexDirection: 'column',
    background: C.card,
    minHeight: 0,
  },
  todosPageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  backBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    background: C.card,
    border: `1px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  todosPageTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.4px',
    lineHeight: 1.1,
  },
  newTodoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    height: 26,
    padding: '0 10px',
    borderRadius: 8,
    background: '#f2f2f2',
    border: `1px solid ${C.border}`,
    fontSize: 11,
    fontWeight: 500,
    color: C.text,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    flexShrink: 0,
  },

  segmented: {
    display: 'flex',
    alignSelf: 'flex-start',
    background: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
    gap: 2,
    marginTop: 10,
    flexShrink: 0,
  },
  segItem: {
    minWidth: 46,
    height: 22,
    padding: '0 10px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'background 120ms ease, color 120ms ease',
  },
  dropdownRow: {
    display: 'flex',
    gap: 6,
    marginTop: 6,
    flexShrink: 0,
  },
  dropdownWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  menuBackdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    zIndex: 10,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    padding: 4,
    maxHeight: 168,
    overflowY: 'auto',
  },
  menuItem: {
    padding: '7px 8px',
    borderRadius: 6,
    fontSize: 10,
    lineHeight: 1.2,
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    width: '100%',
    minWidth: 0,
    height: 24,
    padding: '0 8px',
    borderRadius: 8,
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    fontSize: 10,
    fontWeight: 500,
    color: C.textMuted,
  },
  dropdownLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // The list is the only scrolling region. Negative margins let the row
  // dividers run full-bleed to the frame edges, as in the reference.
  todosPageList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px -14px 0 -14px',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  todoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '9px 14px',
    borderTop: '1px solid #ededed',
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  todoRowBody: {
    flex: 1,
    minWidth: 0,
  },
  todoRowTitleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  todoRowTitle: {
    fontSize: 12.5,
    fontWeight: 500,
    lineHeight: 1.25,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  overduePill: {
    fontSize: 9,
    fontWeight: 500,
    color: C.red,
    background: '#fdecea',
    padding: '2px 5px',
    borderRadius: 4,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  todoRowMeta: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: 500,
    color: C.textMuted,
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#e8e8e8',
    color: C.textMedium,
    fontSize: 8.5,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  todosEmpty: {
    padding: '20px 14px',
    fontSize: 11,
    fontWeight: 500,
    color: C.textMuted,
    borderTop: '1px solid #ededed',
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
    gap: 4,
    minWidth: 0,
  },
  weekNavBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    cursor: 'pointer',
    flexShrink: 0,
  },
  weekRange: {
    fontSize: 13,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.3px',
    whiteSpace: 'nowrap',
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
    overflow: 'hidden',
    touchAction: 'none', // the window is stepped by hand, not natively scrolled
  },
  calViewport: {
    height: CAL_VIEWPORT_H,
    overflow: 'hidden',
    flexShrink: 0,
  },
  calStrip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'transform 200ms ease',
    willChange: 'transform',
  },
  calRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexShrink: 0,
    cursor: 'pointer',
  },
  calDate: {
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.1px',
  },
  calBar: {
    borderRadius: 8,
    // The ring is a spread shadow, so it sits 2px outside the block instead of
    // eating into it, and costs no layout. Every bar carries one at full spread
    // and only its color animates, so it fades in as the block grows.
    boxShadow: '0 0 0 2px transparent',
    transition:
      'width 200ms ease, height 200ms ease, background 200ms ease, box-shadow 200ms ease',
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
