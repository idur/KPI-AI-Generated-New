import React from 'react';
import { AlertTriangle, X, HelpCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Konfirmasi', 
    cancelText = 'Batal',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const isDanger = type === 'danger';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${isDanger ? 'bg-red-50/50' : 'bg-blue-50/50'}`}>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {isDanger ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <HelpCircle className="w-5 h-5 text-blue-600" />}
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-700 whitespace-pre-wrap">
                        {message}
                    </p>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-white rounded-lg font-medium transition-colors shadow-lg ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
