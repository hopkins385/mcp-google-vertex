import { LogLevel } from "consola";
import { config } from "dotenv";
config();

/**
 * Configuration loader with environment variable validation
 */
export const CONFIG = {
  // Google Cloud Configuration (when using Vertex AI)
  googleVertex: {
    project: process.env.GOOGLE_VERTEX_PROJECT_ID || "",
    location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
    clientEmail: process.env.GOOGLE_VERTEX_CLIENT_EMAIL || "",
    privateKey: process.env.GOOGLE_VERTEX_PRIVATE_KEY || "",
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "localhost",
    mcpTransport: process.env.MCP_TRANSPORT || "stdio",
    logLevel: parseInt(process.env.LOG_LEVEL || "0", 10) as LogLevel,
  },

  // Storage Configuration
  storage: {
    path: process.env.STORAGE_PATH || "./generated",
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || "100", 10),
  },

  // AI Models Configuration
  models: {
    image: process.env.VERTEX_AI_IMAGE_MODEL || "imagen-4.0-generate-001",
    video: process.env.VERTEX_AI_VIDEO_MODEL || "veo-3.0-generate-001",
  },

  // Default Generation Settings
  defaults: {
    safetyFilterLevel:
      process.env.SAFETY_FILTER_LEVEL || "BLOCK_MEDIUM_AND_ABOVE",
    personGeneration: process.env.PERSON_GENERATION || "ALLOW_ADULT",
    guidanceScale: parseInt(process.env.DEFAULT_GUIDANCE_SCALE || "10", 10),
    outputQuality: parseInt(process.env.DEFAULT_OUTPUT_QUALITY || "85", 10),
  },
} as const;
