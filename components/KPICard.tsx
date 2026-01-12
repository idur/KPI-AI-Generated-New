
import React, { useState, useEffect } from 'react';
import { KPI } from '../types';
import { Target, Activity, BarChart2, X, Eye, Info, Book, Database, Calculator, Check, Users, AlertTriangle, Building2, Briefcase, ClipboardList, Pencil, Save, RotateCcw, Award } from 'lucide-react';

interface KPICardProps {
  kpi: KPI;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdate?: (updatedKpi: KPI) => void;
  language?: 'id' | 'en'; // Add language prop
}

export const KPICard: React.FC<KPICardProps> = ({ kpi, isSelected, onToggleSelect, onUpdate, language = 'id' }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedKpi, setEditedKpi] = useState<KPI>(kpi);

  // Translations for labels
  const t = {
    polarity: language === 'en' ? 'Polarity' : 'Polaritas',
    unit: language === 'en' ? 'Unit' : 'Satuan',
    measurement: language === 'en' ? 'Measurement' : 'Pengukuran',
    viewDetail: language === 'en' ? 'View Full Details' : 'Lihat Detail Lengkap',
    task: language === 'en' ? 'Tasks & Responsibilities' : 'Tugas & Tanggung Jawab',
    description: language === 'en' ? 'Detailed Description' : 'Deskripsi Detail',
    definition: language === 'en' ? 'Operational Definition' : 'Definisi Operasional',
    dataSource: language === 'en' ? 'Data Source' : 'Sumber Data',
    formula: language === 'en' ? 'Calculation Formula' : 'Formula Perhitungan',
    targetAudience: language === 'en' ? 'Target Audience' : 'Target Audiens',
    challenges: language === 'en' ? 'Measurement Challenges' : 'Tantangan Pengukuran',
    scoring: language === 'en' ? 'Scoring Scheme Recommendation' : 'Rekomendasi Skema Skoring',
    cancel: language === 'en' ? 'Cancel' : 'Batal',
    save: language === 'en' ? 'Save Changes' : 'Simpan Perubahan',
    close: language === 'en' ? 'Close' : 'Tutup',
    edit: language === 'en' ? 'Edit KPI' : 'Edit KPI'
  };

  useEffect(() => {
    setEditedKpi(kpi);
  }, [kpi]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedKpi);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedKpi(kpi);
    setIsEditing(false);
  };

  const handleChange = (field: keyof KPI, value: string) => {
    setEditedKpi(prev => ({ ...prev, [field]: value }));
  };

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
        className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full group relative ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/10' : 'border-slate-200'
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
            <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${isSelected
                ? 'bg-brand-600 border-brand-600 scale-110'
                : 'border-slate-300 bg-white peer-hover:border-brand-400'
              }`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>
          </label>
        </div>

        <div className="p-5 flex-1 pt-6">
          {/* Role Flag Badge */}
          <div className="mb-4 pr-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-md shadow-sm">
              <Briefcase className="w-3 h-3 text-brand-300" />
              <span className="uppercase tracking-wide truncate max-w-[200px]">
                {kpi.jobDescription.length > 50 && kpi.jobDescription.includes('Role:')
                  ? kpi.jobDescription.split('Role:')[1]?.split('Tugas')[0]?.trim() || kpi.jobDescription
                  : kpi.jobDescription}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-start mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPerspectiveColor(kpi.perspective)}`}>
              {kpi.perspective}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100 mr-6">{kpi.type}</span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-brand-600 transition-colors pr-2">{kpi.kpiName}</h3>
          <p className="text-sm text-slate-600 mb-4 line-clamp-3">{kpi.detail}</p>

          {/* Show Divisi in Card if available (Small badge) */}
          {kpi.divisi && kpi.divisi !== '-' && (
            <div className="mb-4 text-xs text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{kpi.divisi}</span>
            </div>
          )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isEditing && setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="pr-8 w-full">
                {/* Role Badge in Header */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-md shadow-sm mb-3">
                  <Briefcase className="w-3 h-3 text-brand-300" />
                  <span className="uppercase tracking-wide">
                    {kpi.jobDescription.length > 50 && kpi.jobDescription.includes('Role:')
                      ? kpi.jobDescription.split('Role:')[1]?.split('Tugas')[0]?.trim() || kpi.jobDescription
                      : kpi.jobDescription}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPerspectiveColor(kpi.perspective)}`}>
                    {kpi.perspective}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {kpi.type}
                  </span>
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={editedKpi.kpiName}
                    onChange={(e) => handleChange('kpiName', e.target.value)}
                    className="text-2xl font-bold text-slate-900 leading-tight mb-2 w-full border-b-2 border-brand-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{kpi.kpiName}</h2>
                )}

                {/* Organization Context for PID Library */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  {kpi.direktorat && kpi.direktorat !== '-' && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{kpi.direktorat}</span>
                    </span>
                  )}
                  {kpi.divisi && kpi.divisi !== '-' && (
                    <>
                      <span className="text-slate-300 hidden sm:inline">|</span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{kpi.divisi}</span>
                      </span>
                    </>
                  )}
                </div>

              </div>

              <div className="flex items-center gap-2">
                {onUpdate && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-full hover:bg-brand-50 text-slate-400 hover:text-brand-600 transition-colors flex-shrink-0"
                    title="Edit KPI"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{t.polarity}</span>
                  </div>
                  {isEditing ? (
                    <select
                      value={editedKpi.polarity}
                      onChange={(e) => handleChange('polarity', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-900"
                    >
                      <option value="Maximize">Maximize</option>
                      <option value="Minimize">Minimize</option>
                    </select>
                  ) : (
                    <p className="font-semibold text-slate-900">{kpi.polarity}</p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{t.unit}</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedKpi.unit}
                      onChange={(e) => handleChange('unit', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-900"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900">{kpi.unit}</p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <BarChart2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{t.measurement}</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedKpi.measurement}
                      onChange={(e) => handleChange('measurement', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-900"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900">{kpi.measurement}</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">

                {/* Task Context Section */}
                {kpi.task && kpi.task !== '-' && (
                  <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-brand-800 uppercase tracking-wide mb-2">
                      <ClipboardList className="w-4 h-4 text-brand-600" />
                      {t.task}
                    </h4>
                    <p className="text-brand-900 font-medium leading-relaxed italic">
                      "{kpi.task}"
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                    <Info className="w-4 h-4 text-brand-500" />
                    {t.description}
                  </h4>
                  {isEditing ? (
                    <textarea
                      value={editedKpi.detail}
                      onChange={(e) => handleChange('detail', e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-700 leading-relaxed focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-slate-700 leading-relaxed bg-white">{kpi.detail}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Definition */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                      <Book className="w-4 h-4 text-brand-500" />
                      {t.definition}
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed h-full">
                      {isEditing ? (
                        <textarea
                          value={editedKpi.definition}
                          onChange={(e) => handleChange('definition', e.target.value)}
                          rows={4}
                          className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      ) : kpi.definition}
                    </div>
                  </div>

                  {/* Data Source */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                      <Database className="w-4 h-4 text-brand-500" />
                      {t.dataSource}
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed h-full">
                      {isEditing ? (
                        <textarea
                          value={editedKpi.dataSource}
                          onChange={(e) => handleChange('dataSource', e.target.value)}
                          rows={4}
                          className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      ) : kpi.dataSource}
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                    <Calculator className="w-4 h-4 text-brand-500" />
                    {t.formula}
                  </h4>
                  <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm shadow-inner overflow-x-auto">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedKpi.formula}
                        onChange={(e) => handleChange('formula', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    ) : kpi.formula}
                  </div>
                </div>

                {/* Extended Analysis (Target Audience & Challenges) */}
                {(kpi.targetAudience || kpi.measurementChallenges || isEditing) && (
                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-4">
                    {(kpi.targetAudience || isEditing) && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                          <Users className="w-4 h-4 text-brand-500" />
                          {t.targetAudience}
                        </h4>
                        <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed h-full">
                          {isEditing ? (
                            <textarea
                              value={editedKpi.targetAudience || ''}
                              onChange={(e) => handleChange('targetAudience', e.target.value)}
                              rows={3}
                              className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                              placeholder="Siapa yang menggunakan KPI ini?"
                            />
                          ) : kpi.targetAudience}
                        </div>
                      </div>
                    )}
                    {(kpi.measurementChallenges || isEditing) && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          {t.challenges}
                        </h4>
                        <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed h-full">
                          {isEditing ? (
                            <textarea
                              value={editedKpi.measurementChallenges || ''}
                              onChange={(e) => handleChange('measurementChallenges', e.target.value)}
                              rows={3}
                              className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                              placeholder="Apa kendala pengukurannya?"
                            />
                          ) : kpi.measurementChallenges}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Scoring System Recommendation */}
                {(kpi.scoringSystem || isEditing) && (
                  <div className="pt-6 border-t border-slate-100 mt-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                      <Award className="w-4 h-4 text-brand-600" />
                      {t.scoring}
                    </h4>
                    <div className="text-slate-700 text-sm bg-blue-50/50 p-6 rounded-xl border border-blue-100 leading-relaxed shadow-sm">
                      {isEditing ? (
                        <textarea
                          value={editedKpi.scoringSystem || ''}
                          onChange={(e) => handleChange('scoringSystem', e.target.value)}
                          rows={8}
                          className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono text-xs leading-relaxed"
                          placeholder="Masukkan rekomendasi skema skoring..."
                        />
                      ) : (
                        <div 
                          className="prose prose-sm max-w-none text-slate-700 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-1 [&>ul>li>b]:text-slate-900 [&>ul>li>strong]:text-slate-900"
                          dangerouslySetInnerHTML={{ __html: kpi.scoringSystem || '' }}
                        />
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-5 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {t.save}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {t.close}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
