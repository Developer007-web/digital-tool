# DesignStudio MCP

An MCP server implementing an AI creative-director persona: produces full
production-ready design concepts, evaluates brand names, runs competitor
visual analysis, analyzes uploaded images via a Groq vision model, and
generates platform-specific AI image prompts (Flux, GPT Image, Midjourney,
Ideogram, Stable Diffusion).

## Setup

```bash
npm install
npm run build
```

Set `GROQ_API_KEY` in your environment (see `.env.example`). Get a key at
https://console.groq.com. The server works without a key too — every tool
falls back to a deterministic, decisive local recommendation engine instead
of failing or returning a generic refusal.

## Connect to an MCP client (e.g. Claude Desktop)

Add to your client's MCP config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "designstudio": {
      "command": "node",
      "args": ["/absolute/path/to/designstudio-mcp/build/index.js"],
      "env": {
        "GROQ_API_KEY": "your_groq_api_key_here"
      }
    }
  }
}
```

## Tools exposed

- `create_design_concept` — full creative-director output (the main tool)
- `evaluate_brand_names` — scores/ranks candidate brand names
- `competitor_visual_analysis` — visual differentiation strategy vs named competitors
- `analyze_uploaded_image` — Groq vision analysis of an uploaded logo/asset/screenshot
- `generate_ai_image_prompts` — platform-specific AI image prompts from a finalized concept

## Notes on scope

This is a real MCP server (stdio transport, validated against the MCP
protocol). It does NOT render actual images — "AI image generation" tools
here return optimized *prompts* for you to paste into Flux/Midjourney/etc.
Wiring direct image generation would require separate API keys per image
provider and is a natural next extension (see `groqClient.ts` for the
pattern to follow).
