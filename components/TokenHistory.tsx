import React, { useEffect, useState } from 'react';
import { getTokenHistory, TokenTransaction } from '../services/tokenServiceCloud';
import { Calendar, Coins, ArrowUpRight, ArrowDownLeft, RefreshCw, Loader2 } from 'lucide-react';

export const TokenHistory: React.FC = () => {
    const [history, setHistory] = useState<TokenTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        setLoading(true);
        const data = await getTokenHistory();
        setHistory(data);
        setLoading(false);
    };

    useEffect(() => {
        loadHistory();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') loadHistory();
        };

        window.addEventListener('tokens-updated', loadHistory);
        window.addEventListener('focus', loadHistory);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener('tokens-updated', loadHistory);
            window.removeEventListener('focus', loadHistory);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Riwayat Token</h2>
                    <p className="text-slate-500">Pantau penggunaan dan pembelian token Anda.</p>
                </div>
                <button
                    onClick={loadHistory}
                    className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading && history.length === 0 ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                        <p className="text-slate-500">Memuat riwayat...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Coins className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Belum ada riwayat</h3>
                        <p className="text-slate-500">Penggunaan token Anda akan muncul di sini.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {history.map((item) => (
                            <div key={item.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'PURCHASE' ? 'bg-green-100 text-green-600' :
                                            item.type === 'DAILY_RESET' ? 'bg-blue-100 text-blue-600' :
                                                'bg-amber-100 text-amber-600'
                                        }`}>
                                        {item.type === 'PURCHASE' ? <ArrowDownLeft className="w-5 h-5" /> :
                                            item.type === 'DAILY_RESET' ? <RefreshCw className="w-5 h-5" /> :
                                                <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-900">
                                            {item.type === 'PURCHASE' ? 'Top Up Token' :
                                                item.type === 'DAILY_RESET' ? 'Reset Harian' :
                                                    'Penggunaan Token'}
                                        </h4>
                                        <p className="text-sm text-slate-500">{item.description}</p>
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(item.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-right font-bold ${item.amount > 0 ? 'text-green-600' : 'text-slate-900'
                                    }`}>
                                    {item.amount > 0 ? '+' : ''}{item.amount} Token
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
