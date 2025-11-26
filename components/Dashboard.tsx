
import React, { useState, useMemo } from 'react';
import { KPI } from '../types';
import { KPICard } from './KPICard';
import { Filter, Download, PieChart, CheckSquare, Square, Save, Bookmark } from 'lucide-react';

interface DashboardProps {
  kpis: KPI[];
  jobTitle: string;
  onSaveToLibrary: (kpisToSave: KPI[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ kpis, jobTitle, onSaveToLibrary }) => {
  const [selectedPerspective, setSelectedPerspective] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const perspectives = useMemo(() => {
    const all = Array.from(new Set(kpis.map(k => k.perspective)));
    return ['All', ...all];
  }, [kpis]);

  const filteredKPIs = useMemo(() => {
    if (selectedPerspective === 'All') return kpis;
    return kpis.filter(k => k.perspective === selectedPerspective);
  }, [kpis, selectedPerspective]);

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    // If all filtered KPIs are already selected, deselect them. 
    // Otherwise, select all filtered KPIs.
    const allFilteredIds = filteredKPIs.map(k => k.id);
    const allSelected = allFilteredIds.every(id => selectedIds.has(id));

    const newSet = new Set(selectedIds);
    
    if (allSelected) {
      allFilteredIds.forEach(id => newSet.delete(id));
    } else {
      allFilteredIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const isAllSelected = filteredKPIs.length > 0 && filteredKPIs.every(k => selectedIds.has(k.id));
  const isIndeterminate = !isAllSelected && filteredKPIs.some(k => selectedIds.has(k.id));

  const getSelectedKPIs = () => {
    return selectedIds.size > 0 
      ? kpis.filter(k => selectedIds.has(k.id))
      : kpis;
  };

  const handleExportCSV = () => {
    const kpisToExport = getSelectedKPIs();

    if (kpisToExport.length === 0) return;
    
    const headers = [
      "Role (Jabatan)", "Direktorat", "Divisi", "Perspektif BSC", "KPI Name", "Type", 
      "Tugas & Tanggung Jawab", "Detail", "Polarity", "Unit", 
      "Definition", "Data Source", "Formula", "Measurement", 
      "Target Audience", "Measurement Challenges"
    ];
    
    const csvContent = [
      headers.join(','),
      ...kpisToExport.map(k => [
        `"${k.jobDescription}"`, 
        `"${k.direktorat || '-'}"`, 
        `"${k.divisi || '-'}"`, 
        `"${k.perspective}"`, 
        `"${k.kpiName}"`, 
        `"${k.type}"`, 
        `"${k.task || '-'}"`, 
        `"${k.detail}"`, 
        `"${k.polarity}"`, 
        `"${k.unit}"`, 
        `"${k.definition}"`, 
        `"${k.dataSource}"`, 
        `"${k.formula}"`, 
        `"${k.measurement}"`,
        `"${k.targetAudience || '-'}"`,
        `"${k.measurementChallenges || '-'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KPI_Library_${jobTitle.replace(/\s+/g, '_')}_${selectedIds.size > 0 ? 'selected' : 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveClick = () => {
    const items = getSelectedKPIs();
    if (items.length > 0) {
      onSaveToLibrary(items);
    }
  };

  if (kpis.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
           <PieChart className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Belum ada data KPI</h3>
        <p className="text-slate-500">Silakan generate menggunakan AI atau muat dari Google Sheet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Filter Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-[4.5rem] z-40">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Library KPI: <span className="text-brand-600">{jobTitle}</span></h2>
          <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
            <span>{filteredKPIs.length} Ditampilkan</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className={selectedIds.size > 0 ? "text-brand-600 font-medium" : ""}>
              {selectedIds.size} Dipilih
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Select All Button */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-brand-600" />
            ) : isIndeterminate ? (
              <div className="w-4 h-4 bg-brand-600 rounded flex items-center justify-center">
                 <div className="w-2 h-0.5 bg-white"></div>
              </div>
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span className="whitespace-nowrap">{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <div className="relative flex-1 sm:flex-none">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={selectedPerspective}
              onChange={(e) => setSelectedPerspective(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-48 appearance-none cursor-pointer"
            >
              {perspectives.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'Semua Perspektif' : p}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleSaveClick}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors whitespace-nowrap shadow-sm"
              title="Save to My Library"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save to Library</span>
            </button>
            
            <button 
              onClick={handleExportCSV}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedIds.size > 0 
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20' 
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {selectedIds.size > 0 ? `Export (${selectedIds.size})` : `Export All`}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredKPIs.map((kpi) => (
          <KPICard 
            key={kpi.id} 
            kpi={kpi} 
            isSelected={selectedIds.has(kpi.id)}
            onToggleSelect={() => toggleSelection(kpi.id)}
          />
        ))}
      </div>
    </div>
  );
};
