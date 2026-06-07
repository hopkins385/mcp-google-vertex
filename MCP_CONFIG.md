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
