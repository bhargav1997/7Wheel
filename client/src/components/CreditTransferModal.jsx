import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2,
  XCircle, AlertCircle, Coins, Search, User, MessageSquare,
  Sparkles, Check, ChevronRight, RefreshCw, Bell, Shield, HeartHandshake
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSounds } from '../hooks/useSounds';
import { formatCredits } from '../utils/format';
import { getEquippedFrame, TitleBadge } from '../utils/cosmetics';

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

const PRESET_NOTES = [
  'Good luck on the tables! 🍀',
  'For the Keno 5000x jackpot! 🎱',
  'Tip for our game! ✨',
  'Here are some credits, friend! 🤝',
];

export default function CreditTransferModal({ isOpen, onClose, initialTab = 'SEND', defaultRecipient = '' }) {
  const { user, token, updateBalance, refreshUser } = useAuth();
  const { socket } = useSocket();
  const { playClick, playWin, playStreak } = useSounds();

  const getAuthToken = () => token || localStorage.getItem('7wheel_token');

  const [activeTab, setActiveTab] = useState(initialTab); // 'SEND' | 'REQUEST' | 'INCOMING' | 'HISTORY'
  const [loading, setLoading] = useState(false);

  // Send State
  const [sendRecipient, setSendRecipient] = useState(defaultRecipient);
  const [sendAmount, setSendAmount] = useState('50');
  const [sendNote, setSendNote] = useState('');
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Request State
  const [requestRecipient, setRequestRecipient] = useState('');
  const [requestAmount, setRequestAmount] = useState('50');
  const [requestNote, setRequestNote] = useState('');

  // Incoming & Outgoing Requests
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // History State
  const [transfers, setTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && (user || getAuthToken())) {
      setActiveTab(initialTab);
      if (defaultRecipient) setSendRecipient(defaultRecipient);
      fetchRequests();
      fetchHistory();
    }
  }, [isOpen, initialTab, defaultRecipient, user]);

  // Real-time socket events
  useEffect(() => {
    if (!socket || !user) return;

    const handleTransferReceived = (data) => {
      if (data.recipientId === user._id) {
        playWin();
        toast.success(`🎉 @${data.senderUsername} sent you ${data.amount.toLocaleString()} credits!`);
        updateBalance(data.recipientNewBalance);
        fetchRequests();
        fetchHistory();
      }
    };

    const handleRequestReceived = (data) => {
      if (data.recipientId === user._id) {
        toast(`📩 @${data.requesterUsername} requested ${data.amount.toLocaleString()} credits`, {
          icon: '🤝',
        });
        fetchRequests();
      }
    };

    const handleRequestAccepted = (data) => {
      if (data.requesterId === user._id) {
        playWin();
        toast.success(`✅ @${data.payerUsername} approved your request for ${data.amount.toLocaleString()} credits!`);
        updateBalance(data.requesterNewBalance);
        fetchRequests();
        fetchHistory();
      }
    };

    socket.on('credit:transfer_received', handleTransferReceived);
    socket.on('credit:request_received', handleRequestReceived);
    socket.on('credit:request_accepted', handleRequestAccepted);

    return () => {
      socket.off('credit:transfer_received', handleTransferReceived);
      socket.off('credit:request_received', handleRequestReceived);
      socket.off('credit:request_accepted', handleRequestAccepted);
    };
  }, [socket, user]);

  // Search autocomplete for Send
  const handleRecipientChange = (val) => {
    setSendRecipient(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 2) {
      setUserSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const authToken = getAuthToken();
        const { data } = await axios.get(`/api/wallet/search-users?q=${encodeURIComponent(val.trim())}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        setUserSuggestions(data.users || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
  };

  // Fetch Requests
  const fetchRequests = async () => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoadingRequests(true);
      const { data } = await axios.get('/api/wallet/requests', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setIncomingRequests(data.incoming || []);
      setOutgoingRequests(data.outgoing || []);
    } catch (err) {
      console.error('Fetch requests error:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch Transfer History
  const fetchHistory = async () => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoadingHistory(true);
      const { data } = await axios.get('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const transferOnly = (data.transactions || []).filter((t) =>
        ['CREDIT_TRANSFER_SENT', 'CREDIT_TRANSFER_RECEIVED'].includes(t.type)
      );
      setTransfers(transferOnly);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle Send Submit
  const handleSendCredits = async (e) => {
    e.preventDefault();
    const amountNum = Math.floor(Number(sendAmount));

    if (!sendRecipient.trim()) {
      return toast.error('Please enter a recipient username');
    }
    if (isNaN(amountNum) || amountNum < 1) {
      return toast.error('Transfer amount must be at least 1 credit');
    }
    if (user?.balance < amountNum) {
      return toast.error(`Insufficient balance. You have ${formatCredits(user?.balance)} credits.`);
    }

    const authToken = getAuthToken();
    if (!authToken) {
      return toast.error('Please log in to transfer credits');
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        '/api/wallet/send-credits',
        {
          recipientUsername: sendRecipient.trim(),
          amount: amountNum,
          note: sendNote.trim(),
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      playWin();
      toast.success(data.message || `Transferred ${amountNum} credits to @${sendRecipient}!`);
      updateBalance(data.balance);
      setSendRecipient('');
      setSendNote('');
      setUserSuggestions([]);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send credits');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Submit
  const handleRequestCredits = async (e) => {
    e.preventDefault();
    const amountNum = Math.floor(Number(requestAmount));

    if (!requestRecipient.trim()) {
      return toast.error('Please enter a target username');
    }
    if (isNaN(amountNum) || amountNum < 1) {
      return toast.error('Request amount must be at least 1 credit');
    }

    const authToken = getAuthToken();
    if (!authToken) {
      return toast.error('Please log in to request credits');
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        '/api/wallet/request-credits',
        {
          recipientUsername: requestRecipient.trim(),
          amount: amountNum,
          note: requestNote.trim(),
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      playStreak();
      toast.success(data.message || 'Credit request sent successfully!');
      setRequestRecipient('');
      setRequestNote('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send credit request');
    } finally {
      setLoading(false);
    }
  };

  // Respond to incoming request
  const handleRespondRequest = async (requestId, action) => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoading(true);
      const { data } = await axios.post(
        '/api/wallet/respond-request',
        { requestId, action },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (action === 'ACCEPT') {
        playWin();
        toast.success(data.message);
        updateBalance(data.balance);
      } else {
        toast(data.message, { icon: '🛑' });
      }

      fetchRequests();
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond to request');
    } finally {
      setLoading(false);
    }
  };

  // Cancel outgoing request
  const handleCancelRequest = async (requestId) => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      await axios.post(
        '/api/wallet/cancel-request',
        { requestId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success('Request cancelled');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  if (!isOpen) return null;

  const pendingIncomingCount = incomingRequests.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-xl bg-[#090d16] border-2 border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <HeartHandshake size={22} />
              </div>
              <div>
                <h2 className="font-display font-black text-base sm:text-lg text-white flex items-center gap-2">
                  Social Credit Transfer & Request
                </h2>
                <p className="text-xs text-slate-400">Share free entertainment tokens with other players</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Current Balance Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <User size={13} className="text-brand-400" />
              Logged in as <strong className="text-white">{user?.username}</strong>
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              <Coins size={13} className="text-amber-400" />
              <span className="font-mono font-bold text-amber-300">{formatCredits(user?.balance)} Credits</span>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center gap-1.5 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { playClick(); setActiveTab('SEND'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'SEND'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send size={13} />
              Send Credits
            </button>

            <button
              onClick={() => { playClick(); setActiveTab('REQUEST'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'REQUEST'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ArrowDownLeft size={13} />
              Request
            </button>

            <button
              onClick={() => { playClick(); setActiveTab('INCOMING'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative shrink-0 ${
                activeTab === 'INCOMING'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bell size={13} />
              Incoming
              {pendingIncomingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-black animate-pulse">
                  {pendingIncomingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { playClick(); setActiveTab('HISTORY'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock size={13} />
              History
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* ── TAB 1: SEND CREDITS ── */}
            {activeTab === 'SEND' && (
              <form onSubmit={handleSendCredits} className="space-y-4">
                {/* Recipient Input with Autocomplete Suggestions */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Recipient Username</span>
                    {searchingUsers && <span className="text-[10px] text-brand-400 animate-pulse">Searching…</span>}
                  </label>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      value={sendRecipient}
                      onChange={(e) => handleRecipientChange(e.target.value)}
                      placeholder="e.g. SatoshiS or VegasKing"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {userSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
                      {userSuggestions.map((u) => {
                        const frame = getEquippedFrame(u?.equipped?.frame);
                        return (
                          <button
                            type="button"
                            key={u._id}
                            onClick={() => {
                              setSendRecipient(u.username);
                              setUserSuggestions([]);
                            }}
                            className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800/90 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${frame.avatarClass}`}>
                                {u.username[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-white">{u.username}</span>
                              <TitleBadge titleId={u?.equipped?.title} />
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold">Select ✓</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Amount Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Amount (Credits)</label>
                    <button
                      type="button"
                      onClick={() => setSendAmount(String(Math.floor(user?.balance || 0)))}
                      className="text-[10px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-wider"
                    >
                      Max ({formatCredits(user?.balance)})
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                      <Coins size={15} />
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={user?.balance || 1}
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="50"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Quick Chips */}
                  <div className="grid grid-cols-6 gap-1.5 pt-1">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setSendAmount(String(amt))}
                        className={`py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                          Number(sendAmount) === amt
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-slate-400" />
                    <span>Optional Message (Max 120 chars)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={sendNote}
                    onChange={(e) => setSendNote(e.target.value)}
                    placeholder="e.g. Good luck on Keno lottery!"
                    className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />

                  {/* Preset quick notes */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                    {PRESET_NOTES.map((note, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setSendNote(note)}
                        className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap transition-colors"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Transfer Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || Number(sendAmount) > (user?.balance || 0)}
                    className="w-full py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Transfer {Number(sendAmount) || 0} Credits Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── TAB 2: REQUEST CREDITS ── */}
            {activeTab === 'REQUEST' && (
              <div className="space-y-6">
                <form onSubmit={handleRequestCredits} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Request from Player Username</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        value={requestRecipient}
                        onChange={(e) => setRequestRecipient(e.target.value)}
                        placeholder="e.g. SatoshiS"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Requested Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                        <Coins size={15} />
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        placeholder="50"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Message / Reason (Optional)</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      placeholder="e.g. Can you spare 50 credits for Keno jackpot?"
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 text-white shadow-lg shadow-purple-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ArrowDownLeft size={16} />
                    Send Credit Request
                  </button>
                </form>

                {/* Sent Outgoing Requests List */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                    Your Outgoing Requests ({outgoingRequests.length})
                  </span>

                  {outgoingRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No outgoing requests submitted.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {outgoingRequests.map((req) => (
                        <div
                          key={req._id}
                          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-300 font-bold">To @{req.recipientUsername}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                                req.status === 'PENDING'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : req.status === 'ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <span className="font-mono text-amber-400 font-bold">{req.amount} Credits</span>
                            {req.note && <p className="text-[10px] text-slate-400 italic">"{req.note}"</p>}
                          </div>

                          {req.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelRequest(req._id)}
                              className="text-[10px] text-slate-400 hover:text-rose-400 px-2 py-1 bg-slate-800 rounded border border-slate-700 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: INCOMING REQUESTS ── */}
            {activeTab === 'INCOMING' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Pending Requests from Friends ({incomingRequests.length})
                  </span>
                  <button
                    onClick={fetchRequests}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <RefreshCw size={12} className={loadingRequests ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {loadingRequests ? (
                  <div className="py-12 text-center text-xs text-slate-500 animate-pulse">Loading incoming requests…</div>
                ) : incomingRequests.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Bell size={28} className="text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No pending incoming requests.</p>
                    <p className="text-[11px] text-slate-500">When other players ask you for credits, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {incomingRequests.map((req) => (
                      <div
                        key={req._id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-xs font-black text-white">
                              {req.requesterUsername[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white block">@{req.requesterUsername}</span>
                              <span className="text-[10px] text-slate-400">wants credits</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-amber-400 block">
                              {req.amount.toLocaleString()} 🪙
                            </span>
                          </div>
                        </div>

                        {req.note && (
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 italic">
                            "{req.note}"
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleRespondRequest(req._id, 'ACCEPT')}
                            disabled={loading || (user?.balance || 0) < req.amount}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                          >
                            <Check size={14} />
                            Accept & Transfer ({req.amount} 🪙)
                          </button>

                          <button
                            onClick={() => handleRespondRequest(req._id, 'DECLINE')}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: HISTORY ── */}
            {activeTab === 'HISTORY' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Recent Credit Transfers
                  </span>
                  <button
                    onClick={fetchHistory}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="py-12 text-center text-xs text-slate-500 animate-pulse">Loading history…</div>
                ) : transfers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">No transfer history recorded yet.</div>
                ) : (
                  <div className="space-y-2">
                    {transfers.map((t) => {
                      const isSent = t.type === 'CREDIT_TRANSFER_SENT';
                      return (
                        <div
                          key={t._id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isSent ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isSent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                            </div>
                            <div>
                              <p className="font-bold text-white leading-tight">{t.description}</p>
                              <span className="text-[10px] text-slate-400">
                                {new Date(t.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`font-mono font-black text-xs ${isSent ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {isSent ? '-' : '+'}{t.amount.toLocaleString()} 🪙
                            </span>
                            <span className="text-[10px] text-slate-500 block">Bal: {formatCredits(t.balanceAfter)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
