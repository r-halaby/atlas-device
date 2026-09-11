import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App.jsx';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

let root = <App />;
if (convexUrl) {
  const convex = new ConvexReactClient(convexUrl);
  // No auth needed — kiosk uses listOrgTodosForKiosk which accepts
  // VITE_ORG_ID directly (Clerk M2M aud:[] is incompatible with Convex JWT).
  root = (
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
}

createRoot(document.getElementById('root')).render(root);
