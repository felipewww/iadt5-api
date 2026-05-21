import 'dotenv/config';

export const config = {
    port: parseInt(process.env.APP_PORT ?? '3300', 10),
    ocrServiceUrl: process.env.OCR_SERVICE_URL ?? 'http://localhost:3201',
    jobsServiceUrl: process.env.JOBS_SERVICE_URL ?? 'http://platform-jobs:3100',
    mongoUri: process.env.MONGO_URI ?? 'mongodb://admin:secret@platform-mongodb:27017/analyzer?authSource=admin&directConnection=true',
    llm: {
        provider: (process.env.LLM_PROVIDER ?? 'anthropic') as 'anthropic' | 'openai',
        model: process.env.LLM_MODEL ?? 'claude-opus-4-5',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
    },
} as const;
