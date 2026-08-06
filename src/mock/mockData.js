// Central mock state for the kiosk. Sage actions mutate this via setters
// wired in App.jsx; when the real Atlas API is ready, each concern gets
// swapped for a Convex query/mutation independently.

// Shape mirrors convex/canvasTodos.ts listOrgTodos so the UI is source-agnostic.
export const MOCK_TODOS = [
  { todoId: 't1', title: 'Update deck design', completed: false, nodeId: 'n1', canvasId: 'c1', canvasName: 'Puma Invite Concepts-02' },
  { todoId: 't2', title: 'Schedule meeting with Brian', completed: false, nodeId: 'n2', canvasId: 'c1', canvasName: 'Puma Invite Concepts-02' },
  { todoId: 't3', title: 'Review quarterly data with Rahmi', completed: false, nodeId: 'n3', canvasId: 'c2', canvasName: 'Creator Day Concepts-01' },
  { todoId: 't4', title: 'Send Northwind the revised invoice', completed: false, nodeId: 'n4', canvasId: 'c3', canvasName: 'Northwind Retainer-01' },
  { todoId: 't5', title: 'Draft Q3 retainer proposal', completed: false, nodeId: 'n5', canvasId: 'c4', canvasName: 'Northwind Retainer-02' },
  { todoId: 't6', title: 'Pull analytics for the Vega launch', completed: true, nodeId: 'n6', canvasId: 'c5', canvasName: 'Vega Launch Deck-02' },
  { todoId: 't7', title: 'Reply to Priya about the workshop', completed: false, nodeId: 'n7', canvasId: 'c6', canvasName: 'Creator Day Concepts-03' },
  { todoId: 't8', title: 'Archive last quarter’s canvases', completed: true, nodeId: 'n8', canvasId: 'c7', canvasName: 'Q2 Canvases' },
];

export const MOCK_PROJECTS = [
  { id: 1, name: 'Nike Campaign', workspace: 'Agency' },
  { id: 2, name: 'Google Rebrand', workspace: 'Agency' },
  { id: 3, name: 'Red Bull Deck', workspace: 'Agency' },
  { id: 4, name: 'Personal Portfolio', workspace: 'My Workspace' },
];

export const MOCK_TIMER = {
  active: false,
  project: null,
  startTime: null,
  elapsed: 0,
};

export const MOCK_NOTES = [];

// For the Sage chat swipe page (separate from the hardware-button Sage
// overlay). Canned replies live in App.jsx; this is just the framing copy.
export const MOCK_SAGE = {
  tagline: 'Intelligence layer for design operations',
  intro: {
    lead: 'Sage is active. I maintain shared understanding across your goals, decisions, and revisions so your team stays aligned as work evolves.',
    listLead: 'I can help you:',
    bullets: [
      'Surface and classify feedback across the project',
      'Flag when work has drifted from stated intent',
      'Log and retrieve key decisions as they’re made',
      'Execute canvas actions through natural language',
    ],
  },
  history: [
    { id: 1, title: 'One of the stakeholders on the Puma inv…', date: '6/12/2026' },
    { id: 2, title: 'Summarise the Creator Day feedback', date: '6/9/2026' },
    { id: 3, title: 'What changed on Vega Launch Deck?', date: '5/28/2026' },
  ],
};
