import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GameHub from './pages/GameHub';
import FlipOrFlop from './pages/FlipOrFlop';
import SlotMachine from './pages/SlotMachine';
import Mines from './pages/Mines';
import Crash from './pages/Crash';
import Roulette from './pages/Roulette';
import Blackjack from './pages/Blackjack';
import Plinko from './pages/Plinko';
import Keno from './pages/Keno';
import Landing from './pages/Landing';
import PrivacyTerms from './pages/PrivacyTerms';
import Profile from './pages/Profile';
import BuyCreditsModal from './components/BuyCreditsModal';
import AdminStatsModal from './components/AdminStatsModal';

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

// Public-only route (redirect logged-in users to play)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/play" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={<Landing />}
    />
    <Route
      path="/play"
      element={
        <ProtectedRoute>
          <SocketProvider>
            <GameHub />
          </SocketProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/flip-or-flop"
      element={
        <ProtectedRoute>
          <SocketProvider>
            <FlipOrFlop />
          </SocketProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/slots"
      element={
        <ProtectedRoute>
          <SlotMachine />
        </ProtectedRoute>
      }
    />
    <Route
      path="/mines"
      element={
        <ProtectedRoute>
          <Mines />
        </ProtectedRoute>
      }
    />
    <Route
      path="/crash"
      element={
        <ProtectedRoute>
          <SocketProvider>
            <Crash />
          </SocketProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/roulette"
      element={
        <ProtectedRoute>
          <Roulette />
        </ProtectedRoute>
      }
    />
    <Route
      path="/blackjack"
      element={
        <ProtectedRoute>
          <Blackjack />
        </ProtectedRoute>
      }
    />
    <Route
      path="/plinko"
      element={
        <ProtectedRoute>
          <Plinko />
        </ProtectedRoute>
      }
    />
    <Route
      path="/keno"
      element={
        <ProtectedRoute>
          <Keno />
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
    <Route
      path="/forgot-password"
      element={<PublicRoute><ForgotPassword /></PublicRoute>}
    />
    <Route
      path="/reset-password/:token"
      element={<PublicRoute><ResetPassword /></PublicRoute>}
    />
    <Route
      path="/privacy-terms"
      element={<PrivacyTerms />}
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/play" replace />} />
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
      <BuyCreditsModal />
      <AdminStatsModal />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
