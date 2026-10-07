import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, User, Coins, RefreshCw, X, Search, Check, AlertCircle,
  Plus, Minus, Clock, Film, Image as ImageIcon, Sparkles, ExternalLink,
  ChevronRight, ArrowUpRight, CheckCircle2, History, Send, Users, UserCheck, Wrench, RotateCcw
} from 'lucide-react';
import { getApiUrl } from '../../config/apiConfig';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';

export function UserCreditAuditModal({ isOpen, onClose }) {
  const showToast = useAppStore(state => state.showToast);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'customers' | 'staff'

  // Audit data
  const [auditData, setAuditData] = useState({ profile: null, transactions: [], assets: [] });
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'assets'

  // Adjustment form
  const [adjustMode, setAdjustMode] = useState('delta'); // 'delta' | 'exact'
  const [adjustAmount, setAdjustAmount] = useState(10);
  const [exactTargetBalance, setExactTargetBalance] = useState(50);
  const [adjustReason, setAdjustReason] = useState('Customer support compensation / balance adjustment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to distinguish administrator (ONLY premspaw@gmail.com) from regular users
  const isStaffOrAdmin = (u) => {
    if (!u) return false;
    return u.email?.toLowerCase() === 'premspaw@gmail.com';
  };

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'dev_mode_token';

      const res = await fetch(getApiUrl('/api/admin/users'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        if (!selectedUser && data.users.length > 0) {
          setSelectedUser(data.users[0]);
        }
      }
    } catch (err) {
      console.error('[UserAudit] Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUser]);

  // Fetch audit data for selected user
  const fetchAuditData = useCallback(async (userObj) => {
    if (!userObj?.id && !userObj?.email) return;
    setLoadingAudit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'dev_mode_token';

      const q = userObj.id ? `userId=${encodeURIComponent(userObj.id)}` : `email=${encodeURIComponent(userObj.email)}`;
      const res = await fetch(getApiUrl(`/api/admin/user-audit?${q}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAuditData({
          profile: data.profile || userObj,
          transactions: data.transactions || [],
          assets: data.assets || []
        });
      }
    } catch (err) {
      console.error('[UserAudit] Failed to fetch audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  useEffect(() => {
    if (selectedUser) {
      fetchAuditData(selectedUser);
    }
  }, [selectedUser, fetchAuditData]);

  // Handle manual credit / debit delta adjustment
  const handleAdjustBalance = async (type = 'grant') => {
    if (!selectedUser?.id) return;
    const numericAmount = Math.abs(Number(adjustAmount));
    if (!numericAmount || isNaN(numericAmount)) {
      if (showToast) showToast('Please enter a valid amount', 'error');
      return;
    }

    const finalAmount = type === 'grant' ? numericAmount : -numericAmount;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'dev_mode_token';

      const res = await fetch(getApiUrl('/api/admin/adjust-balance'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: finalAmount,
          reason: adjustReason.trim() || (type === 'grant' ? 'Manual credit refund' : 'Manual debit adjustment'),
          actionType: type === 'grant' ? 'admin_grant' : 'admin_debit'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust balance');
      }

      if (showToast) {
        showToast(`Successfully ${type === 'grant' ? 'credited' : 'deducted'} ${numericAmount} Shorts for ${selectedUser.email || selectedUser.id}!`, 'success');
      }

      setSelectedUser(prev => prev ? { ...prev, shorts_balance: data.newBalance } : null);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, shorts_balance: data.newBalance } : u));
      fetchAuditData(selectedUser);
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setting exact balance (e.g. reset to 50 or 0 or 15,000)
  const handleSetExactBalance = async (targetVal) => {
    if (!selectedUser?.id) return;
    const numericTarget = Math.max(0, Math.floor(Number(targetVal !== undefined ? targetVal : exactTargetBalance)));
    if (isNaN(numericTarget)) {
      if (showToast) showToast('Please enter a valid balance', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'dev_mode_token';

      const res = await fetch(getApiUrl('/api/admin/adjust-balance'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          exactBalance: numericTarget,
          reason: adjustReason.trim() || `Admin set balance to ${numericTarget}`,
          actionType: numericTarget >= (selectedUser.shorts_balance || 0) ? 'admin_grant' : 'admin_debit'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update balance');
      }

      if (showToast) {
        showToast(`Successfully set balance to ${data.newBalance} Shorts for ${selectedUser.email || selectedUser.id}!`, 'success');
      }

      setSelectedUser(prev => prev ? { ...prev, shorts_balance: data.newBalance } : null);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, shorts_balance: data.newBalance } : u));
      fetchAuditData(selectedUser);
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (u.email && u.email.toLowerCase().includes(q)) || (u.id && u.id.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (roleFilter === 'customers') return !isStaffOrAdmin(u);
    if (roleFilter === 'staff') return isStaffOrAdmin(u);
    return true;
  });

  const customerCount = users.filter(u => !isStaffOrAdmin(u)).length;
  const staffCount = users.filter(u => isStaffOrAdmin(u)).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl h-[90vh] max-h-[850px] bg-[#0c0c12] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#0e0e16] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c8f135]/15 border border-[#c8f135]/30 flex items-center justify-center text-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.2)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">User Audit & Credit Operations</h2>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#c8f135]/10 text-[#c8f135] border border-[#c8f135]/30">Live Supabase DB</span>
              </div>
              <p className="text-[11px] text-zinc-400">Live Supabase user directory, customer balances, staff testing quotas, and credit audit ledger.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body: 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: User Search & Selection */}
          <div className="w-full md:w-80 border-r border-white/10 bg-[#09090e] flex flex-col shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-white/5 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search user email or UUID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8f135] transition-all"
                />
              </div>

              {/* Filter Tabs: All vs Regular Users vs Admin */}
              <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={cn(
                    "py-1 rounded-lg font-bold transition-all text-center cursor-pointer",
                    roleFilter === 'all'
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  All ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('customers')}
                  className={cn(
                    "py-1 rounded-lg font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1",
                    roleFilter === 'customers'
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-zinc-500 hover:text-emerald-400"
                  )}
                >
                  <span>Users</span>
                  <span className="font-mono text-[9px]">({customerCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('staff')}
                  className={cn(
                    "py-1 rounded-lg font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1",
                    roleFilter === 'staff'
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-zinc-500 hover:text-amber-400"
                  )}
                >
                  <span>Admin</span>
                  <span className="font-mono text-[9px]">({staffCount})</span>
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {loadingUsers ? (
                <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#c8f135]" />
                  <span className="text-[11px]">Loading user directory from DB...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">No users match filter.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const isSoleAdmin = isStaffOrAdmin(u);
                  const isPaid = u.tier === 'INFLUENCER' || (u.tier && u.tier !== 'FREE');
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border cursor-pointer",
                        isSelected
                          ? "bg-[#c8f135]/10 border-[#c8f135]/40 text-white shadow-[0_0_15px_rgba(200,241,53,0.1)]"
                          : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-xs font-bold truncate text-white">{u.email || 'Anonymous User'}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSoleAdmin ? (
                            <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              SUPER ADMIN
                            </span>
                          ) : isPaid ? (
                            <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {u.tier}
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              USER
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-zinc-500 truncate">{String(u.id).slice(0, 8)}...</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn(
                          "text-[11px] font-mono font-black px-2 py-0.5 rounded border",
                          isSoleAdmin
                            ? "text-amber-300 bg-amber-950/40 border-amber-500/30"
                            : "text-[#c8f135] bg-black/60 border-white/10"
                        )}>
                          {u.shorts_balance?.toLocaleString() ?? 0}⚡
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected User Audit Details & Actions */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0c12]">
            {selectedUser ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* User Snapshot Bar */}
                <div className="p-4 border-b border-white/10 bg-[#0e0e16]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 font-black text-sm",
                      isStaffOrAdmin(selectedUser)
                        ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                        : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    )}>
                      {(selectedUser.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white truncate">{selectedUser.email || 'Anonymous User'}</h3>
                        {isStaffOrAdmin(selectedUser) ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SUPER ADMIN
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            REGULAR USER
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {selectedUser.tier || 'FREE'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 truncate">UUID: {selectedUser.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-[#c8f135]/30 shadow-[0_0_15px_rgba(200,241,53,0.15)]">
                      <Coins className="w-4 h-4 text-[#c8f135]" />
                      <span className="text-base font-black text-[#c8f135]">{selectedUser.shorts_balance?.toLocaleString() ?? 0}</span>
                      <span className="text-[10px] text-zinc-400 font-mono uppercase">Shorts</span>
                    </div>

                    <button
                      onClick={() => fetchAuditData(selectedUser)}
                      disabled={loadingAudit}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Refresh Audit Data"
                    >
                      <RefreshCw className={cn("w-4 h-4", loadingAudit && "animate-spin text-[#c8f135]")} />
                    </button>
                  </div>
                </div>

                {/* Account Type Explanation Banner */}
                {isStaffOrAdmin(selectedUser) ? (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed text-amber-200">
                      <strong className="text-white">Super Administrator Account:</strong> <code>premspaw@gmail.com</code> is the platform owner with full administrative authority to adjust credits, inspect logs, and manage accounts.
                    </div>
                  </div>
                ) : (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed text-emerald-200">
                      <strong className="text-white">Regular User Account:</strong> Standard user account. Current balance reflects real credits in the Supabase <code>profiles</code> table.
                    </div>
                  </div>
                )}

                {/* Credit Operations Box */}
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-[#0d0d18] to-[#121220] shrink-0 mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-white">Credit Operations & Balance Control</span>
                    </div>

                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setAdjustMode('delta')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                          adjustMode === 'delta' ? "bg-white/15 text-white" : "text-zinc-500 hover:text-white"
                        )}
                      >
                        Add / Deduct
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustMode('exact')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                          adjustMode === 'exact' ? "bg-white/15 text-white" : "text-zinc-500 hover:text-white"
                        )}
                      >
                        Set Exact Balance
                      </button>
                    </div>
                  </div>

                  {adjustMode === 'delta' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-zinc-400">Select amount to grant or deduct:</span>
                        <div className="flex items-center gap-1">
                          {[5, 10, 25, 50, 100].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setAdjustAmount(amt)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer",
                                adjustAmount === amt
                                  ? "bg-[#c8f135] text-black font-black"
                                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                              )}
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            min="1"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(Number(e.target.value))}
                            placeholder="Amount"
                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-[#c8f135]"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Reason for audit log..."
                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8f135]"
                          />
                        </div>
                        <div className="sm:col-span-4 flex gap-1.5">
                          <button
                            type="button"
                            disabled={isSubmitting || !adjustAmount}
                            onClick={() => handleAdjustBalance('grant')}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] disabled:opacity-50 text-black text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(200,241,53,0.3)] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Credit (+{adjustAmount})</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting || !adjustAmount}
                            onClick={() => handleAdjustBalance('deduct')}
                            className="py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 disabled:opacity-50 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Deduct Credits"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-zinc-400">Quickly reset or set exact total balance:</span>
                        <div className="flex items-center gap-1">
                          {[
                            { label: 'Reset to 50', val: 50 },
                            { label: 'Set to 0', val: 0 },
                            { label: 'Set to 15,000', val: 15000 }
                          ].map(item => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setExactTargetBalance(item.val);
                                handleSetExactBalance(item.val);
                              }}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer border border-white/5"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            min="0"
                            value={exactTargetBalance}
                            onChange={(e) => setExactTargetBalance(Number(e.target.value))}
                            placeholder="Target Balance"
                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-[#c8f135]"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Reason for audit log..."
                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8f135]"
                          />
                        </div>
                        <div className="sm:col-span-4 flex gap-1.5">
                          <button
                            type="button"
                            disabled={isSubmitting || exactTargetBalance < 0}
                            onClick={() => handleSetExactBalance()}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Set Balance to {exactTargetBalance}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Tabs: Transactions vs Assets */}
                <div className="px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#09090e]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('transactions')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        activeTab === 'transactions'
                          ? "bg-white/10 text-white font-extrabold"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Transaction Ledger ({auditData.transactions.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('assets')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        activeTab === 'assets'
                          ? "bg-white/10 text-white font-extrabold"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Generated Media ({auditData.assets.length})</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content Display */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0">
                  {loadingAudit ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#c8f135]" />
                      <span className="text-xs">Fetching audit logs...</span>
                    </div>
                  ) : activeTab === 'transactions' ? (
                    auditData.transactions.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-500 text-xs flex-col gap-2">
                        <History className="w-8 h-8 opacity-30" />
                        <span>No transactions recorded yet for this user.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {auditData.transactions.map((tx) => {
                          const isCredit = Number(tx.amount) > 0;
                          const formattedDate = tx.created_at
                            ? new Date(tx.created_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                              })
                            : 'Recent';

                          return (
                            <div
                              key={tx.id || `${tx.created_at}_${tx.amount}`}
                              className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs",
                                  isCredit
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                )}>
                                  {isCredit ? '+' : '-'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">
                                    {tx.reason || tx.action_type || 'Credit transaction'}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                                    <span>{formattedDate}</span>
                                    {tx.id && <span>· ID: {String(tx.id).slice(0, 8)}...</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <span className={cn(
                                  "text-xs font-mono font-black px-2 py-0.5 rounded",
                                  isCredit
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                                )}>
                                  {isCredit ? `+${tx.amount}` : `${tx.amount}`}⚡
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    auditData.assets.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-500 text-xs flex-col gap-2">
                        <Film className="w-8 h-8 opacity-30" />
                        <span>No media assets generated yet by this user.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {auditData.assets.map((item, idx) => {
                          const isVid = item.type === 'video' || item.url?.includes('.mp4');
                          return (
                            <div
                              key={item.id || item.url || idx}
                              className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 group"
                            >
                              {isVid ? (
                                <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img src={item.url} alt="" className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                <p className="text-[10px] text-white font-medium line-clamp-2">{item.prompt || 'Generated Asset'}</p>
                                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 mt-1">
                                  <span>{item.engine || (isVid ? 'Video' : 'Image')}</span>
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#c8f135] hover:underline flex items-center gap-0.5"
                                    >
                                      <span>Open</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs flex-col gap-2 p-8">
                <User className="w-10 h-10 opacity-30" />
                <span>Select a user from the left column to view audit logs and manage credits.</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
