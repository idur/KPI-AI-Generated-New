import React, { useState, useMemo } from 'react';
import { LibraryEntry, KPI } from '../types';
import { Search, Grid, List, Filter, Trash2, ArrowRight, BookOpen, Calendar, Table as TableIcon, LayoutGrid, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LibraryViewProps {
    items: LibraryEntry[];
    onLoad: (item: LibraryEntry) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

type ViewMode = 'roles' | 'kpis';

export const LibraryView: React.FC<LibraryViewProps> = ({ items, onLoad, onDelete }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('roles');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterPerspective, setFilterPerspective] = useState('');
    const [filterType, setFilterType] = useState('');

    // Extract unique options for filters
    const uniqueRoles = useMemo(() => {
        return Array.from(new Set(items.map(item => item.jobTitle))).sort();
    }, [items]);

    const uniquePerspectives = useMemo(() => {
        const allPerspectives = items.flatMap(item => item.kpis.map(k => k.perspective));
        return Array.from(new Set(allPerspectives.filter(Boolean))).sort();
    }, [items]);

    const uniqueTypes = useMemo(() => {
        const allTypes = items.flatMap(item => item.kpis.map(k => k.type));
        return Array.from(new Set(allTypes.filter(Boolean))).sort();
    }, [items]);

    // Flatten all KPIs for list view and advanced filtering
    const allKPIs = useMemo(() => {
        return items.flatMap(item =>
            item.kpis.map(kpi => ({
                ...kpi,
                parentJobTitle: item.jobTitle,
                parentId: item.id,
                parentUpdatedAt: item.updatedAt
            }))
        );
    }, [items]);

    // Filter Logic
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();

        if (viewMode === 'kpis') {
            return allKPIs.filter(kpi => {
                const matchesSearch =
                    kpi.kpiName.toLowerCase().includes(query) ||
                    kpi.definition.toLowerCase().includes(query) ||
                    kpi.parentJobTitle.toLowerCase().includes(query);

                const matchesRole = filterRole ? kpi.parentJobTitle === filterRole : true;
                const matchesPerspective = filterPerspective ? kpi.perspective === filterPerspective : true;
                const matchesType = filterType ? kpi.type === filterType : true;

                return matchesSearch && matchesRole && matchesPerspective && matchesType;
            });
        } else {
            // Role View: Show roles that match the criteria (or contain KPIs that match)
            return items.filter(item => {
                // 1. Check if Role Title matches
                const roleTitleMatches = item.jobTitle.toLowerCase().includes(query);

                // 2. Check if ANY KPI inside matches the filters
                const hasMatchingKPI = item.kpis.some(kpi => {
                    const kpiMatchesSearch =
                        kpi.kpiName.toLowerCase().includes(query) ||
                        kpi.definition.toLowerCase().includes(query);

                    const matchesPerspective = filterPerspective ? kpi.perspective === filterPerspective : true;
                    const matchesType = filterType ? kpi.type === filterType : true;

                    return kpiMatchesSearch && matchesPerspective && matchesType;
                });

                const matchesRoleFilter = filterRole ? item.jobTitle === filterRole : true;

                // If search query is present, match either title OR content
                // If filters are present, content MUST match filters
                return matchesRoleFilter && (roleTitleMatches || hasMatchingKPI);
            });
        }
    }, [items, allKPIs, viewMode, searchQuery, filterRole, filterPerspective, filterType]);

    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterRole('');
        setFilterPerspective('');
        setFilterType('');
    };

    const handleExportAll = () => {
        // Determine what to export based on current view and filters
        let kpisToExport: any[] = [];

        if (viewMode === 'kpis') {
            kpisToExport = filteredData as any[];
        } else {
            // If in Role view, flatten the filtered roles into KPIs
            kpisToExport = (filteredData as LibraryEntry[]).flatMap(item =>
                item.kpis.map(kpi => ({
                    ...kpi,
                    parentJobTitle: item.jobTitle
                }))
            );
        }

        if (kpisToExport.length === 0) return;

        const worksheet = XLSX.utils.json_to_sheet(kpisToExport.map(k => ({
            "Role": k.parentJobTitle || k.jobDescription, // Fallback if parentJobTitle missing
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "My Library");
        XLSX.writeFile(workbook, `My_Library_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Library</h2>
                    <p className="text-slate-500 text-sm">
                        {viewMode === 'roles'
                            ? `${filteredData.length} Role ditemukan`
                            : `${filteredData.length} KPI ditemukan`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportAll}
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export Filtered</span>
                    </button>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setViewMode('roles')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'roles'
                                ? 'bg-brand-50 text-brand-700 shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="hidden sm:inline">Roles</span>
                        </button>
                        <button
                            onClick={() => setViewMode('kpis')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'kpis'
                                ? 'bg-brand-50 text-brand-700 shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            <span className="hidden sm:inline">All KPIs</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={viewMode === 'roles' ? "Cari Role..." : "Cari KPI, Definisi..."}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                        >
                            <option value="">Semua Role</option>
                            {uniqueRoles.map(role => {
                                // Clean up role name for display in dropdown
                                const displayRole = role.length > 50 && role.includes('Role:')
                                    ? role.split('Role:')[1]?.split('Tugas')[0]?.trim() || role
                                    : role;
                                    
                                return (
                                    <option key={role} value={role}>{displayRole}</option>
                                );
                            })}
                        </select>

                        <select
                            value={filterPerspective}
                            onChange={(e) => setFilterPerspective(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                        >
                            <option value="">Semua Perspective</option>
                            {uniquePerspectives.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                        >
                            <option value="">Semua Tipe</option>
                            {uniqueTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        {(searchQuery || filterRole || filterPerspective || filterType) && (
                            <button
                                onClick={handleResetFilters}
                                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {filteredData.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Tidak ada hasil</h3>
                    <p className="text-slate-500">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                </div>
            ) : (
                <>
                    {viewMode === 'roles' ? (
                        // ROLES GRID VIEW
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(filteredData as LibraryEntry[]).map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onLoad(item)}
                                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group relative"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <button
                                            onClick={(e) => onDelete(e, item.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">
                                        {item.jobTitle.length > 50 && item.jobTitle.includes('Role:') 
                                            ? item.jobTitle.split('Role:')[1]?.split('Tugas')[0]?.trim() || item.jobTitle 
                                            : item.jobTitle}
                                    </h3>

                                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                                        <div className="flex items-center gap-1.5">
                                            <TableIcon className="w-4 h-4" />
                                            <span>{item.kpis.length} KPI</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm font-medium text-brand-600">
                                        <span>Lihat Detail</span>
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // KPI LIST VIEW
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700">KPI Name</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Perspective</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Unit</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(filteredData as any[]).map((kpi, idx) => (
                                            <tr key={`${kpi.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{kpi.kpiName}</div>
                                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{kpi.definition}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {kpi.parentJobTitle.length > 50 && kpi.parentJobTitle.includes('Role:') 
                                                        ? kpi.parentJobTitle.split('Role:')[1]?.split('Tugas')[0]?.trim() || kpi.parentJobTitle 
                                                        : kpi.parentJobTitle}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                        {kpi.perspective}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{kpi.type}</td>
                                                <td className="px-6 py-4 text-slate-600">{kpi.unit}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            // Find the original item to load
                                                            const originalItem = items.find(i => i.id === kpi.parentId);
                                                            if (originalItem) onLoad(originalItem);
                                                        }}
                                                        className="text-brand-600 hover:text-brand-700 font-medium text-xs flex items-center gap-1"
                                                    >
                                                        View Role <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
