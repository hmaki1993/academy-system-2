import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const models = data.models || [];
        let output = `Found ${models.length} models.\n`;

        models.forEach((m: any) => {
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                output += `${m.name}\n`;
            }
        });
        fs.writeFileSync("models.txt", output, "utf8");
    } catch (e) {
        console.error(e);
    }
}
listModels();
