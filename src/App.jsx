import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';
import { MOCK_TODOS, MOCK_PROJECTS, MOCK_TIMER, MOCK_NOTES } from './mock/mockData.js';
import { createMockSageAPI } from './mock/mockSageAPI.js';
import { useSage } from './hooks/useSage.js';
import SplashScreen from './SplashScreen.jsx';
import SageOverlay from './components/SageOverlay.jsx';

// Kiosk runs against Convex when a URL is configured; otherwise it renders
// mock todos so design work keeps flowing while the backend catches up.
const USE_CONVEX = Boolean(import.meta.env.VITE_CONVEX_URL);

function useConvexTodos() {
  const todos = useQuery(anyApi.canvasTodos.listOrgTodos) ?? [];
  const mutate = useMutation(anyApi.canvasTodos.toggleOrgTodo);
  const toggleTodo = (todo) => {
    if (!todo) return;
    mutate({ nodeId: todo.nodeId, todoId: todo.todoId, completed: !todo.completed });
  };
  return { todos, toggleTodo };
}

function useMockTodos() {
  const [todos, setTodos] = useState(MOCK_TODOS);
  const toggleTodo = (todo) => {
    if (!todo) return;
    setTodos((prev) =>
      prev.map((t) =>
        t.todoId === todo.todoId ? { ...t, completed: !t.completed } : t,
      ),
    );
  };
  return { todos, toggleTodo };
}

const useTodoData = USE_CONVEX ? useConvexTodos : useMockTodos;

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

// Design canvas stays 480; the frame is rendered onto a 720x720 panel via
// CSS zoom, so all pixel constants below are in DESIGN space.
const DESIGN_SIZE = 480;
const PANEL_SIZE = 720;
const SCALE = PANEL_SIZE / DESIGN_SIZE;

// Seven days on screen at a time; the middle slot is the focal one.
const CAL_WINDOW = 7;
const CAL_CENTER = (CAL_WINDOW - 1) / 2;
const CAL_MAX_START = Math.max(0, CAL_DAYS.length - CAL_WINDOW);
const CAL_ROW_PITCH = 48; // row height + gap — converts drag distance into days

// clientX/clientY from touch events are in VIEWPORT pixels, not design pixels.
// Interaction thresholds that compare against those deltas must be scaled up
// so a "one row drag" and a "swipe" feel the same on the 720 panel as on 480.
const SWIPE_THRESHOLD = 45 * SCALE;
const CAL_ROW_PITCH_VIEWPORT = CAL_ROW_PITCH * SCALE;

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
  const { todos: baseTodos, toggleTodo: baseToggle } = useTodoData();
  const [focusIdx, setFocusIdx] = useState(0);
  // See All covers the whole frame with the full to-do list.
  const [todosOpen, setTodosOpen] = useState(false);
  const [todoFilter, setTodoFilter] = useState('all'); // all | open | done
  const [facets, setFacets] = useState({ canvas: ANY_CANVAS });
  // Index of the first day in the visible 7-day calendar window.
  const [calStart, setCalStart] = useState(() => clampCalStart(TODAY_IDX - CAL_CENTER));
  // Splash plays every load — on the Pi, "every load" == "every boot".
  const [splashDone, setSplashDone] = useState(false);

  // Sage state lives here so mockSageAPI's setters and the display code can
  // both reach it. Todos added by Sage go into their own bucket and are
  // concatenated with the primary list, so Sage never touches the (possibly
  // Convex-backed) primary state.
  const [sageAddedTodos, setSageAddedTodos] = useState([]);
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [timer, setTimer] = useState(MOCK_TIMER);
  const [notes, setNotes] = useState(MOCK_NOTES);

  const todos = useMemo(
    () => [...baseTodos, ...sageAddedTodos],
    [baseTodos, sageAddedTodos],
  );

  const toggleTodo = (todo) => {
    if (!todo) return;
    if (sageAddedTodos.some((t) => t.todoId === todo.todoId)) {
      setSageAddedTodos((prev) =>
        prev.map((t) => (t.todoId === todo.todoId ? { ...t, completed: !t.completed } : t)),
      );
    } else {
      baseToggle(todo);
    }
  };

  const sageAPI = useMemo(
    () => createMockSageAPI({
      setTodos: setSageAddedTodos,
      setProjects,
      setTimer,
      setNotes,
      setScreen,
    }),
    [],
  );

  const sage = useSage({
    onConfirm: (action) => sageAPI.dispatch(action, projects),
  });

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const canvasScrollRef = useRef(null);

  const stepCal = (days) => setCalStart((s) => clampCalStart(s + days));
  const centerCal = (idx) => setCalStart(clampCalStart(idx - CAL_CENTER));

  const changeFilter = (f) => {
    setTodoFilter(f);
    setFocusIdx(0);
  };
  const setFacet = (key, value) => {
    setFacets((prev) => ({ ...prev, [key]: value }));
    setFocusIdx(0);
  };

  const facetOptions = {
    canvas: [ANY_CANVAS, ...new Set(todos.map((t) => t.canvasName))],
  };

  // What the to-do page is showing. Keyboard focus walks this same list, so it
  // can never land on a row the filters are hiding.
  const pageTodos = todos.filter((t) => {
    if (todoFilter === 'open' && t.completed) return false;
    if (todoFilter === 'done' && !t.completed) return false;
    if (facets.canvas !== ANY_CANVAS && t.canvasName !== facets.canvas) return false;
    return true;
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
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      // While the to-do page is up it owns the gesture: swipe back to leave,
      // and don't let a swipe change the screen underneath it.
      if (todosOpen) {
        if (dx > 0) setTodosOpen(false);
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
          toggleTodo(pageTodos[focusIdx]);
        }
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
          toggleTodo(todos[focusIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, focusIdx, todos, todosOpen]);

  return (
    <div style={S.root}>
      <div
        style={S.frame}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        <SageOverlay
          view={sage.view}
          pendingAction={sage.pendingAction}
          error={sage.error}
          projects={projects}
          onConfirm={sage.confirm}
          onCancel={sage.cancel}
          onChooseCandidate={sage.chooseAmbiguousOption}
        />
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
          />
        ) : (
          <CanvasScreen scrollRef={canvasScrollRef} />
        )}

        {/* The dots page between Pulse and Canvases — the to-do page is not
            one of them, so it hides while that page is up. */}
        {!todosOpen && (
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
}) {
  // Wheel and drag both accumulate distance and spend it a whole day at a time,
  // so the window never lands between days.
  const wheelAcc = useRef(0);
  const dragFrom = useRef(null); // moving reference, drawn down as steps are spent
  const dragOrigin = useRef(null); // fixed, only to tell a tap from a drag
  const dragged = useRef(false);

  const onWheel = (e) => {
    wheelAcc.current += e.deltaY;
    const days = Math.trunc(wheelAcc.current / CAL_ROW_PITCH_VIEWPORT);
    if (days) {
      wheelAcc.current -= days * CAL_ROW_PITCH_VIEWPORT;
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
    if (Math.abs(dragOrigin.current - y) > 6 * SCALE) dragged.current = true;
    const dy = dragFrom.current - y; // drag up → later days
    const days = Math.trunc(dy / CAL_ROW_PITCH_VIEWPORT);
    if (days) {
      dragFrom.current -= days * CAL_ROW_PITCH_VIEWPORT;
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
  const month = centerDay.date.split(' ')[0];
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
            <ul style={S.todoList}>
              {todos.map((t, i) => {
                const focused = focusIdx === i;
                return (
                  <li
                    key={t.todoId}
                    style={{
                      ...S.todoItem,
                      background: focused
                        ? 'rgba(0,0,0,0.03)'
                        : 'transparent',
                    }}
                    onClick={() => {
                      setFocusIdx(i);
                      toggleTodo(t);
                    }}
                  >
                    <span
                      style={{
                        ...S.checkbox,
                        borderColor: t.completed ? C.text : '#c0c0c0',
                        background: t.completed ? C.text : 'transparent',
                      }}
                    >
                      {t.completed && (
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
                        color: t.completed ? C.textMuted : C.text,
                        textDecoration: t.completed ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
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

// -------------------- To-Dos page --------------------
// The full list, behind the Pulse card's See All. Covers the whole frame, so
// it carries its own way back rather than relying on the dots.
const TODO_FILTERS = ['All', 'Open', 'Done'];

const ANY_CANVAS = 'All Canvases';

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
  const [openMenu, setOpenMenu] = useState(null); // canvas | null

  const FACETS = [
    { key: 'canvas', any: ANY_CANVAS },
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
              key={t.todoId}
              style={{
                ...S.todoRow,
                background: focused ? 'rgba(0,0,0,0.03)' : 'transparent',
              }}
              onClick={() => {
                setFocusIdx(i);
                toggleTodo(t);
              }}
            >
              <span
                style={{
                  ...S.checkbox,
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  marginTop: 1,
                  borderColor: t.completed ? C.text : '#d4d4d4',
                  background: t.completed ? C.text : 'transparent',
                }}
              >
                {t.completed && (
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
                      color: t.completed ? C.textMuted : C.text,
                      textDecoration: t.completed ? 'line-through' : 'none',
                    }}
                  >
                    {t.title}
                  </span>
                </div>
                <div style={S.todoRowMeta}>{t.canvasName}</div>
              </div>
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
    width: DESIGN_SIZE,
    height: DESIGN_SIZE,
    // Chromium's CSS zoom scales layout, painting, and event coordinates
    // together — cheaper than replacing every pixel constant, and keeps the
    // design canvas at 480 to match Figma. Firefox/Safari added support later
    // than Chromium, but the kiosk only runs Chromium so this is safe here.
    zoom: SCALE,
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
