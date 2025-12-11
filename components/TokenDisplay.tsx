import React, { useState } from 'react';
import { Coins, Plus } from 'lucide-react';
import { useTokens } from '../services/tokenServiceCloud';
import { BuyTokenModal } from './BuyTokenModal';

export const TokenDisplay: React.FC = () => {
    const { total } = useTokens();
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>{total}</span>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white rounded-full p-1 transition-colors"
                    title="Beli Token"
                >
                    <Plus className="w-3 h-3" />
                </button>
            </div>

            <BuyTokenModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </>
    );
};
