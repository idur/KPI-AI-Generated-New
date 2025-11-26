
import { GoogleGenAI, Type } from "@google/genai";
import { KPI } from "../types";

// Helper to create a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateKPIsFromJobDescription = async (
  jobDescription: string,
  fileData?: { base64: string; mimeType: string },
  isTaskBasedMode: boolean = false
): Promise<KPI[]> => {
  
  // --- API KEY RETRIEVAL ---
  let apiKey: string | undefined;
  
  // Static access for Vite replacement
  // @ts-ignore
  apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your App Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Default Prompt
  let promptText = `
    Bertindaklah sebagai konsultan HR expert. Buatlah daftar Key Performance Indicators (KPI) yang komprehensif untuk Job Description / Role berikut: "${jobDescription}".
    
    Pastikan KPI mencakup 4 perspektif Balanced Scorecard (Financial, Customer, Internal Process, Learning & Growth).
    
    Untuk setiap KPI, berikan analisis mendalam mencakup:
    1. Detail KPI standar (definisi, rumus, sumber data).
    2. Target Audiens: Siapa stakeholder utama yang berkepentingan dengan metrik ini?
    3. Tantangan Pengukuran: Apa kesulitan potensial, bias, atau hambatan teknis dalam mengukur KPI ini secara akurat?
    
    Gunakan Bahasa Indonesia yang profesional.
  `;

  // Specialized Prompt for CSV Task List
  if (isTaskBasedMode) {
    promptText = `
      Bertindaklah sebagai konsultan HR expert.
      Saya akan memberikan daftar "Tugas dan Tanggung Jawab" untuk Role/Jabatan berikut:
      
      ${jobDescription}
      
      INSTRUKSI KHUSUS (WAJIB DIKUTI):
      1. Untuk SETIAP item "Tugas" yang tercantum dalam data di atas, Anda WAJIB merumuskan TEPAT 2 (DUA) KPI yang berbeda.
      2. Jangan meringkas tugas. Jika ada 5 tugas, output harus ada 10 KPI.
      3. Petakan setiap KPI ke dalam perspektif Balanced Scorecard yang paling relevan (Financial, Customer, Internal Process, Learning & Growth).
      
      Untuk setiap KPI, berikan analisis lengkap:
      - Nama KPI, Definisi, Rumus, Satuan.
      - Target Audiens & Tantangan Pengukuran.
      
      Gunakan Bahasa Indonesia yang profesional.
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
    
    // Update prompt text for File Context if not in task mode (if file is PDF/Image)
    // If it is CSV task mode, we usually send the parsed text in jobDescription, not as fileData.
    if (!isTaskBasedMode) {
       promptText = `
        Bertindaklah sebagai konsultan HR expert. 
        Analisis dokumen Job Description yang dilampirkan ini.
        ${jobDescription ? `Konteks tambahan atau Judul Posisi: "${jobDescription}".` : ''}
        
        Berdasarkan dokumen tersebut, buatlah daftar Key Performance Indicators (KPI) yang komprehensif dan relevan.
        
        Pastikan KPI mencakup 4 perspektif Balanced Scorecard (Financial, Customer, Internal Process, Learning & Growth).
        Sertakan analisis mengenai Target Audiens (stakeholder) dan Tantangan Pengukuran (potensi hambatan/bias).
        Gunakan Bahasa Indonesia yang profesional.
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
              perspective: { type: Type.STRING, description: "Perspektif BSC (Financial, Customer, Internal Process, Learning & Growth)" },
              kpiName: { type: Type.STRING, description: "Nama Indikator Kinerja Utama" },
              type: { type: Type.STRING, description: "Jenis KPI (Outcome, Output, atau Activity)" },
              detail: { type: Type.STRING, description: "Penjelasan detail singkat tentang KPI ini (Hubungkan dengan Tugas terkait jika ada)" },
              polarity: { type: Type.STRING, description: "Polaritas (Maximize: semakin tinggi semakin baik, Minimize: semakin rendah semakin baik)" },
              unit: { type: Type.STRING, description: "Satuan pengukuran (%, Rp, Jumlah, Rasio, dll)" },
              definition: { type: Type.STRING, description: "Definisi operasional KPI" },
              dataSource: { type: Type.STRING, description: "Alternatif sumber data untuk pelacakan" },
              formula: { type: Type.STRING, description: "Contoh rumus perhitungan" },
              measurement: { type: Type.STRING, description: "Frekuensi atau metode pengukuran (Bulanan, Tahunan, dll)" },
              targetAudience: { type: Type.STRING, description: "Stakeholder atau pihak yang paling berkepentingan dengan data KPI ini" },
              measurementChallenges: { type: Type.STRING, description: "Analisis potensi kesulitan, bias, atau hambatan dalam mengukur KPI ini" }
            },
            required: ["perspective", "kpiName", "type", "detail", "polarity", "unit", "definition", "dataSource", "formula", "measurement", "targetAudience", "measurementChallenges"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);
    
    // Transform into our internal KPI interface with IDs
    return rawData.map((item: any) => ({
      id: generateId(),
      jobDescription: isTaskBasedMode ? (jobDescription.split('\n')[0].replace('Role: ', '') || "CSV Import") : (jobDescription || "Uploaded Document"),
      perspective: item.perspective,
      kpiName: item.kpiName,
      type: item.type,
      detail: item.detail,
      polarity: item.polarity,
      unit: item.unit,
      definition: item.definition,
      dataSource: item.dataSource,
      formula: item.formula,
      measurement: item.measurement,
      targetAudience: item.targetAudience,
      measurementChallenges: item.measurementChallenges
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
