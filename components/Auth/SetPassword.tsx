import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

export const SetPassword: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Double check session existence
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMessage({ 
                type: 'error', 
                text: 'Sesi tidak valid atau kadaluarsa. Silakan klik link di email undangan Anda lagi.' 
            });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Update status to active in user_tokens
            await supabase
                .from('user_tokens')
                .update({ status: 'active' })
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

            setMessage({ type: 'success', text: 'Password updated successfully! You can now access your account.' });

            // Redirect to home after a brief delay
            setTimeout(() => {
                window.location.hash = '#/';
                window.location.reload(); // Hard reload to ensure all state is fresh
            }, 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="bg-brand-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-brand-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Set Your Password</h1>
                    <p className="text-slate-500 mt-2">
                        Welcome! Please set a password for your account to continue.
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-slate-900"
                                placeholder="Min. 6 characters"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-slate-900"
                                placeholder="Repeat your password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Set Password
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
