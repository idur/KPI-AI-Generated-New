import React, { useEffect, useState } from 'react';
import { getAllUsers, updateUserTokens, updateUserRole, resendInvite, deleteUser, UserData } from '../../services/adminService';
import { Loader2, Search, Edit2, Check, X, Shield, ShieldAlert, Coins, UserPlus, RefreshCw, Send, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
    const { user } = useAuth();
    const { success, error: toastError, info } = useToast();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [resendingEmails, setResendingEmails] = useState<Record<string, boolean>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // userId to delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

    const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
    const [webhookLoading, setWebhookLoading] = useState(false);

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
                .limit(25);

            if (error) throw error;
            setWebhookEvents((data as WebhookEventRow[]) || []);
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
        loadUsers();
        loadWebhookEvents();
    }, []);

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
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.user_id.includes(searchTerm) ||
        String(u.mayarCustomerId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <p className="text-slate-500">Kelola User, Role, dan Token</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari email user..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-full sm:w-64"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddUserModal(true)}
                        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors font-medium whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add User</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <div className="font-semibold text-slate-900">Webhook Verification</div>
                        <div className="text-xs text-slate-500">Log event masuk dari Mayar untuk memastikan webhook berjalan.</div>
                    </div>
                    <div className="flex items-center gap-2">
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
                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Waktu</th>
                                <th className="px-6 py-3">Event</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Customer ID</th>
                                <th className="px-6 py-3">User ID</th>
                                <th className="px-6 py-3">Signature</th>
                                <th className="px-6 py-3">Result</th>
                                <th className="px-6 py-3">HTTP</th>
                                <th className="px-6 py-3">Raw</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {webhookEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-6 text-slate-500">
                                        Belum ada event webhook. Klik "Kirim Test" atau pastikan webhook Mayar mengarah ke endpoint Supabase.
                                    </td>
                                </tr>
                            ) : (
                                webhookEvents.map((ev) => {
                                    const signatureLabel = ev.signature_present
                                        ? (ev.signature_valid ? 'Valid' : 'Invalid')
                                        : 'Missing';
                                    const signatureClass = ev.signature_present
                                        ? (ev.signature_valid ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50')
                                        : 'text-slate-600 bg-slate-100';
                                    const statusClass = ev.error_message ? 'text-red-700' : 'text-slate-700';
                                    const result = ev.error_message || ev.result || (ev.processed ? 'processed' : 'received');

                                    return (
                                        <tr key={ev.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                                {new Date(ev.created_at).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-6 py-3 text-slate-900 whitespace-nowrap">
                                                {ev.event_type || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                                {ev.customer_email || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                                {ev.customer_id ? ev.customer_id.slice(0, 8) + '…' : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                                {ev.user_id ? ev.user_id.slice(0, 8) + '…' : '-'}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${signatureClass}`}> 
                                                    {signatureLabel}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 whitespace-nowrap ${statusClass}`}>
                                                {result}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                                                {ev.http_status ?? '-'}
                                            </td>
                                            <td className="px-6 py-3">
                                                <details>
                                                    <summary className="cursor-pointer text-brand-600">lihat</summary>
                                                    <pre className="mt-2 max-w-[720px] whitespace-pre-wrap break-words text-[11px] bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">{JSON.stringify(ev.payload, null, 2)}</pre>
                                                </details>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
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
                                            <div className="font-medium text-slate-900">{user.email}</div>
                                            {user.status === 'invited' && (
                                                <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                    <Mail className="w-3 h-3" />
                                                    Pending Invite
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.mayarCustomerId ? (
                                                <span className="text-slate-700 font-mono text-xs">{String(user.mayarCustomerId)}</span>
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
