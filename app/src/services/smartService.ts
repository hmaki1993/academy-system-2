import { GoogleGenerativeAI } from "@google/generative-ai";

export interface SmartExtractedStudent {
    full_name: string;
    phone: string;
    date_of_birth?: string; // YYYY-MM-DD
    gender?: 'male' | 'female';
    coach_name?: string;
    plan_name?: string;
}

export const processImageWithSmartEngine = async (base64Image: string): Promise<SmartExtractedStudent[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is missing from your .env file. Please add it to use the Smart Scanner.");
    }

    // Remove the data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `
    You are a Smart Assistant designed to extract student data from images of printed or handwritten lists.
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
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

        const parsedData = JSON.parse(cleanedText) as SmartExtractedStudent[];
        return parsedData;

    } catch (error) {
        console.error("Failed to process image with Smart Engine:", error);
        throw error;
    }
};

export const generateTrainingPlan = async (params: {
    ageGroup: string;
    skillLevel: string;
    focusArea: string;
    durationWeeks: number;
    weaknesses: string;
    apiKey: string;
    language?: string;
    sessionsPerWeek?: number;
}): Promise<any> => {
    if (!params.apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is missing. Please configure it in settings.");
    }

    const { ageGroup, skillLevel, focusArea, durationWeeks, weaknesses, apiKey, language = 'Arabic', sessionsPerWeek = 3 } = params;

    const prompt = `
        You are an elite, Olympic-level gymnastics Head Coach with expertise in Artistic Gymnastics. 
        Create a highly structured, professional, and technical training plan using official FIG (International Gymnastics Federation) terminology.
        
        Parameters:
        - Age Group: ${ageGroup}
        - Skill Level: ${skillLevel}
        - Focus Apparatus/Area: ${focusArea}
        - Plan Duration: ${durationWeeks} weeks
        - Frequency: ${sessionsPerWeek} training sessions per week
        - Specific Weaknesses to Target: ${weaknesses}
        - Desired Language: ${language}

        IMPORTANT INSTRUCTIONS:
        1. TERMINOLOGY: Use precise gymnastics terms (e.g., "Kip", "Cast to Handstand", "Giant", "Layout Full", "Split Leap", "Wolf Turn", "Pivot").
        2. COACH CUES: Cues must be technical and high-level (e.g., "Maintain hollow body position", "Drive heels in backswing", "Active shoulders during block").
        3. ARABIC LANGUAGE: If language is Arabic, use professional Egyptian gymnastics terminology used in top-tier clubs (e.g., "هبوط متزن", "شقلبة خلفية على اليدين", "طلوع بالكب", "دورة خلفية كبرى", "عجلة على العارضة"). Avoid generic sports terms; use vertical-specific vocabulary.
        4. STRUCTURE: For each week, you MUST provide exactly ${sessionsPerWeek} distinct training days.
        
        Your response MUST be exclusively a raw JSON object.
        
        JSON Structure:
        {
            "title": "A premium, technical title (e.g., 'Targeted Beam Precision & Dismount Mastery')",
            "overview": "A brief, professional summary focusing on technical progression.",
            "weeks": [
                {
                    "week_number": 1,
                    "focus": "Technical theme (e.g., 'Dynamic Amplitude & Connection Flow')",
                    "days": [
                        {
                            "day_number": 1,
                            "daily_focus": "Specific session goal",
                            "drills": [
                                { 
                                    "name": "Specific Skill/Drill Name (e.g., 'B-Level Connection Linkage')", 
                                    "sets_reps": "e.g., 5 sets of 3 reps", 
                                    "rest": "90s", 
                                    "coach_cue": "Technical correction focus" 
                                }
                            ]
                        }
                    ]
                }
            ],
            "safety_notes": "Technical safety and body conditioning warnings."
        }
    `;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        let cleanedText = textResponse.trim();
        if (cleanedText.startsWith('```json')) cleanedText = cleanedText.substring(7);
        if (cleanedText.startsWith('```')) cleanedText = cleanedText.substring(3);
        if (cleanedText.endsWith('```')) cleanedText = cleanedText.substring(0, cleanedText.length - 3);

        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Failed to generate training plan with Smart Engine:", error);
        throw error;
    }
};

export const generateMonthlyReportSummary = async (params: {
    fullName: string,
    month: string,
    present: number,
    total: number,
    assessments: any[],
    apiKey: string,
    language?: 'Arabic' | 'English'
}): Promise<any> => {
    if (!params.apiKey) {
        throw new Error("Gemini API Key missing in Settings!");
    }

    const { fullName, month, present, total, assessments, apiKey, language = 'Arabic' } = params;

    const prompt = `
        You are a world-class Olympic gymnastics performance analyst.
        Student: ${fullName}
        Month: ${month}
        
        Data context:
        - Presence: ${present}/${total} sessions
        - Recent Assessments: ${JSON.stringify(assessments)}
        
        Analyze this data and provide a highly professional, motivational report addressed to the PARENTS/GUARDIANS.
        
        Language Instructions:
        - Desired Language: ${language}
        - Audience: The report must be addressed to the PARENT (ولي أمر البطل/البطلة). 
        - Arabic Persona: You MUST use a professional, authentic Egyptian accent (Egyptian Ammiya merged with professional coaching jargon). 
        - Address the parent with terms like "ولي أمر بطلنا/بطلتنا", "مستوى ابنكم/ابنتكم".
        - Use local elite gymnastics coaching terms like: "ثبات هبوط", "شد مشط", "ركبة مفرودة", "شدة جسم", "فنش الحركة", "الباور عالي", "تكنيك عالي", "فرده كويسة".
        - Avoid formal Modern Standard Arabic (MSA); sound like a mentor/coach from a top Egyptian club.
        - Use motivational phrases addressed to the parents about their child, e.g., "ابنكم بقى وحش في التمرين", "مستوى البطل بيتحسن جداً".
        - If language is English, use standard International Federation terminology and address the parents.
        
        Report Requirements:
        1. Technical skills progression.
        2. Behavioral notes and focus.
        3. A clear action plan for the next month.
        
        Your response MUST be exclusively a raw JSON object (not wrapped in markdown).
        Structure:
        {
            "technical": "A comprehensive paragraph analyzing their technical progress, trajectory, and physical development based on the assessment scores.",
            "behavior": "A paragraph addressing their focus, behavior, discipline, and attendance.",
            "action_plan": "3 specific, actionable steps or focus areas for the next 30 days to improve their weakest scores.",
            "strengths": ["Strength 1", "Strength 2"],
            "weaknesses": ["Area for improvement 1", "Area for improvement 2"]
        }
    `;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
        
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Failed to generate monthly report with Smart Engine:", error);
        throw error;
    }
};

