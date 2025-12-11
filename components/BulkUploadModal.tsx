import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, CheckCircle2, Sparkles, Zap, Users } from 'lucide-react';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/template_bulk_jd.csv';
        link.download = 'template_bulk_jd.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with Gradient */}
                    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-8 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">Bulk Upload dengan CSV</h2>
                                <p className="text-blue-100 text-sm mt-1">Generate KPI untuk multiple roles sekaligus</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6">

                        {/* Benefits Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mb-3">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-purple-900 mb-1">Super Cepat</h3>
                                <p className="text-sm text-purple-700">Upload 1x untuk puluhan role</p>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mb-3">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-green-900 mb-1">Batch Processing</h3>
                                <p className="text-sm text-green-700">Proses otomatis per batch</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center mb-3">
                                    <FileSpreadsheet className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-amber-900 mb-1">Format Simpel</h3>
                                <p className="text-sm text-amber-700">Hanya 2 kolom: Role & Tugas</p>
                            </div>
                        </div>

                        {/* Format Guide */}
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                Format CSV yang Benar
                            </h3>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-slate-900">Header Baris Pertama:</strong>
                                        <code className="block mt-1 bg-white px-3 py-2 rounded-lg text-sm border border-slate-200 font-mono text-blue-600">
                                            Role,Tugas
                                        </code>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <strong className="text-slate-900">Kolom 1 (Role):</strong>
                                        <p className="text-sm text-slate-600 mt-1">Nama jabatan/posisi</p>
                                        <div className="bg-white px-3 py-2 rounded-lg text-sm border border-slate-200 mt-2">
                                            <span className="text-slate-500">Contoh:</span> <span className="text-slate-900 font-medium">Marketing Manager</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <strong className="text-slate-900">Kolom 2 (Tugas):</strong>
                                        <p className="text-sm text-slate-600 mt-1">Deskripsi tugas dan tanggung jawab spesifik</p>
                                        <div className="bg-white px-3 py-2 rounded-lg text-sm border border-slate-200 mt-2">
                                            <span className="text-slate-500">Contoh:</span> <span className="text-slate-900 font-medium">Merancang strategi pemasaran digital</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <strong className="text-slate-900">Multiple Tasks:</strong>
                                        <p className="text-sm text-slate-600 mt-1">Setiap tugas untuk role yang sama ditulis di baris terpisah</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Code Preview */}
                        <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs text-slate-400 font-mono">📄 Contoh isi file CSV:</p>
                                <span className="text-xs text-green-400 font-mono">✓ Valid Format</span>
                            </div>
                            <pre className="text-sm text-green-400 font-mono leading-relaxed">
                                {`Role,Tugas
Marketing Manager,Merancang strategi pemasaran digital
Marketing Manager,Mengelola kampanye iklan berbayar
Marketing Manager,Menganalisis data performa kampanye
HR Manager,Merancang proses rekrutmen end-to-end
HR Manager,Mengembangkan program pelatihan karyawan
Financial Controller,Menyusun laporan keuangan bulanan`}
                            </pre>
                        </div>

                        {/* Download Section */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-600 rounded-xl">
                                    <Download className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-blue-900 mb-2">Template Siap Pakai</h3>
                                    <p className="text-sm text-blue-700 mb-4">
                                        Download template CSV dengan 3 role dan 15 tugas sebagai contoh. Edit sesuai kebutuhan Anda!
                                    </p>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download Template CSV (3 Role, 15 Tugas)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <p className="font-semibold text-amber-900 mb-1">Tips Pro:</p>
                                    <p className="text-sm text-amber-800">
                                        AI akan generate <strong>2 KPI untuk setiap tugas</strong>. Jadi jika Anda upload 15 tugas, akan dihasilkan sekitar <strong>30 KPI</strong> secara otomatis!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
