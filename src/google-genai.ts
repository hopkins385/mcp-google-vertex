import {
  GenerateImagesConfig,
  GenerateVideosConfig,
  GoogleGenAI,
  Image,
  ImagePromptLanguage,
  PersonGeneration,
  SafetyFilterLevel,
  VideoCompressionQuality,
  VideoGenerationReferenceImage,
} from "@google/genai";
import { CONFIG } from "./config.js";

/**
 * Service for interacting with Google Vertex AI for image and video generation
 */
export class GoogleGenAIService {
  private genAI: GoogleGenAI;

  constructor() {
    // Use Vertex AI authentication
    this.genAI = new GoogleGenAI({
      vertexai: true,
      project: CONFIG.googleVertex.project,
      location: CONFIG.googleVertex.location,
      googleAuthOptions: {
        credentials: {
          client_email: CONFIG.googleVertex.clientEmail,
          private_key: CONFIG.googleVertex.privateKey,
        },
      },
    });
  }

  /**
   * Generate images using Imagen model
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<Buffer[]> {
    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("Prompt is required and must be a non-empty string");
    }

    if (prompt.length > 4000) {
      throw new Error("Prompt must be less than 4000 characters");
    }

    const {
      aspectRatio = "1:1",
      numberOfImages = 1,
      negativePrompt,
      language = undefined,
      guidanceScale,
      seed,
      safetyFilterLevel = SafetyFilterLevel.BLOCK_MEDIUM_AND_ABOVE,
      personGeneration = PersonGeneration.ALLOW_ADULT,
      includeSafetyAttributes = false,
      includeRaiReason = false,
      outputMimeType = "image/png",
      outputCompressionQuality = 85,
      addWatermark = undefined,
      imageSize = "1K",
      enhancePrompt = undefined,
      outputGcsUri = undefined,
    } = options;

    // Validate all options
    this.validateImageOptions(options);

    const genImConfig: GenerateImagesConfig = {
      aspectRatio,
      numberOfImages,
      negativePrompt,
      language, //
      guidanceScale,
      seed,
      safetyFilterLevel, //
      personGeneration,
      includeSafetyAttributes,
      includeRaiReason,
      outputMimeType,
      outputCompressionQuality,
      addWatermark, //
      imageSize,
      enhancePrompt, //
      outputGcsUri, //
    };

    try {
      const res = await this.genAI.models.generateImages({
        model: CONFIG.models.image,
        prompt: prompt.trim(),
        config: genImConfig,
      });

      const generatedImages = res.generatedImages;
      if (!generatedImages || generatedImages.length === 0) {
        throw new Error("No images were generated");
      }

      // Convert all images to Buffers
      const imageBuffers: Buffer[] = [];
      for (const generatedImage of generatedImages) {
        const imageData = generatedImage.image;

        if (!imageData) {
          console.warn("Skipping image with no data available");
          continue;
        }

        if (imageData.gcsUri) {
          // If using GCS URI, we would need to download it
          throw new Error(
            "GCS URI handling not implemented. Please avoid using outputGcsUri."
          );
        }

        if (imageData.imageBytes) {
          imageBuffers.push(Buffer.from(imageData.imageBytes, "base64"));
        } else {
          console.warn("Skipping image with no imageBytes data");
        }
      }

      if (imageBuffers.length === 0) {
        throw new Error("No valid image data was found in the response");
      }

      return imageBuffers;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Image generation failed: ${error.message}`);
      }
      throw new Error("Image generation failed due to an unknown error");
    }
  }

  /**
   * Generate videos using Veo model
   */
  async generateVideo(
    prompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<Buffer[]> {
    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("Prompt is required and must be a non-empty string");
    }

    if (prompt.length > 1000) {
      throw new Error(
        "Prompt must be less than 1000 characters for video generation"
      );
    }

    const {
      numberOfVideos = 1,
      durationSeconds = 8,
      aspectRatio = "16:9",
      resolution = "720p",
      fps,
      seed,
      negativePrompt,
      enhancePrompt = undefined,
      generateAudio = undefined,
      personGeneration,
      compressionQuality = VideoCompressionQuality.OPTIMIZED,
      outputGcsUri = undefined,
      lastFrame = undefined,
      referenceImages = undefined,
    } = options;

    // Validate all options
    this.validateVideoOptions(options);

    const genVidConfig: GenerateVideosConfig = {
      numberOfVideos,
      durationSeconds,
      aspectRatio,
      resolution,
      fps,
      seed,
      negativePrompt,
      enhancePrompt, //
      generateAudio, //
      personGeneration,
      compressionQuality, //
      outputGcsUri, //
      lastFrame, //
      referenceImages, //
    };

    try {
      let operation = await this.genAI.models.generateVideos({
        model: CONFIG.models.video,
        prompt: prompt.trim(),
        config: genVidConfig,
      });

      // Video generation is an async operation, we need to poll for completion
      console.log(
        `Video generation started (${numberOfVideos} videos), waiting for completion...`
      );

      const maxWaitTime = 10 * 60 * 1000; // 10 minutes for multiple videos
      const pollInterval = 15 * 1000; // 15 seconds
      const startTime = Date.now();

      while (!operation.done) {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error("Video generation timed out after 10 minutes");
        }

        // Wait before polling
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        // Poll for status update
        if (operation.name) {
          operation = await this.genAI.operations.getVideosOperation({
            operation: operation,
          });

          // Log progress if available
          if (operation.metadata) {
            console.log("Video generation progress:", operation.metadata);
          }
        } else {
          throw new Error("Operation name is not available for polling");
        }
      }

      if (operation.error) {
        throw new Error(
          `Video generation failed: ${JSON.stringify(operation.error)}`
        );
      }

      const generatedVideos = operation.response?.generatedVideos;
      if (!generatedVideos || generatedVideos.length === 0) {
        throw new Error("No videos were generated");
      }

      // Convert all videos to Buffers
      const videoBuffers: Buffer[] = [];
      for (const generatedVideo of generatedVideos) {
        const videoData = generatedVideo.video;

        if (!videoData) {
          console.warn("Skipping video with no data available");
          continue;
        }

        if (videoData.uri) {
          // If using GCS URI, we would need to download it
          console.error(
            "videoData.uri found, but GCS download not implemented.",
            videoData.uri
          );
          const gcsUri = videoData.uri;
          const videoBuffer = await this.downloadGcsFile(gcsUri);
          videoBuffers.push(videoBuffer);
        }

        if (videoData.videoBytes) {
          videoBuffers.push(Buffer.from(videoData.videoBytes, "base64"));
        } else {
          console.warn("Skipping video with no videoBytes data");
        }
      }

      if (videoBuffers.length === 0) {
        throw new Error("No valid video data was found in the response");
      }

      console.log(`Successfully generated ${videoBuffers.length} videos`);
      return videoBuffers;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Video generation failed: ${error.message}`);
      }
      throw new Error("Video generation failed due to an unknown error");
    }
  }

  async downloadGcsFile(gcsUri: string): Promise<Buffer> {
    // Placeholder for GCS file download logic
    // In a real implementation, use @google-cloud/storage to download the file
    throw new Error(
      `GCS file download not implemented. Cannot download from ${gcsUri}`
    );
  }

  /**
   * Validate the Google GenAI service configuration
   */
  async validateService(): Promise<boolean> {
    try {
      // Try to list models to validate authentication and configuration
      const modelsPager = await this.genAI.models.list();
      return modelsPager.page && modelsPager.page.length > 0;
    } catch (error) {
      console.error("Google GenAI service validation failed:", error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const pager = await this.genAI.models.list();
      return (
        pager.page.map((model: any) => model.name || "").filter(Boolean) || []
      );
    } catch (error) {
      throw new Error(`Failed to retrieve available models: ${error}`);
    }
  }

  /**
   * Cancel a video generation operation
   */
  async cancelVideoOperation(operationName: string): Promise<void> {
    try {
      // Note: The API doesn't provide a direct cancel method in the current types
      // This would need to be implemented when the API supports it
      throw new Error("Operation cancellation not yet supported by the API");
    } catch (error) {
      throw new Error(`Failed to cancel operation: ${error}`);
    }
  }

  /**
   * Get the status of a video generation operation
   */
  async getVideoOperationStatus(operationName: string): Promise<any> {
    try {
      // Create a mock operation to use as parameter
      const mockOperation = { name: operationName } as any;
      const operation = await this.genAI.operations.getVideosOperation({
        operation: mockOperation,
      });

      return {
        name: operation.name,
        done: operation.done,
        error: operation.error,
        metadata: operation.metadata,
        hasResponse: !!operation.response,
      };
    } catch (error) {
      throw new Error(`Failed to get operation status: ${error}`);
    }
  }

  /**
   * Estimate the cost for image generation
   */
  estimateImageCost(options: ImageGenerationOptions = {}): string {
    const { numberOfImages = 1, imageSize = "1K" } = options;

    // Rough cost estimates (these are example values, adjust based on actual pricing)
    const baseCostPer1K = 0.04; // $0.04 per 1K image
    const baseCostPer2K = 0.08; // $0.08 per 2K image

    const costPerImage = imageSize === "2K" ? baseCostPer2K : baseCostPer1K;
    const totalCost = numberOfImages * costPerImage;

    return `Estimated cost: $${totalCost.toFixed(
      4
    )} for ${numberOfImages} ${imageSize} image(s)`;
  }

  /**
   * Estimate the cost for video generation
   */
  estimateVideoCost(options: VideoGenerationOptions = {}): string {
    const {
      numberOfVideos = 1,
      durationSeconds = 5,
      resolution = "720p",
      generateAudio = false,
    } = options;

    // Rough cost estimates (these are example values, adjust based on actual pricing)
    const baseCostPer720pSecond = 0.1; // $0.10 per second for 720p
    const baseCostPer1080pSecond = 0.2; // $0.20 per second for 1080p
    const audioCostMultiplier = 1.5; // 50% more for audio

    const costPerSecond =
      resolution === "1080p" ? baseCostPer1080pSecond : baseCostPer720pSecond;
    let totalCost = numberOfVideos * durationSeconds * costPerSecond;

    if (generateAudio) {
      totalCost *= audioCostMultiplier;
    }

    return `Estimated cost: $${totalCost.toFixed(
      4
    )} for ${numberOfVideos} ${resolution} video(s) (${durationSeconds}s each)${
      generateAudio ? " with audio" : ""
    }`;
  }

  /**
   * Validate image generation options
   */
  validateImageOptions(options: ImageGenerationOptions): void {
    const {
      numberOfImages = 1,
      guidanceScale,
      outputCompressionQuality = 85,
      aspectRatio = "1:1",
      outputMimeType = "image/jpeg",
    } = options;

    if (numberOfImages < 1 || numberOfImages > 8) {
      throw new Error("numberOfImages must be between 1 and 8");
    }

    if (
      guidanceScale !== undefined &&
      (guidanceScale < 1 || guidanceScale > 20)
    ) {
      throw new Error("guidanceScale must be between 1 and 20");
    }

    if (outputCompressionQuality < 1 || outputCompressionQuality > 100) {
      throw new Error("outputCompressionQuality must be between 1 and 100");
    }

    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    if (!validAspectRatios.includes(aspectRatio)) {
      throw new Error(
        `aspectRatio must be one of: ${validAspectRatios.join(", ")}`
      );
    }

    const validMimeTypes = ["image/jpeg", "image/png"];
    if (!validMimeTypes.includes(outputMimeType)) {
      throw new Error(
        `outputMimeType must be one of: ${validMimeTypes.join(", ")}`
      );
    }
  }

  /**
   * Validate video generation options
   */
  validateVideoOptions(options: VideoGenerationOptions): void {
    const {
      numberOfVideos = 1,
      durationSeconds = 5,
      fps,
      aspectRatio = "16:9",
      resolution = "720p",
    } = options;

    if (numberOfVideos < 1 || numberOfVideos > 4) {
      throw new Error("numberOfVideos must be between 1 and 4");
    }

    if (durationSeconds < 2 || durationSeconds > 10) {
      throw new Error("durationSeconds must be between 2 and 10");
    }

    if (fps !== undefined && (fps < 8 || fps > 30)) {
      throw new Error("fps must be between 8 and 30");
    }

    const validAspectRatios = ["16:9", "9:16"];
    if (!validAspectRatios.includes(aspectRatio)) {
      throw new Error(
        `aspectRatio must be one of: ${validAspectRatios.join(", ")}`
      );
    }

    const validResolutions = ["720p", "1080p"];
    if (!validResolutions.includes(resolution)) {
      throw new Error(
        `resolution must be one of: ${validResolutions.join(", ")}`
      );
    }
  }
}

export interface ImageGenerationOptions {
  /** Aspect ratio of the generated images */
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  /** Number of images to generate (1-8) */
  numberOfImages?: number;
  /** Description of what to discourage in the generated images */
  negativePrompt?: string;
  /** Language of the text in the prompt */
  language?: ImagePromptLanguage;
  /** Controls how much the model adheres to the text prompt (1-20) */
  guidanceScale?: number;
  /** Random seed for image generation */
  seed?: number;
  /** Filter level for safety filtering */
  safetyFilterLevel?: SafetyFilterLevel;
  /** Allows generation of people by the model */
  personGeneration?: PersonGeneration;
  /** Whether to report the safety scores */
  includeSafetyAttributes?: boolean;
  /** Whether to include the RAI filter reason */
  includeRaiReason?: boolean;
  /** MIME type of the generated image */
  outputMimeType?: string;
  /** Compression quality (1-100) for JPEG images */
  outputCompressionQuality?: number;
  /** Whether to add a watermark */
  addWatermark?: boolean;
  /** Size of the largest dimension (1K, 2K) */
  imageSize?: string;
  /** Whether to use prompt rewriting logic */
  enhancePrompt?: boolean;
  /** Cloud Storage URI to store generated images */
  outputGcsUri?: string;
}

export interface VideoGenerationOptions {
  /** Number of videos to generate (1-4) */
  numberOfVideos?: number;
  /** Duration of the clip in seconds (2-10) */
  durationSeconds?: number;
  /** Aspect ratio of the generated video */
  aspectRatio?: "16:9" | "9:16";
  /** Resolution of the generated video */
  resolution?: "720p" | "1080p";
  /** Frames per second (8-30) */
  fps?: number;
  /** Random seed for video generation */
  seed?: number;
  /** Description of what to discourage in the generated videos */
  negativePrompt?: string;
  /** Whether to use prompt rewriting logic */
  enhancePrompt?: boolean;
  /** Whether to generate audio along with the video */
  generateAudio?: boolean;
  /** Person generation policy for videos */
  personGeneration?: string;
  /** Compression quality of the generated videos */
  compressionQuality?: VideoCompressionQuality;
  /** Cloud Storage URI to store generated videos */
  outputGcsUri?: string;
  /** Image to use as the last frame of generated videos.
   * Only supported for image to video use cases. */
  lastFrame?: Image;
  /** The images to use as the references to generate the videos.
   * If this field is provided, the text prompt field must also be provided.
   * Veo 2 supports up to 3 ASSET images or 1 STYLE image. */
  referenceImages?: VideoGenerationReferenceImage[];
}
