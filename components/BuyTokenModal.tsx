import React, { useState } from 'react';
import { Coins, CreditCard, X, Loader2, ExternalLink } from 'lucide-react';
import { useTokens, MAYAR_CONFIG } from '../services/tokenServiceCloud';
import { useAuth } from '../contexts/AuthContext';

interface BuyTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PACKAGES = [
    { tokens: 10, price: 95000, priceLabel: "Rp 95.000", desc: "Starter Pack", popular: false },
    { tokens: 20, price: 190000, priceLabel: "Rp 190.000", desc: "Basic Pack", popular: false },
    { tokens: 50, price: 450000, priceLabel: "Rp 450.000", desc: "Value Pack", popular: true },
    { tokens: 100, price: 800000, priceLabel: "Rp 800.000", desc: "Pro Pack", popular: false },
    { tokens: 200, price: 1500000, priceLabel: "Rp 1.500.000", desc: "Enterprise", popular: false },
];

export const BuyTokenModal: React.FC<BuyTokenModalProps> = ({ isOpen, onClose }) => {
    const { free, paid } = useTokens();
    const { user } = useAuth();
    
    if (!isOpen) return null;

    const handleMayarRedirect = () => {
        if (!user) {
            alert("Silakan login terlebih dahulu untuk melakukan pembelian.");
            return;
        }
        
        // Redirect to Mayar Payment Link
        // We append email to pre-fill if supported by Mayar link (often ?email=...)
        const url = new URL(MAYAR_CONFIG.paymentUrl);
        if (user.email) {
            url.searchParams.append('email', user.email);
            url.searchParams.append('name', user.user_metadata?.full_name || '');
            // Pass customerId if needed by Mayar to auto-assign credit
            url.searchParams.append('custom_field_1', user.id); // Example: Pass UserID as custom field
        }
        
        window.open(url.toString(), '_blank');
        onClose();
        alert("Silakan selesaikan pembayaran di halaman Mayar. Saldo token Anda akan bertambah otomatis setelah pembayaran berhasil dikonfirmasi.");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
                
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Coins className="w-6 h-6 text-amber-500" />
                        Top Up Token
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                        <Coins className="w-10 h-10 text-amber-600" />
                    </div>
                    
                    <div>
                        <h4 className="text-lg font-semibold text-slate-800 mb-2">
                            Beli Token via Mayar
                        </h4>
                        <p className="text-slate-600 text-sm">
                            Dapatkan token tambahan untuk generate KPI lebih banyak. 
                            Pembayaran aman dan mudah melalui Mayar.
                        </p>
                    </div>

                    <button 
                        onClick={handleMayarRedirect}
                        className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                    >
                        <CreditCard className="w-5 h-5" />
                        Beli Token Sekarang
                        <ExternalLink className="w-4 h-4 opacity-80" />
                    </button>
                    
                    <p className="text-xs text-slate-400">
                        Anda akan diarahkan ke halaman pembayaran Mayar.
                    </p>
                </div>

                <div className="p-4 bg-slate-50 text-center text-xs text-slate-500 flex items-center justify-center gap-1 border-t border-slate-100">
                    <span>Powered by</span> <a href="https://mayar.id" target="_blank" rel="noreferrer" className="font-bold text-pink-600 hover:text-pink-700">Mayar</a>
                </div>
            </div>
        </div>
    );
};
