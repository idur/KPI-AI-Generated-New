
export enum KPIType {
  OUTCOME = 'Outcome',
  OUTPUT = 'Output',
  ACTIVITY = 'Activity'
}

export enum Polarity {
  MAXIMIZE = 'Maximize',
  MINIMIZE = 'Minimize'
}

export interface KPI {
  id: string;
  jobDescription: string; // Maps to 'Jabatan'
  perspective: string; // BSC Perspective
  kpiName: string;
  type: string;
  detail: string;
  polarity: string;
  unit: string;
  definition: string;
  dataSource: string;
  formula: string;
  measurement: string;
  task?: string; // Original Task context
  targetAudience?: string;
  measurementChallenges?: string;
  // New fields for PID Library
  direktorat?: string;
  divisi?: string;
}

export interface SheetConfig {
  url: string;
  columnMap?: Record<string, string>;
}

export interface LibraryEntry {
  id: string;
  jobTitle: string;
  createdAt: number;
  updatedAt: number;
  kpis: KPI[];
}

export interface UserProfile {
  full_name?: string;
  company?: string;
  avatar_url?: string;
  bio?: string;
}
