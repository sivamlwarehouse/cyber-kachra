import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import AdminLogin from './components/AdminLogin.tsx';
import { getAdminToken } from './utils/admin-auth.ts';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

function isAdminPath(pathname: string) {
  return (
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname === '/admin-console' ||
    pathname === '/admin-console/'
  );
}

function AdminRoute() {
  const [authed, setAuthed] = useState(() => Boolean(getAdminToken()));

  if (!authed) {
    return (
      <AdminLogin
        onBack={() => {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        onSuccess={() => setAuthed(true)}
      />
    );
  }

  return (
    <AdminPanel
      onBack={() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }}
      onRefreshParent={() => {}}
    />
  );
}

function Root() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    const onPopState = () => syncPath();
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args) => {
      origPush(...args);
      syncPath();
    };
    history.replaceState = (...args) => {
      origReplace(...args);
      syncPath();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  if (isAdminPath(pathname)) {
    return <AdminRoute />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <Root />
    </LanguageProvider>
  </StrictMode>,
);
