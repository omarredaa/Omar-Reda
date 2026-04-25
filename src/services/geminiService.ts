
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeDocument(base64Image: string, mimeType: string): Promise<DocumentData> {
  const prompt = `
    تحليل هذا المستند (إذن صرف أو إذن استلام).
    استخرج البيانات التالية بدقة:
    1. نوع المستند (صرف/استلام).
    2. التاريخ.
    3. رقم المرجع/الإذن.
    4. قائمة الأصناف (الاسم، الكمية، الوحدة، أي ملاحظات).

    أجب بدقة باللغة العربية وفي صيغة JSON فقط.
  `;

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64Image.split(',')[1] || base64Image,
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentType: { type: Type.STRING, description: "صرف أو استلام" },
          date: { type: Type.STRING },
          referenceNumber: { type: Type.STRING },
          entries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                productName: { type: Type.STRING },
                quantity: { type: Type.STRING },
                unit: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ["productName", "quantity"]
            }
          }
        },
        required: ["documentType", "entries"]
      }
    }
  });

  const data = JSON.parse(response.text);
  
  // Ensure IDs are present
  if (data.entries) {
    data.entries = data.entries.map((entry: any, index: number) => ({
      ...entry,
      id: entry.id || `entry-${Date.now()}-${index}`
    }));
  }

  return data as DocumentData;
}
