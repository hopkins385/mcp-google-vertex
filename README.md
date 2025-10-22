# MCP Google Vertex AI Server

A Model Context Protocol (MCP) server that provides AI-powered image and video generation capabilities using Google Vertex AI's Imagen and Veo models.

## Features

- 🎨 **Image Generation**: Create AI images using Google's Imagen 3 model
- 🎬 **Video Generation**: Generate AI videos using Google's Veo model
- 💾 **Local Storage**: Automatically save generated content to local server storage
- 🔒 **Secure Configuration**: Environment-based configuration for API credentials
- 🚀 **Express v5**: Built on the latest Express framework
- 📝 **TypeScript**: Fully typed for better developer experience
- ♻️ **DRY Principles**: Clean, maintainable, and reusable code architecture

## Prerequisites

- Node.js 22.0.0 or higher
- Google Cloud Project with Vertex AI API enabled
- Service account credentials with appropriate permissions

## MCP Tools

### Generate Image

Generate AI images using the Imagen model.

**Parameters:**

- `prompt` (required): Text description of the image to generate
- `aspectRatio` (optional): Image aspect ratio (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`), default: `1:1`
- `imageSize` (optional): Image size (`1K`, `2K`), default: `1K`
- `outputMimeType` (optional): Output image format (`image/png`, `image/jpeg`), default: `image/jpeg`
- `negativePrompt` (optional): Things to avoid in the image

**Example:**

```json
{
  "name": "generate-image",
  "arguments": {
    "prompt": "A serene mountain landscape at sunset with a lake",
    "aspectRatio": "16:9"
  }
}
```

### Generate Video

Generate AI videos using the Veo model.

**Parameters:**

- `prompt` (required): Text description of the video to generate
- `duration` (optional): Video duration in seconds (4,6,8), default: 8
- `aspectRatio` (optional): Video aspect ratio (`16:9`, `9:16`)
- `resolution` (optional): Video resolution (`720p`, `1080p`)

**Example:**

```json
{
  "name": "generate-video",
  "arguments": {
    "prompt": "A butterfly flying through a garden of flowers",
    "duration": 8,
    "aspectRatio": "16:9",
    "resolution": "1080p"
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
      "args": [
        "mcp-remote",
        "http://localhost:3000/mcp"
      ]
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
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### MCP Inspector

Test your server with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Then connect to: `http://localhost:3000/mcp`

## Architecture

The server follows clean architecture principles with separation of concerns:

- **Config Layer**: Environment variable management and validation
- **Service Layer**: Vertex AI integration and storage management
- **Server Layer**: MCP protocol implementation and Express server setup
- **DRY Principles**: Reusable utilities and shared type definitions

## Error Handling

The server includes comprehensive error handling:

- Graceful error responses for tool invocations
- Detailed error messages for troubleshooting
- Proper HTTP status codes

## Performance Tips

- Generated files are cached locally to avoid redundant API calls
- Use appropriate aspect ratios and resolutions for your use case
- Monitor Vertex AI quotas and billing
- Consider implementing request queuing for high-traffic scenarios

## License

MIT

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [Google Vertex AI](https://cloud.google.com/vertex-ai)
- Uses [Express v5](https://expressjs.com/)
