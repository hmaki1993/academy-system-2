import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIExtractedStudent {
    full_name: string;
    phone: string;
    date_of_birth?: string; // YYYY-MM-DD
    gender?: 'male' | 'female';
    coach_name?: string;
    plan_name?: string;
}

export const processImageWithGemini = async (base64Image: string): Promise<AIExtractedStudent[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is missing from your .env file. Please add it to use the AI Scanner.");
    }

    // Remove the data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `
    You are an AI assistant designed to extract student data from images of printed or handwritten lists.
    Extract the names, phone numbers, birth dates, gender, coach name, and subscription plan from the provided image.
    Return ONLY a raw JSON array of objects. Do NOT use markdown code blocks (like \`\`\`json). Just the raw array.
    Each object must have these keys:
    1. "full_name" (string)
    2. "phone" (string)
    3. "date_of_birth" (string in YYYY-MM-DD format if found, otherwise empty string "")
    4. "gender" (string "male" or "female" if found, otherwise empty string "")
    5. "coach_name" (string if found, like "Coach Ahmed", "couch ahmed", or "كابتن احمد", otherwise empty string "")
    6. "plan_name" (string if found, like "8 sessions", "Monthly", "12 حصه", "شهري", otherwise empty string "")

    Notes:
    - Many lists have "Birth Date" (تاريخ الميلاد) or "Age" (السن). If only age is listed, calculate the year (Current year is 2026).
    - If gender is implied (e.g., from name or a column), set it to "male" or "female".
    - Look carefully for coach names. They might be misspelled as "couch", or simply appear in a column next to the student. Extract the name into "coach_name".
    - Look VERY carefully for subscription plans like "8 sessions", "Monthly", "12 حصه", "1month", "1 month". These often appear in columns at the end of the row.
    - Sometimes the plan is just a standalone number in a column (e.g. "8", "12") or immediately followed by "month" (e.g. "1month"). If it indicates sessions or duration, extract it as "plan_name".
    - If a field is missing or illegible, leave it as an empty string "".
    - Please make your best effort to read Arabic and English names and numbers accurately.
    `;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data,
                },
            },
        ]);

        const textResponse = result.response.text();

        if (!textResponse) {
            throw new Error("No text returned from Gemini API");
        }

        // Clean up any potential markdown formatting in case Gemini ignored the prompt
        let cleanedText = textResponse.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.substring(7);
        }
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.substring(3);
        }
        if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }

        const parsedData = JSON.parse(cleanedText) as AIExtractedStudent[];
        return parsedData;

    } catch (error) {
        console.error("Failed to process image with AI:", error);
        throw error;
    }
};
