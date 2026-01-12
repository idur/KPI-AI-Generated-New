
import { GoogleGenAI, Type } from "@google/genai";
import { KPI } from "../types";

// Helper to create a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateKPIsFromJobDescription = async (
  jobDescription: string,
  fileData?: { base64: string; mimeType: string },
  isTaskBasedMode: boolean = false,
  limit?: number,
  language: 'id' | 'en' = 'id',
  onProgress?: (kpis: KPI[]) => void,
  forcedJobLabel?: string // New optional parameter
): Promise<KPI[]> => {

  // --- API KEY RETRIEVAL ---
  let apiKey: string | undefined;

  // Safe access for Vite replacement
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    console.warn("Failed to access env vars for API Key");
  }

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your App Settings or Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const langInstruction = language === 'en'
    ? "IMPORTANT: Output ALL content strictly in ENGLISH. Do not mix with Indonesian. Use professional business English."
    : "Gunakan Bahasa Indonesia yang profesional.";

  // Default Prompt
  let promptText = `
    Bertindaklah sebagai konsultan HR expert. Buatlah daftar Key Performance Indicators (KPI) yang komprehensif untuk Job Description / Role berikut: "${jobDescription}".
    ${limit ? `BATASAN PENTING: Buatlah MINIMAL 10 KPI dan MAKSIMAL ${limit} KPI. Jangan kurang dari 10.` : 'Buatlah minimal 10 KPI.'}
    
    Pastikan KPI mencakup 4 perspektif Balanced Scorecard (Financial, Customer, Internal Process, Learning & Growth).
    
    Untuk setiap KPI, berikan analisis mendalam mencakup:
    1. Detail KPI standar (definisi, rumus, sumber data).
    2. Target Audiens: Siapa stakeholder utama yang berkepentingan dengan metrik ini?
    3. Tantangan Pengukuran: Apa kesulitan potensial, bias, atau hambatan teknis dalam mengukur KPI ini secara akurat?
    4. Rekomendasi Skema Skoring: Berikan panduan lengkap cara memberikan nilai/skor untuk KPI ini. 
       FORMAT KELUARAN YANG WAJIB DIGUNAKAN (Rich Text / HTML-like):
       Gunakan <ul> dan <li> untuk membuat bullet points.
       Gunakan <b> atau <strong> untuk menebalkan kata "Score".
       Contoh Format:
       <ul>
         <li><b>Score 5</b>: >= 110% dari target.</li>
         <li><b>Score 4</b>: 100% - 109% dari target.</li>
         <li><b>Score 3</b>: 90% - 99% dari target.</li>
         <li><b>Score 2</b>: 80% - 89% dari target.</li>
         <li><b>Score 1</b>: < 80% dari target.</li>
       </ul>
       Jangan gunakan markdown (**) di dalam string ini, gunakan tag HTML standar agar mudah dirender di frontend.
    
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
      ${limit ? `2. PENTING: Total KPI yang dihasilkan HARUS ANTARA 10 sampai ${limit} item secara keseluruhan. Jika tugas sedikit, satu tugas bisa memiliki lebih dari 2 KPI untuk mencapai minimal 10.` : '2. Jangan meringkas tugas. Minimal 10 KPI.'}
      3. Petakan setiap KPI ke dalam perspektif Balanced Scorecard yang paling relevan.
      4. PENTING: Sertakan teks asli "Tugas" yang menjadi dasar KPI tersebut di field 'task' pada output JSON.
      5. Identifikasi nama Role/Jabatan yang spesifik dari input dan masukkan ke field 'roleName'.
      6. Sertakan Rekomendasi Skema Skoring yang detail dan aplikatif.
      
      Untuk setiap KPI, berikan analisis lengkap (Definisi, Rumus, Target Audiens, Scoring System, dll).
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
        
        TUGAS UTAMA:
        1. Identifikasi secara spesifik Nama Role / Jabatan yang paling sesuai dengan konten dokumen. Jika tidak tertulis eksplisit, LAKUKAN ANALISIS dan PREDIKSI nama role yang paling akurat berdasarkan tugas-tugas yang disebutkan. Masukkan ini ke field 'roleName'.
        2. Berdasarkan role tersebut, buatlah daftar Key Performance Indicators (KPI) yang komprehensif dan relevan.
        ${limit ? `BATASAN PENTING: Buatlah MINIMAL 10 KPI dan MAKSIMAL ${limit} KPI.` : 'Buatlah minimal 10 KPI.'}
        
        Pastikan KPI mencakup 4 perspektif Balanced Scorecard.
        Sertakan analisis mengenai Target Audiens, Tantangan Pengukuran, dan Rekomendasi Skema Skoring.
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
              measurementChallenges: { type: Type.STRING, description: "Potensi hambatan pengukuran" },
              scoringSystem: { type: Type.STRING, description: "Rekomendasi skema skoring lengkap dengan tabel/kriteria" }
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
    const finalKPIs = rawData.map((item: any) => {
      // Determine Job Description Label
      let jobDescLabel = "Uploaded Document";

      if (forcedJobLabel) {
        jobDescLabel = forcedJobLabel;
      } else {
        // Priority 1: AI Extracted Role Name (from both CSV and Doc modes)
        if (item.roleName && item.roleName !== "Unknown" && item.roleName.length > 2) {
            jobDescLabel = item.roleName;
        } 
        // Priority 2: Fallback logic
        else if (isTaskBasedMode) {
            jobDescLabel = jobDescription.split('\n')[0].replace('Role: ', '').trim() || "CSV Import";
        } else {
            // For standard mode, if AI failed to identify, fallback to input or filename
            // We can try to be smarter here if jobDescription is just "Generated Result" or "Analisis..."
            if (jobDescription && !jobDescription.startsWith("Generated") && !jobDescription.startsWith("Analisis")) {
                jobDescLabel = jobDescription;
            } else {
                 jobDescLabel = "Untitled Role";
            }
        }
      }

      return {
        id: generateId(),
        jobDescription: jobDescLabel,
        perspective: item.perspective,
        kpiName: item.kpiName,
        type: item.type,
        detail: item.detail,
        task: item.task || '-',
        polarity: item.polarity,
        unit: item.unit,
        definition: item.definition,
        dataSource: item.dataSource,
        formula: item.formula,
        measurement: item.measurement,
        targetAudience: item.targetAudience,
        measurementChallenges: item.measurementChallenges,
        scoringSystem: item.scoringSystem
      };
    });

    // Call onProgress with final result if provided
    if (onProgress) onProgress(finalKPIs);

    return finalKPIs;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
