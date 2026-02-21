import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import App from './App';
import LandingPage from './components/LandingPage';
import { Loader2 } from 'lucide-react';
import './index.css';

const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-[100dvh] bg-black flex items-center justify-center flex-col gap-4">
        <Loader2 size={40} className="text-cyan-500 animate-spin" />
        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Inicializando...</p>
      </div>
    );
  }

  return user ? <App /> : <LandingPage />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </React.StrictMode>
);
