// Shape matches convex/canvasTodos.ts listOrgTodos in the ideate repo, so the
// UI is source-agnostic and the kiosk can swap between mock and real without
// UI edits. nodeId / canvasId are placeholders — mutation isn't hit in mock.

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
