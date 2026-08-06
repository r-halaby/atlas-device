import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App.jsx';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const authToken = import.meta.env.VITE_CONVEX_AUTH_TOKEN;

let root = <App />;
if (convexUrl) {
  const convex = new ConvexReactClient(convexUrl);
  // M2M JWT minted by scripts/mint-kiosk-token.mjs. The kiosk has no
  // interactive login, so the token is baked in at deploy time.
  if (authToken) convex.setAuth(async () => authToken);
  root = (
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
}

createRoot(document.getElementById('root')).render(root);
