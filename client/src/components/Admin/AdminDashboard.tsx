import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  ArrowLeft,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  Clock,
  Mail,
  ShieldAlert,
  Sliders,
  Check,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface AdminStats {
  totalUsers: number;
  pendingApprovals: number;
  approvedUsers: number;
  adminCount: number;
  onlineUsers: number;
  totalGroups: number;
  totalMessages: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isApproved: boolean;
  isOnline: boolean;
  lastSeen?: string;
  createdAt?: string;
}

interface AdminGroup {
  id: string;
  title?: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      role: string;
    };
  }[];
  _count: {
    messages: number;
  };
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  adminUsername: string;
  action: string;
  targetUser?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  ipAddress?: string;
}

export const AdminDashboard: React.FC = () => {
  const { adminUser, adminToken, adminLogout, theme, toggleTheme, setAppView } = useStore();
  const currentUser = adminUser;

  const [activeNav, setActiveNav] = useState<'overview' | 'approvals' | 'employees' | 'create' | 'groups' | 'audit' | 'settings'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

  // Create Employee Form
  const [createName, setCreateName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('password123');
  const [createRole, setCreateRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [createPreApprove, setCreatePreApprove] = useState(true);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Employee Form
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [editStatus, setEditStatus] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Fetch Dashboard Data
  const loadDashboardData = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, groupsRes, auditRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/groups', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        if (statsRes.status === 401 || statsRes.status === 403) {
          adminLogout();
          return;
        }
        throw new Error('Failed to load admin data. Ensure you have administrator rights.');
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const groupsData = groupsRes.ok ? await groupsRes.json() : { groups: [] };
      const auditData = auditRes.ok ? await auditRes.json() : { auditLogs: [] };

      setStats(statsData.stats);
      setUsers(usersData.users || []);
      setGroups(groupsData.groups || []);
      setAuditLogs(auditData.auditLogs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [adminToken]);

  // Actions
  const handleApprove = async (id: string, username: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      setSuccess(`Approved @${username} successfully!`);
      loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (id: string, username: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      setSuccess(`Account @${username} suspended/revoked.`);
      loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!window.confirm(`Permanently delete @${username}? This deletes all related profile data and cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setSuccess(`User @${username} deleted.`);
      loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmittingCreate(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          displayName: createName,
          username: createUsername,
          email: createEmail,
          password: createPassword,
          role: createRole,
          isApproved: createPreApprove,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccess(`Employee @${createUsername} added successfully!`);
      setCreateName('');
      setCreateUsername('');
      setCreateEmail('');
      setCreatePassword('password123');
      setActiveNav('employees');
      loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditName(u.displayName);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditStatus(u.isApproved);
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');
    setSubmittingEdit(true);
    try {
      const payload: any = {
        displayName: editName,
        username: editUsername,
        email: editEmail,
        role: editRole,
        isApproved: editStatus,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setSuccess(`Updated employee @${editUsername} successfully!`);
      setEditingUser(null);
      loadDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const pendingList = users.filter((u) => !u.isApproved);

  const filteredEmployees = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'APPROVED' && u.isApproved) ||
      (statusFilter === 'PENDING' && !u.isApproved);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'light' ? 'bg-[#f4f7f9] text-[#111827]' : 'bg-[#0b1118] text-[#f5f5f5]'}`}>
      {/* 1. SEPARATE ADMIN SIDEBAR */}
      <aside className={`w-64 border-r flex flex-col justify-between shrink-0 select-none ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#111923] border-white/5'}`}>
        <div>
          {/* Admin Brand Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-white/10 shrink-0">
                <img src="/logo.png" alt="Klea Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                  Klea
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Admin
                  </span>
                </h1>
                <p className="text-[11px] text-[#7f91a4]">Enterprise Management</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveNav('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'overview'
                  ? 'bg-[#2b5278] text-white shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => setActiveNav('approvals')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'approvals'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                <span>Pending Approvals</span>
              </div>
              {pendingList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {pendingList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveNav('employees')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'employees'
                  ? 'bg-[#2b5278] text-white shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Employee Directory</span>
            </button>

            <button
              onClick={() => setActiveNav('create')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'create'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>

            <button
              onClick={() => setActiveNav('groups')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'groups'
                  ? 'bg-[#2b5278] text-white shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Company Groups</span>
            </button>

            <button
              onClick={() => setActiveNav('audit')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'audit'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Security Audit Logs</span>
              </div>
              {auditLogs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                  {auditLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveNav('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeNav === 'settings'
                  ? 'bg-[#2b5278] text-white shadow-sm'
                  : 'text-[#7f91a4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Security & Policies</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {/* Switch to Messenger CTA Button */}
          <button
            onClick={() => {
              setAppView('messenger');
              window.history.pushState({}, '', '/');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition border border-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Switch to Messenger</span>
          </button>

          {/* Quick Admin Profile info & Theme Switcher */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 truncate">
              <img
                src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.username}`}
                alt={currentUser?.displayName}
                className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
              />
              <div className="truncate">
                <div className="text-xs font-bold truncate">{currentUser?.displayName}</div>
                <div className="text-[10px] text-amber-400 font-medium">Administrator</div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#7f91a4] hover:text-white transition cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  adminLogout();
                }}
                title="Terminate Admin Session"
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#7f91a4] hover:text-red-400 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className={`h-16 px-8 border-b flex items-center justify-between shrink-0 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#111923] border-white/5'}`}>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">
              {activeNav === 'overview' && 'Dashboard Overview'}
              {activeNav === 'approvals' && 'Pending Account Approvals'}
              {activeNav === 'employees' && 'Employee Directory & Roles'}
              {activeNav === 'create' && 'Create Employee Account'}
              {activeNav === 'groups' && 'Company Groups Oversight'}
              {activeNav === 'settings' && 'Security & System Settings'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#7f91a4]">
              <span className="w-2 h-2 rounded-full bg-[#4fae4e] animate-pulse" />
              <span>Live System Online</span>
            </div>

            <button
              onClick={loadDashboardData}
              disabled={loading}
              title="Refresh Data"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#7f91a4] hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setAppView('messenger')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#5288c1]" />
              <span>Open Messenger</span>
            </button>
          </div>
        </header>

        {/* Global Feedback Banners */}
        {error && (
          <div className="mx-8 mt-4 p-3.5 bg-red-500/20 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-8 mt-4 p-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Views */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* TAB 1: OVERVIEW */}
          {activeNav === 'overview' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Alert Callout for Pending Approvals */}
              {stats && stats.pendingApprovals > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {stats.pendingApprovals} Account{stats.pendingApprovals > 1 ? 's' : ''} Awaiting Approval
                      </h4>
                      <p className="text-xs text-[#7f91a4]">
                        New employees have registered and cannot sign in until you verify their credentials.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveNav('approvals')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    Review Queue
                  </button>
                </div>
              )}

              {/* 4 KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Employees */}
                <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#7f91a4]">Total Employees</span>
                    <Users className="w-4 h-4 text-[#5288c1]" />
                  </div>
                  <div className="text-2xl font-extrabold">{stats?.totalUsers ?? '—'}</div>
                  <div className="text-[11px] text-[#7f91a4] mt-1 flex items-center gap-1.5">
                    <span className="text-amber-400 font-semibold">{stats?.adminCount ?? 0} Admins</span>
                    <span>•</span>
                    <span>{(stats?.totalUsers ?? 0) - (stats?.adminCount ?? 0)} Staff</span>
                  </div>
                </div>

                {/* 2. Pending Approvals */}
                <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#7f91a4]">Pending Approvals</span>
                    <UserCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-400">{stats?.pendingApprovals ?? '—'}</div>
                  <div className="text-[11px] text-[#7f91a4] mt-1">
                    {stats?.pendingApprovals === 0 ? 'All caught up' : 'Needs review'}
                  </div>
                </div>

                {/* 3. Company Groups */}
                <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#7f91a4]">Active Groups</span>
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-extrabold">{stats?.totalGroups ?? '—'}</div>
                  <div className="text-[11px] text-[#7f91a4] mt-1">
                    {stats?.totalMessages ?? 0} messages sent
                  </div>
                </div>

                {/* 4. Active Colleagues */}
                <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#7f91a4]">Online Colleagues</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4fae4e]" />
                  </div>
                  <div className="text-2xl font-extrabold">{stats?.onlineUsers ?? '—'}</div>
                  <div className="text-[11px] text-[#7f91a4] mt-1">Real-time Socket connection</div>
                </div>
              </div>

              {/* Quick Actions & Recent Registrations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Users List */}
                <div className={`lg:col-span-2 p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold">Recent Registered Employees</h3>
                    <button
                      onClick={() => setActiveNav('employees')}
                      className="text-xs text-[#5288c1] hover:underline cursor-pointer font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="divide-y divide-white/5">
                    {users.slice(0, 5).map((u) => (
                      <div key={u.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                            alt={u.displayName}
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              {u.displayName}
                              <span className="text-[10px] text-[#7f91a4] font-normal">@{u.username}</span>
                            </div>
                            <div className="text-[11px] text-[#7f91a4]">{u.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-[#7f91a4]'
                            }`}
                          >
                            {u.role}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              u.isApproved
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {u.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Shortcuts & Security Info */}
                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Security & Governance
                    </h3>
                    <p className="text-xs text-[#7f91a4] leading-relaxed mb-4">
                      Registration is locked by default. All company employee sign-ups require explicit administrator clearance.
                    </p>
                    <button
                      onClick={() => setActiveNav('create')}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      Directly Provision Employee
                    </button>
                  </div>

                  <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                    <h3 className="text-sm font-bold mb-2">Application Info</h3>
                    <div className="space-y-2 text-xs text-[#7f91a4]">
                      <div className="flex justify-between">
                        <span>Application Name</span>
                        <span className="font-semibold text-white">Klea Enterprise</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Backend Port</span>
                        <span className="font-semibold text-white">5001</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database</span>
                        <span className="font-semibold text-white">SQLite (Prisma ORM)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Encryption</span>
                        <span className="font-semibold text-emerald-400">ECDH P-256 + AES-GCM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PENDING APPROVALS */}
          {activeNav === 'approvals' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-base font-bold">Registration Approval Queue</h3>
                  <p className="text-xs text-[#7f91a4]">
                    Review identity and grant workspace access to requested employee accounts.
                  </p>
                </div>
                {pendingList.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                    {pendingList.length} Pending Approval
                  </span>
                )}
              </div>

              {pendingList.length === 0 ? (
                <div className={`py-16 text-center rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold">Queue Clear!</h4>
                  <p className="text-xs text-[#7f91a4] max-w-sm mx-auto mt-1">
                    There are currently no employee registrations waiting for clearance.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingList.map((u) => (
                    <div
                      key={u.id}
                      className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-amber-500/30'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                          alt={u.displayName}
                          className="w-12 h-12 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{u.displayName}</span>
                            <span className="text-xs text-[#7f91a4]">@{u.username}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PENDING
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#7f91a4] mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" /> {u.email}
                            </span>
                            {u.createdAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {new Date(u.createdAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(u.id, u.username)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <Check className="w-4 h-4" />
                          Approve Account
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EMPLOYEE DIRECTORY */}
          {activeNav === 'employees' && (
            <div className="max-w-6xl mx-auto space-y-4">
              {/* Directory Filter Bar */}
              <div className={`p-4 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} flex flex-col sm:flex-row items-center justify-between gap-3`}>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7f91a4]" />
                  <input
                    type="text"
                    placeholder="Search by name, username, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#7f91a4] focus:outline-none focus:border-[#5288c1]"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 bg-[#111923] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">Admins Only</option>
                    <option value="EMPLOYEE">Employees Only</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-[#111923] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                  </select>

                  <button
                    onClick={() => setActiveNav('create')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Employees Table */}
              <div className={`rounded-2xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/5 text-[#7f91a4] uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="px-5 py-3">Employee</th>
                        <th className="px-5 py-3">Contact</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredEmployees.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <tr key={u.id} className="hover:bg-white/5 transition">
                            <td className="px-5 py-3.5 flex items-center gap-3">
                              <img
                                src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                                alt={u.displayName}
                                className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {u.displayName}
                                  {isSelf && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[#7f91a4]">@{u.username}</div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-[#7f91a4]">
                              <div>{u.email}</div>
                              <div className="text-[10px] mt-0.5">{u.isOnline ? '🟢 Online' : 'Offline'}</div>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                  u.role === 'ADMIN'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-white/10 text-[#7f91a4]'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                  u.isApproved
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {u.isApproved ? 'Approved' : 'Pending Approval'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!u.isApproved ? (
                                  <button
                                    onClick={() => handleApprove(u.id, u.username)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold transition cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  !isSelf && (
                                    <button
                                      onClick={() => handleReject(u.id, u.username)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold transition cursor-pointer"
                                      title="Suspend Account"
                                    >
                                      Suspend
                                    </button>
                                  )
                                )}

                                <button
                                  onClick={() => startEdit(u)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7f91a4] hover:text-white transition cursor-pointer"
                                  title="Edit Employee"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {!isSelf && (
                                  <button
                                    onClick={() => handleDelete(u.id, u.username)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                                    title="Delete Employee"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADD EMPLOYEE FORM */}
          {activeNav === 'create' && (
            <div className="max-w-2xl mx-auto">
              <div className={`p-8 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm`}>
                <div className="flex items-center gap-3 pb-4 mb-6 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Add New Employee Account</h3>
                    <p className="text-xs text-[#7f91a4]">
                      Directly provision authorized company members with customized roles and credentials.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#7f91a4] block mb-1">
                        Full Display Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#7f91a4] block mb-1">
                        Unique Username *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. jdoe"
                        value={createUsername}
                        onChange={(e) => setCreateUsername(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#7f91a4] block mb-1">
                        Corporate Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="jdoe@company.com"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#7f91a4] block mb-1">
                        Initial Password *
                      </label>
                      <input
                        type="text"
                        required
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-[#7f91a4] block mb-1">
                        Role & Permissions
                      </label>
                      <select
                        value={createRole}
                        onChange={(e) => setCreateRole(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-[#111923] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                      >
                        <option value="EMPLOYEE">EMPLOYEE (Standard Member)</option>
                        <option value="ADMIN">ADMIN (Full Console Access)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#7f91a4] block mb-1">
                        Account Clearance
                      </label>
                      <div className="pt-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createPreApprove}
                            onChange={(e) => setCreatePreApprove(e.target.checked)}
                            className="rounded text-[#5288c1] w-4 h-4"
                          />
                          <span>Pre-approved (allow instant login)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveNav('employees')}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#7f91a4] hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCreate}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{submittingCreate ? 'Creating...' : 'Create Employee'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: COMPANY GROUPS */}
          {activeNav === 'groups' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-base font-bold">Company Groups Oversight</h3>
                  <p className="text-xs text-[#7f91a4]">
                    Monitor private company groups and total active communications.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10">
                  {groups.length} Total Groups
                </span>
              </div>

              {groups.length === 0 ? (
                <div className={`py-16 text-center rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                  <MessageSquare className="w-12 h-12 text-[#7f91a4] mx-auto mb-2 opacity-40" />
                  <h4 className="text-sm font-bold">No groups created yet</h4>
                  <p className="text-xs text-[#7f91a4] mt-1">
                    Groups created by staff will automatically appear here for administrative oversight.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={g.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${g.id}`}
                            alt={g.title || 'Group'}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-bold truncate">{g.title || 'Untitled Group'}</h4>
                            <p className="text-[11px] text-[#7f91a4]">
                              Created {new Date(g.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {g.description && (
                          <p className="text-xs text-[#7f91a4] line-clamp-2 mb-3">
                            {g.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#7f91a4]">
                        <span>👥 {g.members.length} Members</span>
                        <span>💬 {g._count?.messages || 0} Messages</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SECURITY AUDIT LOGS */}
          {activeNav === 'audit' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-cyan-400" />
                    Security & Administrative Audit Trails
                  </h3>
                  <p className="text-xs text-[#7f91a4]">
                    Real-time cryptographic logs of administrator logins, employee approvals, role elevations, and access denials.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {auditLogs.length} Recorded Events
                  </span>
                  <button
                    onClick={loadDashboardData}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition cursor-pointer"
                    title="Refresh Audit Logs"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className={`py-16 text-center rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                  <ShieldCheck className="w-12 h-12 text-[#7f91a4] mx-auto mb-2 opacity-40" />
                  <h4 className="text-sm font-bold">No security incidents logged</h4>
                  <p className="text-xs text-[#7f91a4] mt-1">
                    System operations and access events will be tracked here in real time.
                  </p>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'} shadow-sm`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b text-[11px] font-semibold uppercase tracking-wider ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-black/20 border-white/5 text-[#7f91a4]'}`}>
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Administrator</th>
                          <th className="py-3 px-4">Details</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {auditLogs.map((log) => {
                          const isSuccess = log.status === 'SUCCESS';
                          const isWarning = log.status === 'WARNING';

                          return (
                            <tr key={log.id} className="hover:bg-white/5 transition">
                              <td className="py-3 px-4 font-mono text-[11px] text-[#7f91a4] whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.action === 'ADMIN_LOGIN'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : log.action === 'USER_APPROVED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : log.action === 'USER_DELETED' || log.action === 'USER_REJECTED'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : log.action === 'SECURITY_ALERT'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-white/10 text-white'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                                @{log.adminUsername}
                              </td>
                              <td className="py-3 px-4 text-[#7f91a4] max-w-md">
                                <span className="text-white/90">{log.details}</span>
                                {log.targetUser && (
                                  <span className="ml-1 text-cyan-400 font-mono text-[11px]">
                                    (target: @{log.targetUser})
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isSuccess
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : isWarning
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SECURITY & POLICIES */}
          {activeNav === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className={`p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Account Approval Policy
                </h3>
                <p className="text-xs text-[#7f91a4] mb-4">
                  Current Policy: <strong className="text-white">Strict Admin Approval Enforced</strong>
                </p>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                  ✅ Public sign-ups cannot access chats, contacts, or internal company data until explicitly approved by an administrator in this dashboard.
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#151f2b] border-white/5'}`}>
                <h3 className="text-sm font-bold mb-1">Secret Chats Cryptography</h3>
                <p className="text-xs text-[#7f91a4] mb-4">
                  End-to-End Encryption specifications for Klea Secret Chats:
                </p>
                <ul className="text-xs text-[#7f91a4] space-y-2 list-disc pl-5">
                  <li>Key Exchange: Web Cryptography API ECDH with NIST P-256 curve</li>
                  <li>Symmetric Cipher: AES-GCM 256-bit with fresh initialization vectors (IV)</li>
                  <li>Visual Verification: 4-Emoji cryptographic fingerprint for active session validation</li>
                  <li>Zero-Knowledge Server: Plaintext is never transmitted or retained in cloud database</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* EDIT EMPLOYEE MODAL DIALOG */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#17212b] border border-white/10 rounded-2xl shadow-2xl p-6 text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#5288c1]" />
                Edit Employee Profile: @{editingUser.username}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-xs text-[#7f91a4] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#7f91a4] block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#7f91a4] block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#7f91a4] block mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#7f91a4] block mb-1">Role</label>
                  <select
                    value={editRole}
                    disabled={editingUser.id === currentUser?.id}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-[#0e1621] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#7f91a4] block mb-1">Approval Clearance</label>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editStatus}
                        disabled={editingUser.id === currentUser?.id}
                        onChange={(e) => setEditStatus(e.target.checked)}
                        className="rounded text-[#5288c1] w-4 h-4"
                      />
                      <span className={editStatus ? 'text-emerald-400 font-semibold' : 'text-[#7f91a4]'}>
                        {editStatus ? 'Approved' : 'Suspended'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#7f91a4] block mb-1">
                  Reset Password (optional, leave empty to retain current)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5288c1]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#7f91a4] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
