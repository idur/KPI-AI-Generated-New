import { KPI } from "../types";

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
    // e.g. docs.google.com/spreadsheets/d/KEY/edit -> docs.google.com/spreadsheets/d/KEY/export?format=csv
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

    // Simple CSV mapping (Assuming specific column order based on the prompt requirements)
    // Expected Order in Sheet: 
    // JobDesc, Perspective, KPI, Type, Detail, Polarity, Unit, Definition, Source, Formula, Measurement
    
    const data: KPI[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      
      // Ensure we have enough columns (at least 10)
      if (cols.length < 10) continue;

      const rowJob = cols[0].replace(/^"|"$/g, '');
      
      // If filtering by job, skip non-matches (simple contains check, case-insensitive)
      if (jobFilter && !rowJob.toLowerCase().includes(jobFilter.toLowerCase())) {
         continue;
      }

      data.push({
        id: Math.random().toString(36).substr(2, 9),
        jobDescription: rowJob,
        perspective: cols[1]?.replace(/^"|"$/g, '') || '-',
        kpiName: cols[2]?.replace(/^"|"$/g, '') || 'Unnamed KPI',
        type: cols[3]?.replace(/^"|"$/g, '') || '-',
        detail: cols[4]?.replace(/^"|"$/g, '') || '-',
        polarity: cols[5]?.replace(/^"|"$/g, '') || '-',
        unit: cols[6]?.replace(/^"|"$/g, '') || '-',
        definition: cols[7]?.replace(/^"|"$/g, '') || '-',
        dataSource: cols[8]?.replace(/^"|"$/g, '') || '-',
        formula: cols[9]?.replace(/^"|"$/g, '') || '-',
        measurement: cols[10]?.replace(/^"|"$/g, '') || '-',
      });
    }

    return data;
  } catch (error) {
    console.error("Sheet Fetch Error:", error);
    throw new Error("Gagal mengambil data dari Google Sheet. Pastikan link 'Published to Web' sebagai CSV valid.");
  }
};
