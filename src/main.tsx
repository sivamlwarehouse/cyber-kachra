import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import './index.css';

function isAdminConsolePath(pathname: string) {
  return pathname === '/admin-console' || pathname === '/admin-console/';
}

function Root() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (isAdminConsolePath(pathname)) {
    return (
      <AdminPanel
        onBack={() => {
          window.history.pushState({}, '', '/');
          setPathname('/');
        }}
        onRefreshParent={() => {}}
      />
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
