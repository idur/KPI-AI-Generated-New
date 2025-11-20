
import { KPI } from "../types";

// --- KONFIGURASI "BACKEND" ---
// PENTING: Di Vite, kita harus mengakses variabel secara eksplisit/statis (dot notation)
// agar bundler dapat menggantinya dengan nilai string saat build time.
// Akses dinamis seperti `import.meta.env[key]` seringkali gagal di production.

const getSheetUrl = () => {
  // 1. Coba ambil dari VITE_PID_SHEET_URL (Standard Vite)
  // @ts-ignore
  if (import.meta.env && import.meta.env.VITE_PID_SHEET_URL) {
    // @ts-ignore
    return import.meta.env.VITE_PID_SHEET_URL;
  }
  // 2. Fallback jika ada konfigurasi process.env manual
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.VITE_PID_SHEET_URL) {
    // @ts-ignore
    return process.env.VITE_PID_SHEET_URL;
  }
  
  return "";
};

const ENV_SHEET_URL = getSheetUrl();

const PID_SHEET_CONFIG = {
  url: ENV_SHEET_URL
};

// Helper to parse CSV line respecting quotes
const parseCSVLine = (str: string): string[] => {
  const result: string[] = [];
  let s = '';
  let openQuote = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"') {
      openQuote = !openQuote;
    } else if (c === ',' && !openQuote) {
      result.push(s.trim());
      s = '';
    } else {
      s += c;
    }
  }
  result.push(s.trim());
  return result;
};

export const fetchGoogleSheetData = async (url: string, jobFilter: string): Promise<KPI[]> => {
  try {
    // Convert typical edit URL to export URL if necessary
    let csvUrl = url;
    if (url.includes('/edit')) {
       csvUrl = url.replace(/\/edit.*$/, '/export?format=csv');
    }

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim() !== '');
    
    if (lines.length < 2) return [];

    const data: KPI[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      
      // PID Library Format Mapping (13 Columns):
      // 0: Direktorat
      // 1: Divisi
      // 2: Jabatan
      // 3: Perspektif BSC
      // 4: Key Performance Indicators
      // 5: Jenis KPI
      // 6: Detail KPI
      // 7: Polaritas
      // 8: Satuan
      // 9: Definisi KPI
      // 10: Alternatif Sumber Data
      // 11: Sample Formula
      // 12: Pengukuran
      
      if (cols.length < 5) continue; 

      const rowJob = cols[2]?.replace(/^"|"$/g, '') || 'Unknown Job'; 
      
      // If filtering by job, skip non-matches
      if (jobFilter && !rowJob.toLowerCase().includes(jobFilter.toLowerCase())) {
         continue;
      }

      data.push({
        id: Math.random().toString(36).substr(2, 9),
        
        direktorat: cols[0]?.replace(/^"|"$/g, '') || '-',
        divisi: cols[1]?.replace(/^"|"$/g, '') || '-',
        jobDescription: rowJob,
        perspective: cols[3]?.replace(/^"|"$/g, '') || '-',
        kpiName: cols[4]?.replace(/^"|"$/g, '') || 'Unnamed KPI',
        type: cols[5]?.replace(/^"|"$/g, '') || '-',
        detail: cols[6]?.replace(/^"|"$/g, '') || '-',
        polarity: cols[7]?.replace(/^"|"$/g, '') || '-',
        unit: cols[8]?.replace(/^"|"$/g, '') || '-',
        definition: cols[9]?.replace(/^"|"$/g, '') || '-',
        dataSource: cols[10]?.replace(/^"|"$/g, '') || '-',
        formula: cols[11]?.replace(/^"|"$/g, '') || '-',
        measurement: cols[12]?.replace(/^"|"$/g, '') || '-',
      });
    }

    return data;
  } catch (error) {
    console.error("Sheet Fetch Error:", error);
    throw new Error("Gagal mengambil data dari Google Sheet. Pastikan URL benar dan Sheet dipublish sebagai CSV.");
  }
};

// Fungsi khusus untuk PID Library
export const fetchPIDLibrary = async (jobFilter: string): Promise<KPI[]> => {
  const configUrl = PID_SHEET_CONFIG.url;
  
  // Validasi URL
  if (!configUrl || configUrl.trim() === "") {
    console.error("Environment Variable VITE_PID_SHEET_URL kosong.");
    throw new Error(
      "URL Google Sheet tidak ditemukan.\n" +
      "Mohon set Environment Variable 'VITE_PID_SHEET_URL' pada Netlify, lalu Trigger New Deploy (Rebuild)."
    );
  }
  return fetchGoogleSheetData(configUrl, jobFilter);
};
