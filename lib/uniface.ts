import { Uniface } from "ppu-uniface";

const globalForUniface = globalThis as unknown as {
    uniface: Uniface | undefined;
};

export const uniface = globalForUniface.uniface ?? new Uniface();

if (process.env.NODE_ENV !== "production") globalForUniface.uniface = uniface;

// Initialize models lazily or on server start
// Note: In serverless environment, this might need to be called per request or cached differently.
// For this demo, we assume a long-running server or acceptable cold start.
