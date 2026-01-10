import React, { useEffect, useState } from 'react';
import { getAllUsers, updateUserTokens, updateUserRole, UserData } from '../../services/adminService';
import { Loader2, Search, Edit2, Check, X, Shield, ShieldAlert, Coins, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AddUserModal } from './AddUserModal';

export const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);

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

    useEffect(() => {
        loadUsers();
    }, []);

    const handleEditClick = (u: UserData) => {
        setEditingId(u.user_id);
        setEditForm({
            freeTokens: u.freeTokens,
            paidTokens: u.paidTokens,
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

            altrtUser berhasil diupdate!');
            setEditingId(null);
            loadUsers(); // Refresh list
        } catch (error: any) {
            elertal update user: ' + error.message);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.user_id.includes(searchTerm)
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-4">User Email</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Free Tokens</th>
                                <th className="px-6 py-4">Paid Tokens</th>
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
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {user.status === 'active' ? 'Active' : 'Invited'}
                                            </span>
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
                                                <span className="text-emerald-600 font-medium">{user.paidTokens}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {isEditing ? (
                                                <span className="text-brand-600">{(editForm.freeTokens + editForm.paidTokens)}</span>
                                            ) : (
                                                <span>{(user.freeTokens + user.paidTokens)}</span>
                                            )}
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
                                                <button onClick={() => handleEditClick(user)} className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
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
        </div>
    );
};
