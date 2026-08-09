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

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showAdminStats, setShowAdminStats] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const { data } = await axios.get('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, [token]);

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

  const register = useCallback(async ({ username, email, password, inviteCode }) => {
    const { data } = await axios.post('/api/auth/register', { username, email, password, inviteCode });
    persistToken(data.token);
    setUser(data.user);
    if (data.referralBonusApplied) {
      toast.success(`Welcome, ${data.user.username}! You got 100 + 50 bonus credits for using an invite code!`);
    } else {
      toast.success(`Welcome to 7 Wheel, ${data.user.username}! You got 100 free credits!`);
    }
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

  const purchaseCredits = useCallback(async ({ packId, paymentMethod, paymentDetails }) => {
    const { data } = await axios.post('/api/wallet/purchase-credits', { packId, paymentMethod, paymentDetails });
    updateBalance(data.balance);
    return data;
  }, [updateBalance]);

  /**
   * Delete the authenticated user's account permanently.
   * Requires password confirmation.
   * NOTE: We explicitly pass the Authorization header here because
   *       axios.delete with a body config can miss defaults in some versions.
   */
  const deleteAccount = useCallback(async (password) => {
    const storedToken = localStorage.getItem('7wheel_token');
    await axios.delete('/api/auth/account', {
      data: { password },
      headers: {
        Authorization: `Bearer ${storedToken}`,
        'Content-Type': 'application/json',
      },
    });
    // Clear local session after successful deletion
    localStorage.removeItem('7wheel_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      register,
      login,
      logout,
      updateBalance,
      purchaseCredits,
      deleteAccount,
      refreshUser,
      showBuyCreditsModal,
      setShowBuyCreditsModal,
      showAdminStats,
      setShowAdminStats,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
