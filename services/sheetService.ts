
import { KPI } from "../types";

// --- KONFIGURASI "BACKEND" ---
// Ganti URL di bawah ini dengan Link Google Sheet PID Anda.
// Pastikan Sheet sudah di-Share "Anyone with the link can view" 
// ATAU "File > Share > Publish to web > Format: CSV" (Disarankan Publish to Web untuk performa lebih cepat)
const PID_SHEET_CONFIG = {
  // Contoh format Publish to Web: "https://docs.google.com/spreadsheets/d/e/2PACX-..../pub?output=csv"
  // Contoh format Biasa: "https://docs.google.com/spreadsheets/d/1xAbC..../edit?usp=sharing"
  url: "GANTI_DENGAN_URL_GOOGLE_SHEET_ANDA_DISINI" 
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
      
      // PID Library Format Mapping:
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
      
      // Ensure we have enough columns (at least 5 to be safe)
      if (cols.length < 5) continue; 

      const rowJob = cols[2]?.replace(/^"|"$/g, '') || 'Unknown Job'; // Jabatan is at index 2
      
      // If filtering by job, skip non-matches
      if (jobFilter && !rowJob.toLowerCase().includes(jobFilter.toLowerCase())) {
         continue;
      }

      data.push({
        id: Math.random().toString(36).substr(2, 9),
        
        // Map columns specifically for PID Library
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
    throw new Error("Gagal mengambil data. Pastikan URL Google Sheet di konfigurasi valid dan dapat diakses publik (CSV).");
  }
};

// Fungsi khusus untuk PID Library yang menggunakan URL tersembunyi (Hardcoded)
export const fetchPIDLibrary = async (jobFilter: string): Promise<KPI[]> => {
  if (!PID_SHEET_CONFIG.url || PID_SHEET_CONFIG.url.includes("GANTI_DENGAN")) {
    throw new Error("Konfigurasi URL Google Sheet belum di-set oleh Admin.");
  }
  return fetchGoogleSheetData(PID_SHEET_CONFIG.url, jobFilter);
};
