import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIAnalysisResult {
  bertConsistency: string;
  cnnDamageDetection: string;
  fraudScore: number;
  predictedAmount: number;
}

export async function analyzeClaim(description: string, images: string[], firText?: string): Promise<AIAnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this vehicle insurance claim.
    
    Accident Description: "${description}"
    ${firText ? `FIR Content: "${firText}"` : ""}
    
    Tasks:
    1. BERT-like NLP Analysis: Check for semantic consistency between the user's description and the FIR (if provided). Identify any contradictions.
    2. CNN-like Computer Vision Analysis: Analyze the provided images (if any) for damage patterns. Detect signs of fraud or manipulation.
    3. Fraud Score: Provide a fraud probability score from 0 to 100.
    4. Predicted Claim Amount: Estimate a reasonable claim amount in USD based on the damage described and shown.
    
    Return the result in JSON format with the following structure:
    {
      "bertConsistency": "string (detailed analysis)",
      "cnnDamageDetection": "string (detailed analysis)",
      "fraudScore": number (0-100),
      "predictedAmount": number (estimated value)
    }
  `;

  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(',')[1] // Assuming base64
    }
  }));

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: prompt },
        ...imageParts
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return {
      bertConsistency: result.bertConsistency || "Analysis unavailable",
      cnnDamageDetection: result.cnnDamageDetection || "Analysis unavailable",
      fraudScore: result.fraudScore || 0,
      predictedAmount: result.predictedAmount || 0
    };
  } catch (error) {
    console.error("Failed to parse AI analysis:", error);
    throw new Error("AI Analysis failed");
  }
}
