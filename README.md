# MCP Google Vertex AI Server

A Model Context Protocol (MCP) server that provides AI-powered image and video generation capabilities using Google Vertex AI's Imagen and Veo models.

## Features

- 🎨 **Image Generation**: Create AI images using Google's Imagen model
- 🎬 **Video Generation**: Generate AI videos using Google's Veo model
- 💾 **Local Storage**: Automatically save generated content to local server storage
- 🔒 **Secure Configuration**: Environment-based configuration for API credentials
- 🚀 **Express v5**: Built on the latest Express framework
- 📝 **TypeScript**: Fully typed for better developer experience
- ♻️ **DRY Principles**: Clean, maintainable, and reusable code architecture

## Prerequisites

- Node.js 24.0.0 or higher
- Google Cloud Project with Vertex AI API enabled
- Service account credentials with appropriate permissions

## MCP Tools

### generate-image

Generate AI images using the configured Imagen model (set via `VERTEX_AI_IMAGE_MODEL`).

**Parameters:**

| Parameter        | Type                                        | Default     | Description                               |
| ---------------- | ------------------------------------------- | ----------- | ----------------------------------------- |
| `prompt`         | string                                      | required    | Text description of the image to generate |
| `numberOfImages` | number (1-8)                                | `1`         | Number of images to generate              |
| `aspectRatio`    | `1:1` \| `3:4` \| `4:3` \| `9:16` \| `16:9` | `1:1`       | Aspect ratio                              |
| `imageSize`      | `1K` \| `2K`                                | `2K`        | Output resolution                         |
| `outputMimeType` | `image/png` \| `image/jpeg`                 | `image/png` | Output format                             |
| `negativePrompt` | string                                      | —           | Things to avoid in the image              |
| `guidanceScale`  | number (1-20)                               | —           | How closely the model follows the prompt  |
| `seed`           | number                                      | —           | Random seed for reproducible results      |
| `enhancePrompt`  | boolean                                     | `false`     | Auto-enhance the prompt before generation |

**Example:**

```json
{
  "name": "generate-image",
  "arguments": {
    "prompt": "A serene mountain landscape at sunset with a lake",
    "aspectRatio": "16:9",
    "numberOfImages": 2
  }
}
```

### generate-video

Generate AI videos using the configured Veo model (set via `VERTEX_AI_VIDEO_MODEL`).

**Parameters:**

| Parameter         | Type                      | Default  | Description                                      |
| ----------------- | ------------------------- | -------- | ------------------------------------------------ |
| `prompt`          | string                    | required | Text description of the video to generate        |
| `numberOfVideos`  | number (1-4)              | `1`      | Number of videos to generate                     |
| `durationSeconds` | number (4-8)              | `8`      | Clip length in seconds (4, 6, or 8)              |
| `aspectRatio`     | `16:9` \| `9:16`          | `16:9`   | Aspect ratio                                     |
| `resolution`      | `720p` \| `1080p` \| `4K` | `1080p`  | Video resolution                                 |
| `seed`            | number                    | —        | Random seed for reproducible results             |
| `negativePrompt`  | string                    | —        | Things to avoid in the video                     |
| `enhancePrompt`   | boolean                   | `true`   | Auto-enhance the prompt before generation        |
| `generateAudio`   | boolean                   | `false`  | Generate audio alongside the video               |
| `lastFrame`       | string                    | —        | Image to use as the last frame (image-to-video)  |
| `referenceImages` | array                     | —        | Reference images to guide generation (see below) |

**Reference images** (provide either a local file path, Cloud Storage URI, or public URL):

- Local file path: `/path/to/image.png`
- Cloud Storage URI: `gs://my-bucket/image.jpg`
- Public URL: `https://cdn.example.com/image.jpg`

Supported formats: JPEG, PNG. Maximum size: 10 MB.

`referenceImages` supports up to 3 `ASSET` images or 1 `STYLE` image.

**Example — text to video:**

```json
{
  "name": "generate-video",
  "arguments": {
    "prompt": "A butterfly flying through a garden of flowers",
    "durationSeconds": 8,
    "aspectRatio": "16:9",
    "resolution": "1080p"
  }
}
```

**Example — image reference:**

```json
{
  "name": "generate-video",
  "arguments": {
    "prompt": "The product spinning on a white background",
    "referenceImages": [
      {
        "image": "/path/to/product.png",
        "referenceType": "ASSET"
      }
    ]
  }
}
```

## Connecting to MCP Clients

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-vertex": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3005/mcp"]
    }
  }
}
```

### VS Code

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "google-vertex": {
      "type": "http",
      "url": "http://localhost:3005/mcp"
    }
  }
}
```

### MCP Inspector

Test your server with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Then connect to: `http://localhost:3005/mcp`

## Architecture

The server follows clean architecture principles with separation of concerns:

- **Config Layer**: Environment variable management and validation
- **Service Layer**: Vertex AI integration and storage management
- **Tools Layer**: Shared utilities (e.g. reference image resolution)
- **Server Layer**: MCP protocol implementation and Express server setup

## Error Handling

The server includes comprehensive error handling:

- Graceful error responses for tool invocations
- Detailed error messages for troubleshooting
- Proper HTTP status codes

## Performance Tips

- Use appropriate aspect ratios and resolutions for your use case
- Monitor Vertex AI quotas and billing
- Consider implementing request queuing for high-traffic scenarios

## License

MIT

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [Google Vertex AI](https://cloud.google.com/vertex-ai)
- Uses [Express v5](https://expressjs.com/)
