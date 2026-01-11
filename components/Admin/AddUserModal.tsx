import React, { useState } from 'react';
import { X, UserPlus, Loader2, Mail, User, Coins, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../contexts/ToastContext';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { success, error: toastError } = useToast();
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [initialTokens, setInitialTokens] = useState(10);
    const [creationMethod, setCreationMethod] = useState<'invite' | 'manual'>('invite');
    const [password, setPassword] = useState('');
    const [isAutoPassword, setIsAutoPassword] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-generate password on manual select
    React.useEffect(() => {
        if (creationMethod === 'manual' && isAutoPassword) {
            generatePassword();
        }
    }, [creationMethod, isAutoPassword]);

    const generatePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        setPassword(retVal);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Attempt to call the Edge Function
            // Note: This requires the function to be deployed
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email,
                    fullName,
                    tokens: initialTokens,
                    // Send password only if manual method is selected
                    password: creationMethod === 'manual' ? password : undefined
                }
            });

            if (error) {
                console.error("Supabase Function Error:", error);

                // Specific check for invocation failure (usually means not deployed)
                if (error.message.includes('Failed to send a request') || error.message.includes('Function not found')) {
                    throw new Error(
                        "Gagal menghubungi backend. Kemungkinan Edge Function 'create-user' belum dideploy.\n\n" +
                        "Silakan jalankan perintah ini di terminal:\n" +
                        "npx supabase functions deploy create-user --no-verify-jwt"
                    );
                }

                throw error;
            }

            if (data && data.error) {
                throw new Error(data.error);
            }

            // Success
            if (creationMethod === 'manual') {
                success(`User dibuat dengan password sementara. Email terkirim ke ${email}`);
                // Optional: Show password to admin one last time? 
                // Currently assuming email delivery or admin copied it.
            } else {
                success(`Undangan berhasil dikirim ke: ${email}`);
            }
            onSuccess();
            onClose();

        } catch (err: any) {
            console.error(err);
            // Fallback instruction if function fails
            setError(err.message || "Gagal mengundang user.");
            toastError("Gagal mengundang user.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-brand-600" />
                        Tambah User Baru
                    </h3>
                    <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4 whitespace-pre-wrap">
                            {error}
                        </div>
                    )}

                    {/* Method Selector */}
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-4">
                        <button
                            type="button"
                            onClick={() => setCreationMethod('invite')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${creationMethod === 'invite' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Kirim Undangan (Magic Link)
                        </button>
                        <button
                            type="button"
                            onClick={() => setCreationMethod('manual')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${creationMethod === 'manual' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Buat Password Manual
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="nama@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="Nama User (Opsional)"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Token Awal</label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="number"
                                required
                                min={0}
                                value={initialTokens}
                                onChange={(e) => setInitialTokens(parseInt(e.target.value) || 0)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Password Section for Manual Method */}
                    {creationMethod === 'manual' && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Password Sementara</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="autoPass"
                                        checked={isAutoPassword}
                                        onChange={(e) => setIsAutoPassword(e.target.checked)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <label htmlFor="autoPass" className="text-xs text-slate-600 cursor-pointer">Auto-generate</label>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setIsAutoPassword(false);
                                    }}
                                    className="w-full px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    placeholder="Masukkan password..."
                                />
                                {isAutoPassword && (
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-600"
                                        title="Regenerate"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Password ini akan dikirim ke email user. User wajib menggantinya saat login pertama.
                            </p>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    <span>{creationMethod === 'manual' ? 'Buat User' : 'Kirim Undangan'}</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center mt-2">
                        {creationMethod === 'manual' 
                            ? 'User bisa langsung login dengan password di atas.' 
                            : 'User akan menerima email berisi link untuk membuat password.'}
                    </p>
                </form>
            </div>
        </div>
    );
};
