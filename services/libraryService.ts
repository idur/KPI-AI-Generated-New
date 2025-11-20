
import { KPI, LibraryEntry } from "../types";

const STORAGE_KEY = 'kpi_architect_library';

export const getLibrary = (): LibraryEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load library", e);
    return [];
  }
};

export const saveToLibrary = (jobTitle: string, kpis: KPI[]): LibraryEntry => {
  const library = getLibrary();
  const normalizedTitle = jobTitle.trim();
  
  const existingIndex = library.findIndex(item => item.jobTitle.toLowerCase() === normalizedTitle.toLowerCase());
  
  const now = Date.now();
  let entry: LibraryEntry;

  if (existingIndex >= 0) {
    // Update existing
    entry = {
      ...library[existingIndex],
      kpis: kpis, // Overwrite KPIs or Merge? Strategy: Overwrite with current selection for simplicity
      updatedAt: now
    };
    library[existingIndex] = entry;
  } else {
    // Create new
    entry = {
      id: Math.random().toString(36).substr(2, 9),
      jobTitle: normalizedTitle,
      createdAt: now,
      updatedAt: now,
      kpis: kpis
    };
    library.push(entry);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  return entry;
};

export const deleteFromLibrary = (id: string): LibraryEntry[] => {
  const library = getLibrary();
  const newLibrary = library.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newLibrary));
  return newLibrary;
};
