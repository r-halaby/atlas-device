// Sage action handlers backed by mock state. Sage actions ALWAYS use these,
// even when VITE_CONVEX_URL is set — this keeps voice behavior deterministic
// while the real Atlas Sage endpoints are still being built.
//
// Handlers optimistically mutate local state via the setters passed in, log
// the action, and return { success, action, timestamp }. When we later swap
// to Convex, only this file changes.

const stamp = () => new Date().toISOString();

const log = (name, payload, result) => {
  // eslint-disable-next-line no-console
  console.log(`[sage ${stamp()}] ${name}`, payload, '→', result);
};

export function createMockSageAPI({
  setTodos,
  setProjects,
  setTimer,
  setNotes,
  setScreen,
}) {
  const findProject = (name, projects) => {
    if (!name) return null;
    const needle = name.toLowerCase();
    return projects.find((p) => p.name.toLowerCase().includes(needle)) ?? null;
  };

  const nextId = (arr, prefix) => `${prefix}${Date.now().toString(36)}${arr.length}`;

  const api = {
    add_todo: ({ text, project }) => {
      setTodos((prev) => [
        ...prev,
        {
          todoId: nextId(prev, 't_sage_'),
          title: text,
          completed: false,
          nodeId: 'sage_node',
          canvasId: 'sage_canvas',
          canvasName: project || 'Sage',
        },
      ]);
      const result = { success: true, action: 'add_todo', timestamp: stamp() };
      log('add_todo', { text, project }, result);
      return result;
    },

    complete_todo: ({ todo_id, project }) => {
      setTodos((prev) =>
        prev.map((t) => {
          if (todo_id && t.todoId === todo_id) return { ...t, completed: true };
          // Fallback: if no id given, complete the first open todo matching project
          if (!todo_id && project && !t.completed && t.canvasName.toLowerCase().includes(project.toLowerCase())) {
            return { ...t, completed: true };
          }
          return t;
        }),
      );
      const result = { success: true, action: 'complete_todo', timestamp: stamp() };
      log('complete_todo', { todo_id, project }, result);
      return result;
    },

    start_timer: ({ project }) => {
      const startTime = Date.now();
      setTimer({ active: true, project: project || null, startTime, elapsed: 0 });
      const result = { success: true, action: 'start_timer', timestamp: stamp() };
      log('start_timer', { project }, result);
      return result;
    },

    stop_timer: () => {
      setTimer((prev) => ({
        ...prev,
        active: false,
        elapsed: prev.startTime ? Date.now() - prev.startTime : prev.elapsed,
        startTime: null,
      }));
      const result = { success: true, action: 'stop_timer', timestamp: stamp() };
      log('stop_timer', {}, result);
      return result;
    },

    add_transcript: ({ text, project }) => {
      setNotes((prev) => [
        ...prev,
        { id: nextId(prev, 'n_'), kind: 'transcript', text, project: project || null, createdAt: stamp() },
      ]);
      const result = { success: true, action: 'add_transcript', timestamp: stamp() };
      log('add_transcript', { text, project }, result);
      return result;
    },

    add_note: ({ text, project }) => {
      setNotes((prev) => [
        ...prev,
        { id: nextId(prev, 'n_'), kind: 'note', text, project: project || null, createdAt: stamp() },
      ]);
      const result = { success: true, action: 'add_note', timestamp: stamp() };
      log('add_note', { text, project }, result);
      return result;
    },

    schedule_event: ({ title, date, time, project }) => {
      // No calendar-event mock yet; store as a note with kind='event' so it's
      // at least visible somewhere until the real calendar API is wired.
      setNotes((prev) => [
        ...prev,
        {
          id: nextId(prev, 'e_'),
          kind: 'event',
          text: title,
          date,
          time,
          project: project || null,
          createdAt: stamp(),
        },
      ]);
      const result = { success: true, action: 'schedule_event', timestamp: stamp() };
      log('schedule_event', { title, date, time, project }, result);
      return result;
    },

    open_project: ({ project }) => {
      // Switch to the Canvases screen; project-level focus needs the canvas
      // grid to know about individual projects, which the current design
      // doesn't model yet — logged for later.
      setScreen(1);
      const result = { success: true, action: 'open_project', timestamp: stamp(), note: 'switched to canvases; per-project focus not yet implemented' };
      log('open_project', { project }, result);
      return result;
    },
  };

  return {
    // Dispatch a parsed action from Sage. `projects` passed in so handlers can
    // resolve project names for confirmation copy without holding a stale ref.
    dispatch: (action, projects) => {
      if (!action || typeof action.action !== 'string') {
        return { success: false, error: 'invalid action', timestamp: stamp() };
      }
      const fn = api[action.action];
      if (!fn) {
        return { success: false, error: `unknown action ${action.action}`, timestamp: stamp() };
      }
      // If the action names a project we don't know about, still succeed —
      // Sage may be creating a new project by name.
      findProject(action.project, projects);
      return fn(action);
    },
    setProjects,
  };
}

// Human-readable summary of an action for the confirmation overlay.
export function describeAction(action) {
  if (!action || !action.action) return '';
  switch (action.action) {
    case 'add_todo':
      return `Adding “${action.text}”${action.project ? ` to ${action.project}` : ''}`;
    case 'complete_todo':
      return `Completing todo${action.project ? ` in ${action.project}` : ''}`;
    case 'start_timer':
      return `Starting timer${action.project ? ` for ${action.project}` : ''}`;
    case 'stop_timer':
      return 'Stopping timer';
    case 'add_transcript':
      return `Adding transcript${action.project ? ` to ${action.project}` : ''}`;
    case 'add_note':
      return `Adding note${action.project ? ` to ${action.project}` : ''}`;
    case 'schedule_event':
      return `Scheduling “${action.title}”${action.date ? ` on ${action.date}` : ''}${action.time ? ` at ${action.time}` : ''}`;
    case 'open_project':
      return `Opening ${action.project || 'project'}`;
    default:
      return action.action;
  }
}
