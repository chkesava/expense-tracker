const OCR_API_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY;
const OCR_API_URL = "https://api.ocr.space/parse/image";

export interface OCRResult {
  ParsedResults?: {
    ParsedText: string;
  }[];
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
  ErrorDetails?: string;
}

/**
 * Extracts text from an image file using OCR.Space API
 */
export async function extractTextFromImage(file: File): Promise<string> {
  if (!OCR_API_KEY) {
    throw new Error("OCR_API_KEY is not configured. Please add VITE_OCR_SPACE_API_KEY to your .env file.");
  }

  const formData = new FormData();
  formData.append("apikey", OCR_API_KEY);
  formData.append("file", file);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("isTable", "true"); // Helps with receipt columns

  try {
    const response = await fetch(OCR_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API failed with status ${response.status}`);
    }

    const result: OCRResult = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.join(", ") || result.ErrorDetails || "Unknown OCR error");
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error("No text found in image");
    }

    return result.ParsedResults.map(r => r.ParsedText).join("\n");
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}
