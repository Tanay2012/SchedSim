import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { extractProgramCode } from './llm.js';
import { findDeadlock } from './engine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up Multer to keep uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

const SYSTEM_PROMPT = `
You are a concurrency code analyzer. Extract each thread's operations into strict JSON.
Expand 'with lock:' into 'acquire' then 'release'.
You MUST return ONLY valid JSON matching exactly this schema:
{
  "threads": [
    {
      "id": "T1",
      "ops": [
        { "op": "acquire", "target": "lockA" },
        { "op": "release", "target": "lockA" }
      ]
    }
  ]
}
`;
app.post('/api/analyze', upload.single('code_image'), async (req, res) => {
    try {
        console.log("Request received...");
        let imageBase64 = null;
        let mimeType = null;
        const codeText = req.body.code_text || null;

        if (req.file) {
            imageBase64 = req.file.buffer.toString('base64');
            mimeType = req.file.mimetype;
        }

        if (!imageBase64 && !codeText) {
            return res.status(400).json({ error: 'Provide code_image or code_text' });
        }

        const prompt = codeText ? `${SYSTEM_PROMPT}\n\nCode:\n${codeText}` : SYSTEM_PROMPT;

        console.log('1. Calling Gemma for extraction...');
        const extractedProgram = await extractProgramCode(imageBase64, mimeType, prompt);

        console.log('2. Running Deadlock Engine...');
        const analysis = findDeadlock(extractedProgram);

        console.log('Done! Sending response.');
        return res.json({
            success: true,
            program: extractedProgram,
            analysis: analysis
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
});