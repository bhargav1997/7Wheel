import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('7wheel_token'));
  const [loading, setLoading] = useState(true);

  // Attach token to all axios requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAdminStats, setShowAdminStats] = useState(false);

  // On mount: verify stored token
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await axios.get('/api/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('7wheel_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const persistToken = useCallback((newToken) => {
    localStorage.setItem('7wheel_token', newToken);
    setToken(newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }, []);

  const register = useCallback(async ({ username, email, password }) => {
    const { data } = await axios.post('/api/auth/register', { username, email, password });
    persistToken(data.token);
    setUser(data.user);
    toast.success(`Welcome to the Hub, ${data.user.username}!`);
    return data;
  }, [persistToken]);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    persistToken(data.token);
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.username}!`);
    return data;
  }, [persistToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('7wheel_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast('Logged out. Come back soon.');
  }, []);

  const updateBalance = useCallback((newBalance) => {
    setUser((prev) => prev ? { ...prev, balance: newBalance } : prev);
  }, []);

  const deposit = useCallback(async ({ amount, paymentMethod, paymentDetails }) => {
    const { data } = await axios.post('/api/wallet/deposit', { amount, paymentMethod, paymentDetails });
    updateBalance(data.balance);
    return data;
  }, [updateBalance]);

  const withdraw = useCallback(async ({ amount, payoutMethod, payoutDetails }) => {
    const { data } = await axios.post('/api/wallet/withdraw', { amount, payoutMethod, payoutDetails });
    updateBalance(data.balance);
    return data;
  }, [updateBalance]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      register,
      login,
      logout,
      updateBalance,
      deposit,
      withdraw,
      showDepositModal,
      setShowDepositModal,
      showWithdrawModal,
      setShowWithdrawModal,
      showAdminStats,
      setShowAdminStats,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
