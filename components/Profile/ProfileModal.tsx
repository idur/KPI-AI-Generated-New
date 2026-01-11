import React, { useState, useEffect } from 'react';
import { X, User, Building2, FileText, Save, Loader2, Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { UserProfile } from '../../types';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<UserProfile>({
        full_name: '',
        company: '',
        bio: '',
        avatar_url: ''
    });

    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user && isOpen) {
            const meta = user.user_metadata || {};
            setFormData({
                full_name: meta.full_name || '',
                company: meta.company || '',
                bio: meta.bio || '',
                avatar_url: meta.avatar_url || ''
            });
            setSuccess(false);
            setError(null);
            setActiveTab('profile');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        }
    }, [user, isOpen]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (passwordData.newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            setLoading(false);
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            setSuccess(true);
            
            // Logout after password change as requested
            setTimeout(async () => {
                await supabase.auth.signOut();
                window.location.hash = '#/login';
                window.location.reload();
            }, 2000);

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: formData.full_name,
                    company: formData.company,
                    bio: formData.bio,
                    avatar_url: formData.avatar_url
                }
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`text-sm font-bold flex items-center gap-2 pb-1 border-b-2 transition-colors ${activeTab === 'profile' ? 'text-brand-600 border-brand-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                        >
                            <User className="w-4 h-4" />
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`text-sm font-bold flex items-center gap-2 pb-1 border-b-2 transition-colors ${activeTab === 'security' ? 'text-brand-600 border-brand-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                        >
                            <Lock className="w-4 h-4" />
                            Security
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            {activeTab === 'profile' ? 'Profile updated successfully!' : 'Password updated! Redirecting to login...'}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            {error}
                        </div>
                    )}

                    {activeTab === 'profile' ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Avatar Section */}
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                        {formData.avatar_url ? (
                                            <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-bold text-slate-400">
                                                {formData.full_name?.charAt(0).toUpperCase() || <User className="w-8 h-8" />}
                                            </span>
                                        )}
                                    </div>

                                    {/* Image Upload Button */}
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                        className="absolute bottom-0 right-0 p-1.5 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-colors z-10"
                                        title="Upload new photo"
                                    >
                                        <Camera className="w-3 h-3" />
                                    </button>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            if (file.size > 2 * 1024 * 1024) {
                                                setError("Image size must be less than 2MB");
                                                return;
                                            }

                                            setLoading(true);
                                            try {
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
                                                const filePath = `${fileName}`;

                                                const { error: uploadError } = await supabase.storage
                                                    .from('avatars')
                                                    .upload(filePath, file);

                                                if (uploadError) throw uploadError;

                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('avatars')
                                                    .getPublicUrl(filePath);

                                                setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
                                                setSuccess(true); // Temporary success feedback
                                                setTimeout(() => setSuccess(false), 2000);
                                            } catch (err: any) {
                                                console.error('Upload error:', err);
                                                setError(err.message || "Failed to upload image");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL</label>
                                    <input
                                        type="url"
                                        value={formData.avatar_url}
                                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                        placeholder="https://example.com/avatar.jpg"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Upload a photo or enter a direct link.</p>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Acme Inc."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Tell us a bit about yourself..."
                                        rows={3}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        placeholder="Min. 8 characters"
                                        className="w-full pl-9 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        placeholder="Repeat new password"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                <strong>Note:</strong> After changing your password, you will be logged out and asked to sign in again with your new credentials.
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Update Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
