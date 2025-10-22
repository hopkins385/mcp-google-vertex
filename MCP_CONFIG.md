# MCP Server Configuration for Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Option 0: Using npx mcp-remote

```json
{
  "mcpServers": {
    "google-vertex-ai": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3005/mcp"]
    }
  }
}
```

## Option 1: Direct Node.js (Recommended)

```json
{
  "mcpServers": {
    "google-vertex-ai": {
      "command": "node",
      "args": ["/Users/sven/var/mcp/mcp-google-vertex/build/index.js"],
      "env": {
        "GOOGLE_API_KEY": "your-api-key-here",
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1"
      }
    }
  }
}
```

**Note**: Update the path in `args` to match your actual installation directory.

## Option 2: Docker with stdio

```json
{
  "mcpServers": {
    "google-vertex-ai": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--env-file",
        "/Users/sven/var/mcp/mcp-google-vertex/.env",
        "mcp-google-vertex:latest"
      ]
    }
  }
}
```

Before using the Docker version, build the image:

```bash
cd /Users/sven/var/mcp/mcp-google-vertex
docker build -t mcp-google-vertex .
```

## Option 3: HTTP Server Mode (for testing/debugging)

To run as an HTTP server (not for Claude Desktop):

```bash
# Set up .env file first, then:
docker-compose up -d

# Or without Docker:
npm run build
npm start
```

Access the server at `http://localhost:3005/mcp` (or your configured PORT)
