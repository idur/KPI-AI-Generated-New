
import { KPI } from "../types";

// --- KONFIGURASI "BACKEND" ---
// Akses variabel secara langsung agar Vite dapat melakukan static replacement dengan benar
// @ts-ignore
const ENV_SHEET_URL = import.meta.env.VITE_PID_SHEET_URL || "";

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

export const fetchGoogleSheetData = async (url: string): Promise<KPI[]> => {
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
      
      // PID Library Format Mapping (13 Columns)
      if (cols.length < 5) continue; 

      const rowJob = cols[2]?.replace(/^"|"$/g, '') || 'Unknown Job'; 
      
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
    throw error;
  }
};

// Fungsi khusus untuk PID Library
// Menerima overrideUrl (opsional) dari UI jika env var kosong
export const fetchPIDLibrary = async (overrideUrl?: string): Promise<KPI[]> => {
  // Prioritaskan URL dari input user, jika tidak ada gunakan Env Var
  const targetUrl = overrideUrl || ENV_SHEET_URL;
  
  // Validasi URL
  if (!targetUrl || targetUrl.trim() === "") {
    // Melempar error spesifik agar bisa ditangkap UI untuk menampilkan input form
    throw new Error("MISSING_URL");
  }
  
  try {
    return await fetchGoogleSheetData(targetUrl);
  } catch (error: any) {
    throw new Error(error.message || "Gagal mengambil data.");
  }
};
