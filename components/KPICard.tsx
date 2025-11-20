import React, { useState } from 'react';
import { KPI } from '../types';
import { Target, Activity, BarChart2, X, Eye, Info, Book, Database, Calculator, Check, Users, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  kpi: KPI;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({ kpi, isSelected, onToggleSelect }) => {
  const [showModal, setShowModal] = useState(false);

  const getPerspectiveColor = (p: string) => {
    const lower = p.toLowerCase();
    if (lower.includes('financial')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (lower.includes('customer')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (lower.includes('internal') || lower.includes('process')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (lower.includes('learning') || lower.includes('growth')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <>
      <div 
        className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full group relative ${
          isSelected ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/10' : 'border-slate-200'
        }`}
      >
        {/* Selection Checkbox Area */}
        <div className="absolute top-4 right-4 z-10">
          <label className="relative flex items-center justify-center cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors">
            <input 
              type="checkbox" 
              className="peer sr-only"
              checked={isSelected}
              onChange={onToggleSelect}
            />
            <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${
              isSelected 
                ? 'bg-brand-600 border-brand-600 scale-110' 
                : 'border-slate-300 bg-white peer-hover:border-brand-400'
            }`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>
          </label>
        </div>

        <div className="p-5 flex-1 pt-10"> {/* Increased top padding for checkbox space */}
          <div className="flex justify-between items-start mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPerspectiveColor(kpi.perspective)}`}>
              {kpi.perspective}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100 mr-6">{kpi.type}</span>
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-brand-600 transition-colors pr-2">{kpi.kpiName}</h3>
          <p className="text-sm text-slate-600 mb-4 line-clamp-3">{kpi.detail}</p>
          
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded" title="Satuan">
              <Target className="w-3.5 h-3.5" />
              <span className="font-medium">{kpi.unit}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded" title="Polaritas">
              <Activity className="w-3.5 h-3.5" />
              <span>{kpi.polarity}</span>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 mt-auto">
          <button 
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-100"
          >
            <Eye className="w-4 h-4" />
            Lihat Detail Lengkap
          </button>
        </div>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="pr-8">
                <div className="flex items-center gap-3 mb-2">
                   <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPerspectiveColor(kpi.perspective)}`}>
                    {kpi.perspective}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {kpi.type}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{kpi.kpiName}</h2>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                  <span className="font-medium">Role:</span> {kpi.jobDescription}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Polaritas</span>
                  </div>
                  <p className="font-semibold text-slate-900">{kpi.polarity}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Satuan</span>
                  </div>
                  <p className="font-semibold text-slate-900">{kpi.unit}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <BarChart2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Pengukuran</span>
                  </div>
                  <p className="font-semibold text-slate-900">{kpi.measurement}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                    <Info className="w-4 h-4 text-brand-500" />
                    Deskripsi Detail
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-white">{kpi.detail}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   {/* Definition */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                      <Book className="w-4 h-4 text-brand-500" />
                      Definisi Operasional
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed h-full">
                      {kpi.definition}
                    </div>
                  </div>

                  {/* Data Source */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                      <Database className="w-4 h-4 text-brand-500" />
                      Sumber Data
                    </h4>
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed h-full">
                      {kpi.dataSource}
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                    <Calculator className="w-4 h-4 text-brand-500" />
                    Formula Perhitungan
                  </h4>
                  <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm shadow-inner overflow-x-auto">
                    {kpi.formula}
                  </div>
                </div>

                {/* Extended Analysis (Target Audience & Challenges) */}
                {(kpi.targetAudience || kpi.measurementChallenges) && (
                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-4">
                    {kpi.targetAudience && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                          <Users className="w-4 h-4 text-brand-500" />
                          Target Audiens
                        </h4>
                        <p className="text-slate-700 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed h-full">
                          {kpi.targetAudience}
                        </p>
                      </div>
                    )}
                    {kpi.measurementChallenges && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Tantangan Pengukuran
                        </h4>
                        <p className="text-slate-700 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed h-full">
                          {kpi.measurementChallenges}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Tutup
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
