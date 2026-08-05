import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import GameHub from './pages/GameHub';

// Protected route guard
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center
                          text-3xl font-black text-white glow-brand animate-pulse">
            7
          </div>
          <p className="text-slate-400 text-sm animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Public-only route (redirect logged-in users to hub)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <SocketProvider>
            <GameHub />
          </SocketProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/login"
      element={<PublicRoute><Login /></PublicRoute>}
    />
    <Route
      path="/register"
      element={<PublicRoute><Register /></PublicRoute>}
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111118',
            color: '#e2e8f0',
            border: '1px solid #1f1f30',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#111118' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#111118' } },
        }}
      />
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
