/**
 * Centralized AI Error Handling Utility
 * Parses Gemini API errors and returns human-readable messages and retry delays.
 */

export interface AIErrorResponse {
    message: string;
    retryAfterSeconds?: number;
    isQuotaError: boolean;
}

export const handleAIError = (error: any): AIErrorResponse => {
    console.error("AI Service Error:", error);

    const result: AIErrorResponse = {
        message: "An unexpected AI error occurred. Please try again later.",
        isQuotaError: false
    };

    // Handle string errors
    if (typeof error === 'string') {
        result.message = error;
        return result;
    }

    // Handle structured GoogleGenerativeAI errors
    const errorMessage = error?.message || "";
    const errorStatus = error?.status || (error?.response?.status);

    // Detect Quota Exceeded (429)
    if (errorStatus === 429 || errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota exceeded")) {
        result.isQuotaError = true;
        result.message = "Daily AI limit reached (Free Tier). Please wait before trying again.";
        
        // Attempt to extract retry delay from error details if available
        try {
            const details = error?.response?.details || error?.details;
            if (Array.isArray(details)) {
                const retryInfo = details.find(d => 
                    d['@type']?.includes('RetryInfo') || 
                    d.reason === 'RATE_LIMIT_EXCEEDED'
                );
                
                const delayStr = retryInfo?.retryDelay || retryInfo?.metadata?.retryDelay;
                if (delayStr) {
                    // format is usually "17s" or "5.5s"
                    const seconds = parseFloat(delayStr);
                    if (!isNaN(seconds)) {
                        result.retryAfterSeconds = Math.ceil(seconds);
                        console.log(`[AI-Retry] Extracted delay from structured info: ${result.retryAfterSeconds}s`);
                    }
                }
            }
            
            // Still check the message string as a fallback
            if (!result.retryAfterSeconds && errorMessage.includes("retry in")) {
                const match = errorMessage.match(/retry in ([\d.]+)/);
                if (match && match[1]) {
                    result.retryAfterSeconds = Math.ceil(parseFloat(match[1]));
                    console.log(`[AI-Retry] Extracted delay from message string: ${result.retryAfterSeconds}s`);
                }
            }
        } catch (e) {
            console.warn("Could not parse retry delay:", e);
        }
        
        return result;
    }

    // Detect API Key issues
    if (errorMessage.toLowerCase().includes("api key") || errorStatus === 401 || errorStatus === 403) {
        result.message = "Invalid or missing AI API Key. Please check your settings.";
        return result;
    }

    // Detect API Configuration issues (404)
    if (errorStatus === 404 || errorMessage.toLowerCase().includes("not found")) {
        result.message = "AI Model configuration error (404). Please contact support or check API version.";
        return result;
    }

    // Default to the provided error message if it seems useful and we haven't already set a specific message
    if (!result.isQuotaError && errorMessage && errorMessage.length < 150) {
        result.message = errorMessage;
    } else if (result.isQuotaError && result.retryAfterSeconds) {
        result.message = `Daily AI limit reached. Please wait ${result.retryAfterSeconds}s before trying again. ⏳`;
    }

    return result;
};
