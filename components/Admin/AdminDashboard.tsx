import React, { useEffect, useState } from 'react';
import { getAllUsers, updateUserTokens, updateUserRole, resendInvite, deleteUser, UserData } from '../../services/adminService';
import { AlertTriangle, Check, ChevronRight, Copy, Edit2, Loader2, Mail, RefreshCw, Search, Send, Shield, ShieldAlert, Trash2, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { AddUserModal } from './AddUserModal';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { supabase } from '../../services/supabaseClient';

type WebhookEventRow = {
    id: string;
    provider: string;
    event_type: string | null;
    external_id: string | null;
    customer_id: string | null;
    customer_email: string | null;
    user_id: string | null;
    signature_present: boolean | null;
    signature_valid: boolean | null;
    http_status: number | null;
    error_message: string | null;
    processed: boolean | null;
    result: string | null;
    payload: any;
    created_at: string;
};

export const AdminDashboard: React.FC = () => {
    const { success, error: toastError } = useToast();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [resendingEmails, setResendingEmails] = useState<Record<string, boolean>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // userId to delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

    const [activeTab, setActiveTab] = useState<'users' | 'webhooks'>('users');

    const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
    const [webhookLoading, setWebhookLoading] = useState(false);
    const [webhookSearchTerm, setWebhookSearchTerm] = useState('');
    const [webhookResultFilter, setWebhookResultFilter] = useState<'all' | 'success' | 'failed' | 'testing' | 'received'>('all');
    const [webhookLimit, setWebhookLimit] = useState<25 | 50 | 100>(25);
    const [selectedWebhook, setSelectedWebhook] = useState<WebhookEventRow | null>(null);
    const [lastUpdatedUsersAt, setLastUpdatedUsersAt] = useState<Date | null>(null);
    const [lastUpdatedWebhooksAt, setLastUpdatedWebhooksAt] = useState<Date | null>(null);

    const getHashQuery = (): URLSearchParams => {
        const hash = window.location.hash || '';
        const idx = hash.indexOf('?');
        if (idx === -1) return new URLSearchParams();
        return new URLSearchParams(hash.slice(idx + 1));
    };

    const setHashQuery = (next: URLSearchParams) => {
        const hash = window.location.hash || '';
        const idx = hash.indexOf('?');
        const base = idx === -1 ? hash : hash.slice(0, idx);
        const qs = next.toString();
        const nextHash = qs ? `${base}?${qs}` : base;
        if (nextHash !== window.location.hash) window.location.hash = nextHash;
    };

    const setActiveTabPersisted = (tab: 'users' | 'webhooks') => {
        setActiveTab(tab);
        try {
            localStorage.setItem('admin_dashboard_tab', tab);
        } catch { }
        const q = getHashQuery();
        q.set('tab', tab);
        setHashQuery(q);
    };

    const formatUpdatedAt = (d: Date | null) => {
        if (!d) return '—';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const copyToClipboard = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            success(`${label} disalin`);
        } catch {
            toastError('Gagal menyalin');
        }
    };

    // Edit Form State
    const [editForm, setEditForm] = useState<{
        freeTokens: number;
        paidTokens: number;
        role: 'admin' | 'user';
    }>({ freeTokens: 0, paidTokens: 0, role: 'user' });

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
            setLastUpdatedUsersAt(new Date());
        } catch (error) {
            console.error(error);
            toastError('Gagal memuat data user. Pastikan Anda memiliki akses Admin.');
        } finally {
            setLoading(false);
        }
    };

    const loadWebhookEvents = async () => {
        setWebhookLoading(true);
        try {
            const { data, error } = await supabase
                .from('webhook_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(webhookLimit);

            if (error) throw error;
            setWebhookEvents((data as WebhookEventRow[]) || []);
            setLastUpdatedWebhooksAt(new Date());
        } catch (e: any) {
            console.error(e);
            toastError(e?.message || 'Gagal memuat webhook events');
        } finally {
            setWebhookLoading(false);
        }
    };

    const sendWebhookTest = async () => {
        setWebhookLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('mayar-webhook', {
                body: {
                    event: 'testing',
                    data: {
                        id: `ui-test-${Date.now()}`,
                        status: true,
                        createdAt: Date.now()
                    }
                }
            });

            if (error) throw error;
            success((data as any)?.message || 'Test webhook terkirim');
            await loadWebhookEvents();
        } catch (e: any) {
            console.error(e);
            toastError(e?.message || 'Gagal mengirim test webhook');
        } finally {
            setWebhookLoading(false);
        }
    };

    const handleSyncUsers = async () => {
        setSyncing(true);
        // info('Menyinkronkan status user...'); // No longer needed
        try {
            // We just reload users now, as getAllUsers handles the fetch-merge
            await loadUsers();
            success(`Data updated.`);
        } catch (error: any) {
            console.error(error);
            toastError(`Gagal load user: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const q = getHashQuery();
        const fromHash = q.get('tab');
        const fromStorage = (() => {
            try {
                return localStorage.getItem('admin_dashboard_tab');
            } catch {
                return null;
            }
        })();

        const initialTab = (fromHash === 'webhooks' || fromStorage === 'webhooks') ? 'webhooks' : 'users';
        setActiveTab(initialTab);

        loadUsers();
        if (initialTab === 'webhooks') loadWebhookEvents();
    }, []);

    useEffect(() => {
        if (activeTab === 'webhooks' && webhookEvents.length === 0) {
            loadWebhookEvents();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'webhooks') {
            loadWebhookEvents();
        }
    }, [webhookLimit]);

    useEffect(() => {
        if (activeTab !== 'webhooks') setSelectedWebhook(null);
    }, [activeTab]);

    const handleEditClick = (u: UserData) => {
        setEditingId(u.user_id);
        setEditForm({
            freeTokens: u.freeTokens,
            paidTokens: u.legacyPaidTokens ?? u.paidTokens,
            role: u.role || 'user'
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleSaveEdit = async (userId: string) => {
        try {
            // Update Role
            await updateUserRole(userId, editForm.role);
            // Update Tokens
            await updateUserTokens(userId, editForm.freeTokens, editForm.paidTokens);

            success('User berhasil diupdate!');
            setEditingId(null);
            loadUsers(); // Refresh list
        } catch (error: any) {
            toastError('Gagal update user: ' + error.message);
        }
    };

    const handleResendInvite = async (email: string) => {
        if (resendingEmails[email]) return;

        setResendingEmails(prev => ({ ...prev, [email]: true }));
        try {
            const result = await resendInvite(email);
            success(result.message || `Undangan dikirim ulang ke ${email}. Sisa kuota: ${result.remaining}`);
        } catch (error: any) {
            console.error(error);
            toastError(error.message || "Gagal mengirim ulang undangan.");
        } finally {
            setResendingEmails(prev => ({ ...prev, [email]: false }));
        }
    };

    const handleDeleteClick = (user: UserData) => {
        setUserToDelete({ id: user.user_id, email: user.email || 'Unknown User' });
        setShowDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        const userId = userToDelete.id;
        setDeleteConfirm(userId);
        setShowDeleteModal(false); // Close modal immediately, show loader on button

        try {
            await deleteUser(userId);
            success('User berhasil dihapus.');
            loadUsers();
        } catch (error: any) {
            toastError('Gagal menghapus user: ' + error.message);
        } finally {
            setDeleteConfirm(null);
            setUserToDelete(null);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.user_id.includes(userSearchTerm) ||
        String(u.mayarCustomerId || '').toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    const filteredWebhookEvents = webhookEvents.filter((ev) => {
        const q = webhookSearchTerm.trim().toLowerCase();
        const hay = [
            ev.id,
            ev.provider,
            ev.event_type || '',
            ev.external_id || '',
            ev.customer_email || '',
            ev.customer_id || '',
            ev.user_id || '',
            ev.result || '',
            ev.error_message || ''
        ].join(' ').toLowerCase();

        if (q && !hay.includes(q)) return false;

        if (webhookResultFilter === 'all') return true;
        if (webhookResultFilter === 'failed') return Boolean(ev.error_message) || (ev.signature_present && ev.signature_valid === false) || (ev.http_status !== null && ev.http_status >= 400);
        if (webhookResultFilter === 'success') return !ev.error_message && (ev.processed === true || ev.result === 'paid_processed' || ev.result === 'testing');
        if (webhookResultFilter === 'testing') return (ev.event_type || '').toLowerCase() === 'testing' || ev.result === 'testing';
        if (webhookResultFilter === 'received') return (ev.result || '') === 'received' || (ev.processed === false && !ev.error_message);
        return true;
    });

    if (loading) {
        return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-8 h-8 text-brand-600" />
                        Admin Dashboard
                    </h2>
                    <p className="text-slate-500">Kelola Data User dan cek log webhook</p>
                </div>
            </div>

            <div className="mb-6 border-b border-slate-200">
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => setActiveTabPersisted('users')}
                        className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'users' ? 'text-brand-700 border-brand-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Data User
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTabPersisted('webhooks')}
                        className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'webhooks' ? 'text-brand-700 border-brand-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Webhook Verification
                    </button>
                </div>
            </div>

            {activeTab === 'webhooks' ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                        <div>
                            <div className="font-semibold text-slate-900">Webhook Verification</div>
                            <div className="text-xs text-slate-500">Last updated: {formatUpdatedAt(lastUpdatedWebhooksAt)}</div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari event id / email / error..."
                                    value={webhookSearchTerm}
                                    onChange={e => setWebhookSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-full"
                                />
                            </div>
                            <select
                                value={webhookResultFilter}
                                onChange={(e) => setWebhookResultFilter(e.target.value as any)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                            >
                                <option value="all">Semua</option>
                                <option value="success">Sukses</option>
                                <option value="failed">Gagal</option>
                                <option value="testing">Testing</option>
                                <option value="received">Received</option>
                            </select>
                            <select
                                value={webhookLimit}
                                onChange={(e) => setWebhookLimit(Number(e.target.value) as any)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <button
                                onClick={sendWebhookTest}
                                disabled={webhookLoading}
                                className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed text-sm font-medium"
                            >
                                {webhookLoading ? 'Mengirim...' : 'Kirim Test'}
                            </button>
                            <button
                                onClick={loadWebhookEvents}
                                disabled={webhookLoading}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-70 disabled:cursor-not-allowed"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-600 ${webhookLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Waktu</th>
                                    <th className="px-6 py-3">Event</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Customer ID</th>
                                    <th className="px-6 py-3">User ID</th>
                                    <th className="px-6 py-3">Signature</th>
                                    <th className="px-6 py-3">Result</th>
                                    <th className="px-6 py-3">HTTP</th>
                                    <th className="px-6 py-3 text-right">Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {webhookLoading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-slate-500">
                                            <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memuat log webhook...</div>
                                        </td>
                                    </tr>
                                ) : filteredWebhookEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-slate-500">
                                            Tidak ada event yang cocok dengan filter/pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWebhookEvents.map((ev) => {
                                        const signatureLabel = ev.signature_present
                                            ? (ev.signature_valid ? 'Valid' : 'Invalid')
                                            : 'Missing';
                                        const signatureClass = ev.signature_present
                                            ? (ev.signature_valid ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50')
                                            : 'text-slate-600 bg-slate-100';
                                        const hasIssue = Boolean(ev.error_message) || (ev.signature_present && ev.signature_valid === false) || (ev.http_status !== null && ev.http_status >= 400);
                                        const resultText = ev.error_message || ev.result || (ev.processed ? 'processed' : 'received');
                                        const resultPill = hasIssue ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';

                                        return (
                                            <tr
                                                key={ev.id}
                                                className={`hover:bg-slate-50 cursor-pointer ${hasIssue ? 'border-l-2 border-red-500' : 'border-l-2 border-transparent'}`}
                                                onClick={() => setSelectedWebhook(ev)}
                                            >
                                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                                    {new Date(ev.created_at).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-6 py-3 text-slate-900 whitespace-nowrap">
                                                    {ev.event_type || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                                    {ev.customer_email || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-slate-700 whitespace-nowrap" title={ev.customer_id || ''}>
                                                    {ev.customer_id ? ev.customer_id.slice(0, 8) + '…' : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-slate-700 whitespace-nowrap" title={ev.user_id || ''}>
                                                    {ev.user_id ? ev.user_id.slice(0, 8) + '…' : '-'}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${signatureClass}`}>
                                                        {signatureLabel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${resultPill}`}>
                                                        {resultText.length > 28 ? resultText.slice(0, 28) + '…' : resultText}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                                                    {ev.http_status ?? '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedWebhook(ev); }}
                                                    >
                                                        lihat
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                        <div>
                            <div className="font-semibold text-slate-900">Data User</div>
                            <div className="text-xs text-slate-500">Last updated: {formatUpdatedAt(lastUpdatedUsersAt)}</div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari email / user id / Mayar ID..."
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-full"
                                />
                            </div>
                            <button
                                onClick={handleSyncUsers}
                                disabled={syncing}
                                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-600 ${syncing ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button
                                onClick={() => setShowAddUserModal(true)}
                                className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm font-medium"
                            >
                                Add User
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">User Email</th>
                                    <th className="px-6 py-4">Mayar Customer ID</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Free Tokens</th>
                                    <th className="px-6 py-4">Legacy Paid</th>
                                    <th className="px-6 py-4">Mayar Tokens</th>
                                    <th className="px-6 py-4">Paid Tokens (Total)</th>
                                    <th className="px-6 py-4">Total Balance</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => {
                                    const isEditing = editingId === user.user_id;

                                    return (
                                        <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    <span>{user.email}</span>
                                                    {user.email ? (
                                                        <button
                                                            type="button"
                                                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                                            onClick={() => copyToClipboard(user.email || '', 'Email')}
                                                            title="Copy"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : null}
                                                </div>
                                                {user.status === 'invited' && (
                                                    <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <Mail className="w-3 h-3" />
                                                        Pending Invite
                                                    </div>
                                                )}
                                                <div className="mt-1 text-[11px] text-slate-400 font-mono">{user.user_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.mayarCustomerId ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-700 font-mono text-xs">{String(user.mayarCustomerId)}</span>
                                                        <button
                                                            type="button"
                                                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                                            onClick={() => copyToClipboard(String(user.mayarCustomerId), 'Mayar Customer ID')}
                                                            title="Copy"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.role}
                                                        onChange={e => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                                                        className="border border-brand-300 rounded px-2 py-1 text-xs"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                                                        {user.role === 'admin' ? <ShieldAlert className="w-3 h-3 mr-1" /> : null}
                                                        {user.role || 'User'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="w-20 border border-brand-300 rounded px-2 py-1"
                                                        value={editForm.freeTokens}
                                                        onChange={e => setEditForm({ ...editForm, freeTokens: parseInt(e.target.value) || 0 })}
                                                    />
                                                ) : (
                                                    <span className="text-slate-600">{user.freeTokens}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="w-20 border border-brand-300 rounded px-2 py-1"
                                                        value={editForm.paidTokens}
                                                        onChange={e => setEditForm({ ...editForm, paidTokens: parseInt(e.target.value) || 0 })}
                                                    />
                                                ) : (
                                                    <span className="text-slate-600">{user.legacyPaidTokens ?? 0}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-emerald-600 font-medium">{user.mayarAvailableTokens ?? 0}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <span className="text-emerald-600 font-medium">
                                                        {editForm.paidTokens + (user.mayarAvailableTokens ?? 0)}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600 font-medium">{user.paidTokens}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                {(() => {
                                                    const paidTotal = isEditing
                                                        ? (editForm.paidTokens + (user.mayarAvailableTokens ?? 0))
                                                        : user.paidTokens;
                                                    const free = isEditing ? editForm.freeTokens : user.freeTokens;
                                                    return <span>{free + paidTotal}</span>;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleSaveEdit(user.user_id)} className="p-1.5 bg-brand-100 text-brand-700 rounded hover:bg-brand-200">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {user.status === 'invited' && (
                                                            <button
                                                                onClick={() => user.email && handleResendInvite(user.email)}
                                                                disabled={
                                                                    resendingEmails[user.email || ''] ||
                                                                    (!!user.resendCount && user.resendCount >= 3 && !!user.lastResendAt && new Date(user.lastResendAt).getDate() === new Date().getDate()) ||
                                                                    false
                                                                }
                                                                title={
                                                                    !!user.resendCount && user.resendCount >= 3 && !!user.lastResendAt && new Date(user.lastResendAt).getDate() === new Date().getDate()
                                                                        ? "Batas harian (3x) tercapai"
                                                                        : "Resend Invitation Email"
                                                                }
                                                                className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {resendingEmails[user.email || ''] ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Send className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleEditClick(user)} className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(user)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                                            disabled={deleteConfirm === user.user_id}
                                                        >
                                                            {deleteConfirm === user.user_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedWebhook ? (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedWebhook(null)} />
                    <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm text-slate-500">Webhook Event</div>
                                <div className="mt-1 font-semibold text-slate-900 break-all">{selectedWebhook.id}</div>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                        {selectedWebhook.event_type || 'unknown'}
                                    </span>
                                    {selectedWebhook.error_message ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            failed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                            <Check className="w-3.5 h-3.5" />
                                            ok
                                        </span>
                                    )}
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                        HTTP {selectedWebhook.http_status ?? '-'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                                    onClick={() => copyToClipboard(selectedWebhook.id, 'Event ID')}
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy ID
                                </button>
                                <button
                                    type="button"
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                                    onClick={() => setSelectedWebhook(null)}
                                    title="Close"
                                >
                                    <X className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="text-xs text-slate-500">Waktu</div>
                                    <div className="mt-1 text-slate-900 font-medium">{new Date(selectedWebhook.created_at).toLocaleString('id-ID')}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="text-xs text-slate-500">Provider</div>
                                    <div className="mt-1 text-slate-900 font-medium">{selectedWebhook.provider || '-'}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="text-xs text-slate-500">Email</div>
                                    <div className="mt-1 text-slate-900 font-medium break-all">{selectedWebhook.customer_email || '-'}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="text-xs text-slate-500">Customer ID</div>
                                    <div className="mt-1 text-slate-900 font-medium break-all">{selectedWebhook.customer_id || '-'}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="text-xs text-slate-500">User ID</div>
                                    <div className="mt-1 text-slate-900 font-medium break-all">{selectedWebhook.user_id || '-'}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="text-xs text-slate-500">Result</div>
                                    <div className="mt-1 text-slate-900 font-medium break-all">{selectedWebhook.result || (selectedWebhook.processed ? 'processed' : 'received')}</div>
                                </div>
                            </div>

                            {selectedWebhook.error_message ? (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="text-xs font-semibold text-red-700">Error</div>
                                    <div className="mt-1 text-sm text-red-800 whitespace-pre-wrap break-words">{selectedWebhook.error_message}</div>
                                </div>
                            ) : null}

                            <div className="mt-6 flex items-center justify-between">
                                <div className="font-semibold text-slate-900">Payload</div>
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                                    onClick={() => copyToClipboard(JSON.stringify(selectedWebhook.payload ?? {}, null, 2), 'Payload')}
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy payload
                                </button>
                            </div>
                            <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-[12px] bg-slate-50 border border-slate-200 rounded p-4 text-slate-800">{JSON.stringify(selectedWebhook.payload, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            ) : null}

            <AddUserModal isOpen={showAddUserModal} onClose={() => setShowAddUserModal(false)} onSuccess={loadUsers} />
            <ConfirmDeleteModal 
                isOpen={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)} 
                onConfirm={handleDeleteUser} 
                itemName={userToDelete?.email || 'User'} 
                message="Apakah Anda yakin ingin menghapus user ini?"
                warning="⚠️ User akan dihapus permanen. Semua KPI library yang dimiliki user ini juga akan terhapus."
            />
        </div>
    );
};
