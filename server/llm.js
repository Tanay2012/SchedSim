import dotenv from 'dotenv';
dotenv.config();

export async function extractProgramCode(imageBase64, mimeType, prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from .env file");
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent";

    const parts = [{ text: prompt }];
    
    if (imageBase64 && mimeType) {
        parts.push({
            inline_data: {
                mime_type: mimeType,
                data: imageBase64
            }
        });
    }

    const payload = {
        contents: [{ parts: parts }]
        // generationConfig completely removed to bypass the 500 error
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey 
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    try {
        let textOutput = data.candidates[0].content.parts[0].text;
        
        // Gemma 4 outputs "thinking" text before the JSON. 
        // This isolates strictly the JSON object.
        const jsonStart = textOutput.indexOf('{');
        const jsonEnd = textOutput.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            textOutput = textOutput.substring(jsonStart, jsonEnd + 1);
        }
        
        return JSON.parse(textOutput);
    } catch (parseError) {
        console.error("Failed to parse JSON from model:", data);
        throw new Error("Model did not return valid JSON");
    }
}