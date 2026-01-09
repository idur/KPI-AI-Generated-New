import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Konfirmasi Hapus
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-700 mb-2">
                        Apakah Anda yakin ingin menghapus koleksi KPI ini?
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                        <p className="font-semibold text-slate-900">{itemName}</p>
                    </div>
                    <p className="text-sm text-red-600">
                        ⚠️ Tindakan ini tidak dapat dibatalkan.
                    </p>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                    >
                        Ya, Hapus
                    </button>
                </div>
            </div>
        </div>
    );
};
