import { useCallback, useState } from 'react';
import { ToastProvider } from './components/Toast';
import JoinScreen from './components/JoinScreen';
import Game from './components/Game';
import { clearToken, getToken, saveToken } from './lib/storage';

export default function App() {
  const [token, setToken] = useState(getToken);

  const handleJoined = useCallback((newToken) => {
    saveToken(newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  return (
    <ToastProvider>
      {token ? <Game token={token} onLogout={handleLogout} /> : <JoinScreen onJoined={handleJoined} />}
    </ToastProvider>
  );
}
