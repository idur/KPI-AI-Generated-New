
import { GoogleGenAI, Type } from "@google/genai";
import { KPI } from "../types";

// Helper to create a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateKPIsFromJobDescription = async (
  jobDescription: string,
  fileData?: { base64: string; mimeType: string },
  isTaskBasedMode: boolean = false,
  limit?: number,
  language: 'id' | 'en' = 'id'
): Promise<KPI[]> => {

  // --- API KEY RETRIEVAL ---
  let apiKey: string | undefined;

  // Safe access for Vite replacement
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    console.warn("Failed to access env vars for API Key");
  }

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your App Settings or Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const langInstruction = language === 'en'
    ? "Use professional English."
    : "Gunakan Bahasa Indonesia yang profesional.";

  // Default Prompt
  let promptText = `
    Bertindaklah sebagai konsultan HR expert. Buatlah daftar Key Performance Indicators (KPI) yang komprehensif untuk Job Description / Role berikut: "${jobDescription}".
    ${limit ? `BATASAN PENTING: Buatlah MAKSIMAL ${limit} KPI saja. Jangan lebih.` : ''}
    
    Pastikan KPI mencakup 4 perspektif Balanced Scorecard (Financial, Customer, Internal Process, Learning & Growth).
    
    Untuk setiap KPI, berikan analisis mendalam mencakup:
    1. Detail KPI standar (definisi, rumus, sumber data).
    2. Target Audiens: Siapa stakeholder utama yang berkepentingan dengan metrik ini?
    3. Tantangan Pengukuran: Apa kesulitan potensial, bias, atau hambatan teknis dalam mengukur KPI ini secara akurat?
    
    ${langInstruction}
  `;

  // Specialized Prompt for CSV Task List
  if (isTaskBasedMode) {
    promptText = `
      Bertindaklah sebagai konsultan HR expert.
      Saya akan memberikan daftar "Tugas dan Tanggung Jawab" untuk Role/Jabatan berikut:
      
      ${jobDescription}
      
      INSTRUKSI KHUSUS (WAJIB DIKUTI):
      1. Untuk SETIAP item "Tugas" yang tercantum dalam data di atas, Anda WAJIB merumuskan TEPAT 2 (DUA) KPI yang berbeda.
      ${limit ? `2. PENTING: Total KPI yang dihasilkan TIDAK BOLEH LEBIH DARI ${limit} item secara keseluruhan. Pilih tugas yang paling prioritas jika perlu.` : '2. Jangan meringkas tugas. Jika ada 10 tugas, output harus ada 20 KPI.'}
      3. Petakan setiap KPI ke dalam perspektif Balanced Scorecard yang paling relevan.
      4. PENTING: Sertakan teks asli "Tugas" yang menjadi dasar KPI tersebut di field 'task' pada output JSON.
      5. Identifikasi nama Role/Jabatan yang spesifik dari input dan masukkan ke field 'roleName'.
      
      Untuk setiap KPI, berikan analisis lengkap (Definisi, Rumus, Target Audiens, dll).
      Buat deskripsi yang PADAT dan RINGKAS (Concise) untuk menghemat token output.
      
      ${langInstruction}
    `;
  }

  const parts: any[] = [];

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.base64,
        mimeType: fileData.mimeType
      }
    });

    if (!isTaskBasedMode) {
      promptText = `
        Bertindaklah sebagai konsultan HR expert. 
        Analisis dokumen Job Description yang dilampirkan ini.
        ${jobDescription ? `Konteks tambahan atau Judul Posisi: "${jobDescription}".` : ''}
        
        Berdasarkan dokumen tersebut, buatlah daftar Key Performance Indicators (KPI) yang komprehensif dan relevan.
        ${limit ? `BATASAN PENTING: Buatlah MAKSIMAL ${limit} KPI saja.` : ''}
        
        Pastikan KPI mencakup 4 perspektif Balanced Scorecard.
        Sertakan analisis mengenai Target Audiens dan Tantangan Pengukuran.
        ${langInstruction}
      `;
    }
  }

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              roleName: { type: Type.STRING, description: "Nama Role/Jabatan spesifik pemilik KPI ini" },
              perspective: { type: Type.STRING, description: "Perspektif BSC (Financial, Customer, Internal Process, Learning & Growth)" },
              kpiName: { type: Type.STRING, description: "Nama Indikator Kinerja Utama" },
              type: { type: Type.STRING, description: "Jenis KPI (Outcome, Output, atau Activity)" },
              detail: { type: Type.STRING, description: "Penjelasan detail singkat tentang KPI ini" },
              task: { type: Type.STRING, description: "Teks asli tugas dan tanggung jawab yang mendasari KPI ini (Copy dari input)" },
              polarity: { type: Type.STRING, description: "Polaritas (Maximize/Minimize)" },
              unit: { type: Type.STRING, description: "Satuan pengukuran" },
              definition: { type: Type.STRING, description: "Definisi operasional KPI" },
              dataSource: { type: Type.STRING, description: "Sumber data" },
              formula: { type: Type.STRING, description: "Rumus perhitungan" },
              measurement: { type: Type.STRING, description: "Frekuensi pengukuran" },
              targetAudience: { type: Type.STRING, description: "Stakeholder utama" },
              measurementChallenges: { type: Type.STRING, description: "Potensi hambatan pengukuran" }
            },
            required: ["perspective", "kpiName", "type", "detail", "polarity", "unit", "definition", "dataSource", "formula", "measurement"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    // Sanitize output in case of markdown block
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const rawData = JSON.parse(cleanText);

    // Transform into internal KPI interface
    return rawData.map((item: any) => {
      // Determine Job Description Label
      let jobDescLabel = "Uploaded Document";

      if (isTaskBasedMode) {
        // Priority 1: AI Extracted Role Name
        if (item.roleName && item.roleName !== "Unknown") {
          jobDescLabel = item.roleName;
        }
        // Priority 2: Fallback to context
        else {
          jobDescLabel = jobDescription.split('\n')[0].replace('Role: ', '').trim() || "CSV Import";
        }
      } else {
        jobDescLabel = jobDescription || "Uploaded Document";
      }

      return {
        id: generateId(),
        jobDescription: jobDescLabel,
        perspective: item.perspective,
        kpiName: item.kpiName,
        type: item.type,
        detail: item.detail,
        task: item.task || '-', // Map the Task field
        polarity: item.polarity,
        unit: item.unit,
        definition: item.definition,
        dataSource: item.dataSource,
        formula: item.formula,
        measurement: item.measurement,
        targetAudience: item.targetAudience,
        measurementChallenges: item.measurementChallenges
      };
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Silent fail empty array or rethrow depending on need
    throw error;
  }
};
