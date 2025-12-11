import React from 'react';
import { Coins, CreditCard, X } from 'lucide-react';
import { useTokens } from '../services/tokenServiceCloud';

interface BuyTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PACKAGES = [
    { tokens: 10, priceLabel: "Rp 95.000", desc: "Starter Pack", popular: false },
    { tokens: 20, priceLabel: "Rp 190.000", desc: "Basic Pack", popular: false },
    { tokens: 50, priceLabel: "Rp 450.000", desc: "Value Pack", popular: true },
    { tokens: 100, priceLabel: "Rp 800.000", desc: "Pro Pack", popular: false },
    { tokens: 200, priceLabel: "Rp 1.500.000", desc: "Enterprise", popular: false },
];

export const BuyTokenModal: React.FC<BuyTokenModalProps> = ({ isOpen, onClose }) => {
    const { free, paid, buyTokens } = useTokens();

    if (!isOpen) return null;

    const handleBuyPackage = (amount: number, price: string) => {
        if (confirm(`Beli ${amount} Token seharga ${price}?`)) {
            buyTokens(amount);
            alert("Pembelian berhasil!");
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Coins className="w-6 h-6 text-amber-500" />
                        Top Up Token
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                        <p className="text-sm text-blue-800">
                            <span className="font-bold">Status Anda:</span> {free} Token Harian (Gratis) + {paid} Token Premium.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            1 KPI = 1 Token. Token Harian reset setiap hari.
                        </p>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {PACKAGES.map((pkg) => (
                            <button
                                key={pkg.tokens}
                                onClick={() => handleBuyPackage(pkg.tokens, pkg.priceLabel)}
                                className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all group relative overflow-hidden ${pkg.popular ? 'border-brand-200 bg-brand-50/50 hover:bg-brand-50' : 'border-slate-200 hover:border-brand-500 hover:bg-brand-50'}`}
                            >
                                {pkg.popular && (
                                    <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">
                                        POPULAR
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${pkg.popular ? 'bg-brand-100 text-brand-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {pkg.popular ? <CreditCard className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900">{pkg.tokens} Token</p>
                                        <p className="text-xs text-slate-500">{pkg.desc}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-brand-600 text-sm">{pkg.priceLabel}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 text-center text-xs text-slate-500">
                    Pembayaran simulasi (Mock Payment)
                </div>
            </div>
        </div>
    );
};
