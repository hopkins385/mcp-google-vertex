import { Image } from '@google/genai';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';

// Max allowed image file size for Vertex AI reference images
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function mimeFromExtension(filePath: string): string {
  const ext = extname(filePath.split('?')[0]).toLowerCase();
  const mime = MIME_BY_EXTENSION[ext];
  if (!mime) {
    throw new Error(
      `Unsupported image format "${ext}". Supported formats: ${Object.keys(MIME_BY_EXTENSION).join(
        ', ',
      )}`,
    );
  }
  return mime;
}

/**
 * Resolves a reference image string to a Google GenAI Image object.
 *
 * - `gs://bucket/path`   → GCS URI, passed through directly
 * - `http(s)://...`      → downloaded, MIME type inferred from URL extension
 * - anything else        → treated as a local file path, read and base64-encoded
 *
 * Supported formats: JPEG, PNG. Maximum file size / download size: 10 MB.
 */
export async function resolveReferenceImage(input: string): Promise<Image> {
  if (input.startsWith('gs://')) {
    return { gcsUri: input };
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const mimeType = mimeFromExtension(input);
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to download image from URL (${response.status}): ${input}`);
    }
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (contentLength / 1024 / 1024).toFixed(2);
      throw new Error(`Remote image exceeds the 10 MB limit (${sizeMB} MB): ${input}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
      throw new Error(`Remote image exceeds the 10 MB limit (${sizeMB} MB): ${input}`);
    }
    return {
      imageBytes: Buffer.from(arrayBuffer).toString('base64'),
      mimeType,
    };
  }

  // Local file path
  const mimeType = mimeFromExtension(input);
  const fileStat = await stat(input);
  if (fileStat.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (fileStat.size / 1024 / 1024).toFixed(2);
    throw new Error(`Image file exceeds the 10 MB limit (${sizeMB} MB): ${input}`);
  }
  const fileBuffer = await readFile(input);
  return {
    imageBytes: fileBuffer.toString('base64'),
    mimeType,
  };
}
