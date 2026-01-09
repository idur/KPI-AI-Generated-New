import React, { useState, useMemo } from 'react';
import { KPI } from '../types';
import { KPICard } from './KPICard';
import { Filter, Download, PieChart, CheckSquare, Square, Save, Bookmark, Briefcase, Building2, Users, FileSpreadsheet, FileText, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  kpis: KPI[];
  jobTitle: string;
  onSaveToLibrary: (kpisToSave: KPI[]) => void;
  onUpdateKPI?: (kpi: KPI) => void;
  onJobTitleChange?: (newTitle: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ kpis, jobTitle, onSaveToLibrary, onUpdateKPI, onJobTitleChange }) => {
  // Filter States
  const [selectedPerspective, setSelectedPerspective] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedDirektorat, setSelectedDirektorat] = useState<string>('All');
  const [selectedDivisi, setSelectedDivisi] = useState<string>('All');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(jobTitle);

  // Update editedTitle when jobTitle prop changes
  React.useEffect(() => {
    setEditedTitle(jobTitle);
  }, [jobTitle]);

  const handleTitleSave = () => {
    if (editedTitle.trim() && onJobTitleChange) {
      onJobTitleChange(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(jobTitle);
    setIsEditingTitle(false);
  };

  // Extract Unique Options for Dropdowns
  const perspectives = useMemo(() => {
    const all = Array.from(new Set(kpis.map(k => k.perspective)));
    return ['All', ...all];
  }, [kpis]);

  const roles = useMemo(() => {
    const all = Array.from(new Set(kpis.map(k => k.jobDescription))).sort();
    return ['All', ...all];
  }, [kpis]);

  const direktorats = useMemo(() => {
    const all = Array.from(new Set(kpis.map(k => k.direktorat).filter(d => d && d !== '-' && d.trim() !== ''))).sort();
    return ['All', ...all];
  }, [kpis]);

  const divisis = useMemo(() => {
    // If a Direktorat is selected, only show divisions for that direktorat
    let source = kpis;
    if (selectedDirektorat !== 'All') {
      source = source.filter(k => k.direktorat === selectedDirektorat);
    }
    const all = Array.from(new Set(source.map(k => k.divisi).filter(d => d && d !== '-' && d.trim() !== ''))).sort();
    return ['All', ...all];
  }, [kpis, selectedDirektorat]);

  // Apply All Filters
  const filteredKPIs = useMemo(() => {
    return kpis.filter(k => {
      const matchPerspective = selectedPerspective === 'All' || k.perspective === selectedPerspective;
      const matchRole = selectedRole === 'All' || k.jobDescription === selectedRole;
      const matchDirektorat = selectedDirektorat === 'All' || k.direktorat === selectedDirektorat;
      const matchDivisi = selectedDivisi === 'All' || k.divisi === selectedDivisi;

      return matchPerspective && matchRole && matchDirektorat && matchDivisi;
    });
  }, [kpis, selectedPerspective, selectedRole, selectedDirektorat, selectedDivisi]);

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

  const handleExportExcel = () => {
    const kpisToExport = getSelectedKPIs();
    if (kpisToExport.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(kpisToExport.map(k => ({
      "Role": k.jobDescription,
      "Direktorat": k.direktorat || '-',
      "Divisi": k.divisi || '-',
      "Perspektif": k.perspective,
      "KPI Name": k.kpiName,
      "Type": k.type,
      "Tugas": k.task || '-',
      "Detail": k.detail,
      "Polarity": k.polarity,
      "Unit": k.unit,
      "Definition": k.definition,
      "Data Source": k.dataSource,
      "Formula": k.formula,
      "Measurement": k.measurement,
      "Target Audience": k.targetAudience || '-',
      "Challenges": k.measurementChallenges || '-'
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KPIs");
    XLSX.writeFile(workbook, `KPI_Library_${jobTitle.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportPDF = () => {
    const kpisToExport = getSelectedKPIs();
    if (kpisToExport.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(`KPI Library: ${jobTitle}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [['Perspektif', 'KPI Name', 'Definition', 'Formula', 'Unit', 'Target Audience']],
      body: kpisToExport.map(k => [
        k.perspective,
        k.kpiName,
        k.definition,
        k.formula,
        k.unit,
        k.targetAudience || '-'
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74] }, // Brand colorish
      columnStyles: {
        0: { cellWidth: 25 }, // Perspektif
        1: { cellWidth: 40 }, // KPI Name
        2: { cellWidth: 60 }, // Definition
        3: { cellWidth: 60 }, // Formula
        4: { cellWidth: 20 }, // Unit
        5: { cellWidth: 40 }  // Target Audience
      }
    });

    doc.save(`KPI_Library_${jobTitle.replace(/\s+/g, '_')}.pdf`);
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

  // Helper to check if a filter section is relevant (has more than 1 option other than 'All')
  const showRoleFilter = roles.length > 2;
  const showDirektoratFilter = direktorats.length > 2;
  const showDivisiFilter = divisis.length > 2;

  return (
    <div className="space-y-6">
      {/* Sticky Filter Header */}
      <div className="flex flex-col bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-[4.5rem] z-40 gap-4">

        {/* Top Row: Title, Count, Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') handleTitleCancel();
                  }}
                  className="text-xl font-bold text-slate-800 border-2 border-brand-500 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  autoFocus
                />
                <button
                  onClick={handleTitleSave}
                  className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  title="Save"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={handleTitleCancel}
                  className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h2
                className="text-xl font-bold text-slate-800 cursor-pointer hover:text-brand-600 transition-colors group flex items-center gap-2"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit"
              >
                <span>Library KPI: <span className="text-brand-600">{jobTitle}</span></span>
                <span className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">(click to edit)</span>
              </h2>
            )}
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

            <div className="flex gap-2">
              <button
                onClick={handleSaveClick}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors whitespace-nowrap shadow-sm"
                title="Save to My Library"
              >
                <Bookmark className="w-4 h-4" />
                <span>Save to Library</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedIds.size > 0
                    ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {selectedIds.size > 0 ? `Export (${selectedIds.size})` : `Export All`}
                  </span>
                </button>

                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        <span>Export Excel (.xlsx)</span>
                      </button>
                      <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>Export PDF (.pdf)</span>
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button onClick={() => { handleExportCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Export CSV (.csv)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Filters (Responsive Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Perspective Filter (Always Visible) */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedPerspective}
              onChange={(e) => setSelectedPerspective(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full appearance-none cursor-pointer"
            >
              {perspectives.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'Semua Perspektif' : p}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          {showRoleFilter && (
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full appearance-none cursor-pointer"
              >
                <option value="All">Semua Jabatan (Role)</option>
                {roles.filter(r => r !== 'All').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Direktorat Filter */}
          {showDirektoratFilter && (
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={selectedDirektorat}
                onChange={(e) => {
                  setSelectedDirektorat(e.target.value);
                  setSelectedDivisi('All'); // Reset divisi when direktorat changes
                }}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full appearance-none cursor-pointer"
              >
                <option value="All">Semua Direktorat</option>
                {direktorats.filter(d => d !== 'All').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Divisi Filter */}
          {showDivisiFilter && (
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full appearance-none cursor-pointer"
              >
                <option value="All">Semua Divisi</option>
                {divisis.filter(d => d !== 'All').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredKPIs.map((kpi) => (
          <KPICard
            key={kpi.id}
            kpi={kpi}
            isSelected={selectedIds.has(kpi.id)}
            onToggleSelect={() => toggleSelection(kpi.id)}
            onUpdate={onUpdateKPI}
          />
        ))}
      </div>
    </div>
  );
};