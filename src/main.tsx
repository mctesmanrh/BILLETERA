import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      {({ user, csrfToken }) => <App currentUser={user} csrfToken={csrfToken} />}
    </AuthGate>
  </StrictMode>,
);
