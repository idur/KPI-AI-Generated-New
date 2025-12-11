import React from 'react';
import { FileSpreadsheet, ArrowRight } from 'lucide-react';

interface CSVGuideProps {
    onOpenModal: () => void;
}

export const CSVGuide: React.FC<CSVGuideProps> = ({ onOpenModal }) => {
    return (
        <button
            onClick={onOpenModal}
            className="w-full mt-6 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
            {/* Animated Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 transition-colors">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg mb-1">Bulk Upload dengan CSV</h3>
                        <p className="text-sm text-blue-100">Generate KPI untuk multiple roles sekaligus - Klik untuk info lengkap</p>
                    </div>
                </div>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
};
