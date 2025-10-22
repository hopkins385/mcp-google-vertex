#!/usr/bin/env node
import { VideoGenerationReferenceType } from "@google/genai";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import consola from "consola";
import express from "express";
import { z } from "zod";
import { CONFIG } from "./config";
import {
  GoogleGenAIService,
  ImageGenerationOptions,
  VideoGenerationOptions,
} from "./google-genai.js";
import { StorageService } from "./storage.js";
import { disableConsoleOutput } from "./tools/override-console.js";

const logger = consola.create({
  level: CONFIG.server.logLevel,
});

let mcpServer: McpServer;
let isShuttingDown = false;

if (CONFIG.server.mcpTransport === "stdio") {
  disableConsoleOutput();
}

/**
 * Main MCP Server for Google Vertex AI image and video generation
 */
async function main() {
  // Initialize services
  const googleGenAI = new GoogleGenAIService();
  const storage = new StorageService();
  await storage.init();

  // Create MCP server
  mcpServer = new McpServer({
    name: "mcp-google-vertex",
    version: "0.3.0",
  });

  // Register image generation tool
  mcpServer.registerTool(
    "generate-image",
    {
      title: "Generate Images",
      description: "Generate AI images using Google Vertex AI Imagen model",
      inputSchema: {
        prompt: z
          .string()
          .describe("The text prompt describing the image to generate"),
        numberOfImages: z
          .number()
          .min(1)
          .max(8)
          .default(1)
          .optional()
          .describe("Number of images to generate (1-8)"),
        aspectRatio: z
          .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
          .default("1:1")
          .optional()
          .describe("Aspect ratio for the image"),
        imageSize: z
          .enum(["1K", "2K"])
          .default("1K")
          .optional()
          .describe("Size of the generated image"),
        outputMimeType: z
          .enum(["image/png", "image/jpeg"])
          .default("image/jpeg")
          .optional()
          .describe("Output image MIME type"),
        negativePrompt: z
          .string()
          .optional()
          .describe("Things to avoid in the image"),
        guidanceScale: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe("How much the model adheres to the prompt (1-20)"),
        seed: z
          .number()
          .optional()
          .describe("Random seed for reproducible generation"),
        enhancePrompt: z
          .boolean()
          .optional()
          .describe("Whether to enhance the prompt automatically"),
      },
      outputSchema: {
        success: z.boolean(),
        filePaths: z.array(z.string()).optional(),
        filenames: z.array(z.string()).optional(),
        count: z.number(),
        message: z.string(),
      },
    },
    async ({
      prompt,
      numberOfImages,
      aspectRatio,
      negativePrompt,
      guidanceScale,
      seed,
      enhancePrompt,
      outputMimeType,
      imageSize,
    }) => {
      const saveLocally = true;
      try {
        const options: ImageGenerationOptions = {
          numberOfImages,
          aspectRatio: aspectRatio as any,
          negativePrompt,
          guidanceScale,
          seed,
          enhancePrompt,
          outputCompressionQuality: 100,
          outputMimeType,
          imageSize,
        };

        // Generate images
        const imageBuffers = await googleGenAI.generateImage(prompt, options);

        let filePaths: string[] = [];
        let filenames: string[] = [];

        if (saveLocally) {
          // Save each image to local storage
          for (let i = 0; i < imageBuffers.length; i++) {
            const fileExtension =
              options.outputMimeType === "image/png" ? "png" : "jpg";
            const filename = storage.generateFilename(
              `image_${i + 1}`,
              fileExtension
            );
            const filePath = await storage.saveImage(imageBuffers[i], filename);
            filenames.push(filename);
            filePaths.push(filePath);
          }
        }

        const output = {
          success: true,
          filePaths: filePaths.length > 0 ? filePaths : undefined,
          filenames: filenames.length > 0 ? filenames : undefined,
          count: imageBuffers.length,
          message: saveLocally
            ? `${imageBuffers.length} image(s) generated and saved`
            : `${imageBuffers.length} image(s) generated successfully`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const output = {
          success: false,
          count: 0,
          message: `Failed to generate image: ${errorMessage}`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
          isError: true,
        };
      }
    }
  );

  const videoReferenceImageSchema = z.object({
    gcsUri: z.string().optional().describe("Cloud Storage URI of the image"),
    imageBytes: z.string().optional().describe("Base64-encoded image bytes"),
    mimeType: z.string().optional().describe("MIME type of the image"),
  });

  // Register video generation tool
  mcpServer.registerTool(
    "generate-video",
    {
      title: "Generate Videos",
      description: "Generate AI videos using Google Vertex AI Veo model",
      inputSchema: {
        prompt: z
          .string()
          .describe("The text prompt describing the video to generate"),
        numberOfVideos: z
          .number()
          .min(1)
          .max(4)
          .optional()
          .describe("Number of videos to generate (1-4)"),
        durationSeconds: z
          .number()
          .min(4)
          .max(8)
          .optional()
          .describe("Duration of the video in seconds (4 or 6 or 8)"),
        aspectRatio: z
          .enum(["16:9", "9:16"])
          .optional()
          .describe("Aspect ratio for the video"),
        resolution: z
          .enum(["720p", "1080p"])
          .optional()
          .describe("Video resolution"),
        fps: z
          .number()
          .min(8)
          .max(30)
          .optional()
          .describe("Frames per second (8-30)"),
        seed: z
          .number()
          .optional()
          .describe("Random seed for reproducible generation"),
        negativePrompt: z
          .string()
          .optional()
          .describe("Things to avoid in the video"),
        enhancePrompt: z
          .boolean()
          .optional()
          .describe("Whether to enhance the prompt automatically"),
        generateAudio: z
          .boolean()
          .optional()
          .describe("Whether to generate audio with the video"),
        lastFrame: videoReferenceImageSchema
          .optional()
          .describe(
            "Image to use as the last frame of generated videos (only for image-to-video)"
          ),
        referenceImages: z
          .array(
            z.object({
              image: videoReferenceImageSchema.describe("The reference image"),
              referenceType: z
                .nativeEnum(VideoGenerationReferenceType)
                .describe("Type of the reference image: ASSET or STYLE"),
            })
          )
          .optional()
          .describe(
            "Images to use as references (up to 3 ASSET images or 1 STYLE image)"
          ),
      },
      outputSchema: {
        success: z.boolean(),
        filePaths: z.array(z.string()).optional(),
        filenames: z.array(z.string()).optional(),
        count: z.number(),
        message: z.string(),
      },
    },
    async ({
      prompt,
      numberOfVideos,
      durationSeconds,
      aspectRatio,
      resolution,
      fps,
      seed,
      negativePrompt,
      enhancePrompt,
      generateAudio,
      lastFrame,
      referenceImages,
    }) => {
      const saveLocally = true;
      try {
        const options: VideoGenerationOptions = {
          numberOfVideos,
          durationSeconds,
          aspectRatio: aspectRatio as any,
          resolution: resolution as any,
          fps,
          seed,
          negativePrompt,
          enhancePrompt,
          generateAudio,
          lastFrame,
          referenceImages,
        };

        // Generate videos
        const videoBuffers = await googleGenAI.generateVideo(prompt, options);

        let filePaths: string[] = [];
        let filenames: string[] = [];

        if (saveLocally) {
          // Save each video to local storage
          for (let i = 0; i < videoBuffers.length; i++) {
            const filename = storage.generateFilename(`video_${i + 1}`, "mp4");
            const filePath = await storage.saveVideo(videoBuffers[i], filename);
            filenames.push(filename);
            filePaths.push(filePath);
          }
        }

        const output = {
          success: true,
          filePaths: filePaths.length > 0 ? filePaths : undefined,
          filenames: filenames.length > 0 ? filenames : undefined,
          count: videoBuffers.length,
          message: saveLocally
            ? `${videoBuffers.length} video(s) generated and saved`
            : `${videoBuffers.length} video(s) generated successfully`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const output = {
          success: false,
          count: 0,
          message: `Failed to generate video: ${errorMessage}`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
          isError: true,
        };
      }
    }
  );

  // Register cost estimation tool
  mcpServer.registerTool(
    "estimate-cost",
    {
      title: "Estimate Generation Cost",
      description: "Estimate the cost for image or video generation",
      inputSchema: {
        type: z
          .enum(["image", "video"])
          .describe("Type of generation to estimate cost for"),
        numberOfImages: z
          .number()
          .min(1)
          .max(8)
          .optional()
          .describe("Number of images (for image type)"),
        imageSize: z
          .enum(["1K", "2K"])
          .optional()
          .describe("Image size (for image type)"),
        numberOfVideos: z
          .number()
          .min(1)
          .max(4)
          .optional()
          .describe("Number of videos (for video type)"),
        durationSeconds: z
          .number()
          .min(2)
          .max(10)
          .optional()
          .describe("Video duration in seconds (for video type)"),
        resolution: z
          .enum(["720p", "1080p"])
          .optional()
          .describe("Video resolution (for video type)"),
        generateAudio: z
          .boolean()
          .optional()
          .describe("Whether to generate audio (for video type)"),
      },
      outputSchema: {
        success: z.boolean(),
        estimate: z.string(),
        message: z.string(),
      },
    },
    async ({
      type,
      numberOfImages,
      imageSize,
      numberOfVideos,
      durationSeconds,
      resolution,
      generateAudio,
    }) => {
      try {
        let estimate: string;

        if (type === "image") {
          estimate = googleGenAI.estimateImageCost({
            numberOfImages,
            imageSize,
          });
        } else {
          estimate = googleGenAI.estimateVideoCost({
            numberOfVideos,
            durationSeconds,
            resolution,
            generateAudio,
          });
        }

        const output = {
          success: true,
          estimate,
          message: `Cost estimation for ${type} generation`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const output = {
          success: false,
          estimate: "",
          message: `Failed to estimate cost: ${errorMessage}`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
          isError: true,
        };
      }
    }
  );

  // Set up Express server
  const { port, host, mcpTransport } = CONFIG.server;
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "mcp-google-vertex" });
  });

  // MCP endpoint
  app.post("/mcp", async (req, res) => {
    // Create a new transport for each request to prevent request ID collisions
    let transport;
    switch (mcpTransport) {
      case "http":
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        break;
      case "stdio":
      default:
        transport = new StdioServerTransport();
        break;
    }

    // Clean up transport on response close
    res.on("close", () => {
      transport.close();
    });

    await mcpServer.connect(transport);
    if (transport instanceof StreamableHTTPServerTransport) {
      await transport.handleRequest(req, res, req.body);
    }
  });

  app
    .listen(port, host, () => {
      logger.info(`Server running on http://${host}:${port}/mcp`);
    })
    .on("error", (error) => {
      logger.error("Server error:", error);
      process.exit(1);
    });
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // Log to stderr only (not stdout which would corrupt JSON-RPC)
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Shutdown the server if it exists
    if (mcpServer) {
      await mcpServer.close();
    }
  } catch (error) {
    logger.error("Error during shutdown:", error);
  }

  // Close stdin to signal we're done reading
  process.stdin.pause();
  process.stdin.destroy();

  // Exit with timeout to ensure we don't hang
  setTimeout(() => {
    process.exit(0);
  }, 500).unref(); // unref() allows process to exit if this is the only thing keeping it alive

  // But also exit immediately if nothing else is pending
  process.exit(0);
}

// Register signal handlers
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGHUP", () => void shutdown("SIGHUP"));

// Also handle stdin close (when Claude Desktop closes the pipe)
process.stdin.on("end", () => {
  logger.info("stdin closed, shutting down...");
  void shutdown("STDIN_CLOSE");
});

// catching unhandled rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});
// catching uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
});
