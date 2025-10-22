# MCP Google Vertex AI Server

## Project Setup Checklist

- [x] Verify that the copilot-instructions.md file in the .github directory is created
- [x] Clarify Project Requirements - TypeScript MCP server for Google Vertex AI image/video generation
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions (none required)
- [x] Compile the Project
- [x] Create and Run Task
- [ ] Launch the Project
- [x] Ensure Documentation is Complete

## Project Summary

This is a fully functional MCP server for Google Vertex AI that provides:

- Image generation using Imagen 3 model
- Video generation using Veo model
- Local storage for generated content
- Environment-based configuration
- Express v5 HTTP transport
- Full TypeScript implementation
- DRY architecture with clean separation of concerns

To use this server:

1. Configure your `.env` file with Google Cloud credentials
2. Run `npm start` to launch the server
3. Connect via MCP clients (Claude Desktop, VS Code, etc.)
4. Use the `generate-image` and `generate-video` tools
