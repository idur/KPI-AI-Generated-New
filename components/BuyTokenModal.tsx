import React, { useState } from 'react';
import { Coins, CreditCard, X, Loader2 } from 'lucide-react';
import { useTokens } from '../services/tokenServiceCloud';
import { initiatePayment } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';

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
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleBuyPackage = async (amount: number, price: number, priceLabel: string) => {
        if (!user) {
            alert("Silakan login terlebih dahulu untuk melakukan pembelian.");
            return;
        }

        if (confirm(`Beli ${amount} Token seharga ${priceLabel}? Anda akan diarahkan ke halaman pembayaran DOKU.`)) {
            setIsProcessing(true);
            try {
                // Generate secure order ID
                const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const paymentUrl = await initiatePayment({
                    orderId,
                    amount: price,
                    customerEmail: user.email || 'customer@example.com',
                    customerName: user.user_metadata?.full_name || user.email || 'Customer',
                });

                // Redirect to DOKU Payment Page
                window.location.href = paymentUrl;

            } catch (error: any) {
                console.error("Payment Error:", error);
                alert(`Gagal memproses pembayaran: ${error.message}`);
                setIsProcessing(false);
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
                {isProcessing && (
                    <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
                        <p className="text-slate-600 font-medium">Menghubungkan ke DOKU...</p>
                    </div>
                )}

                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Coins className="w-6 h-6 text-amber-500" />
                        Top Up Token
                    </h3>
                    <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 text-center space-y-4">
                    <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Coins className="w-8 h-8 text-amber-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800">
                        Top Up Token
                    </h4>
                    <p className="text-slate-600">
                        Fitur pembayaran otomatis sedang dalam pemeliharaan.

                        Silahkan hubungi admin untuk menambah token Anda.
                    </p>

                    <a href="https://wa.me/6285111031581" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700 mt-2">
                        Hubungi Admin via WhatsApp
                    </a>
                </div>

                <div className="p-4 bg-slate-50 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
                    <span>Powered by</span> <a href="http://betterandco.com" target="_blank" rel="noreferrer" className="font-bold text-slate-700 hover:text-brand-600">Better&Co.</a>
                </div>
            </div>
        </div>
    );
};
