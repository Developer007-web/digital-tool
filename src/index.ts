#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { buildUserTask } from "./persona.js";
import { runWithFallback, runVisionAnalysis } from "./groqClient.js";
import { buildFallbackBrief } from "./fallback.js";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const DesignTypeEnum = z.enum([
  "logo",
  "brand_identity",
  "thumbnail",
  "poster",
  "flyer",
  "social_media_graphic",
  "advertisement",
  "product_packaging",
  "app_icon",
  "website_hero",
  "landing_page",
  "restaurant_branding",
  "food_brand",
  "kitchen_brand",
  "startup_brand",
  "saas_product",
  "ecommerce_creative",
  "presentation_visual",
  "marketing_asset",
  "auto",
]);

const CreateDesignConceptInput = z.object({
  design_type: DesignTypeEnum.describe(
    "The category of design being requested. Use 'auto' to let the director infer it from the brief."
  ),
  brief: z
    .string()
    .min(5)
    .describe(
      "The client's request in natural language: business description, audience, vibe, constraints, competitors, anything relevant."
    ),
  brand_name: z.string().optional().describe("Name of the brand/product, if known."),
  existing_colors: z
    .string()
    .optional()
    .describe("Existing brand colors to respect/incorporate, if any, as hex codes or names."),
});

const EvaluateNamesInput = z.object({
  candidate_names: z
    .array(z.string())
    .min(1)
    .describe("List of candidate brand/product names to evaluate."),
  industry: z.string().describe("Industry or category the name will operate in."),
  target_audience: z.string().optional().describe("Description of the target audience."),
});

const CompetitorAnalysisInput = z.object({
  competitor_names_or_urls: z
    .array(z.string())
    .min(1)
    .describe("Competitor brand names or URLs to analyze positioning/visual strategy against."),
  our_brief: z.string().describe("Brief describing the brand being positioned against these competitors."),
});

const AnalyzeImageInput = z.object({
  image_url: z
    .string()
    .describe(
      "Publicly accessible image URL or a base64 data URL (data:image/png;base64,...) of the design/logo/competitor asset to analyze."
    ),
  analysis_goal: z
    .string()
    .optional()
    .describe("What to extract: 'brand_elements', 'competitor_teardown', 'critique', or free text."),
});

const GeneratePromptSetInput = z.object({
  concept_description: z
    .string()
    .describe("Short description of the finalized visual concept to convert into AI image prompts."),
  platforms: z
    .array(z.enum(["flux", "gpt_image", "midjourney", "ideogram", "stable_diffusion"]))
    .optional()
    .describe("Which platforms to generate prompts for. Defaults to all five."),
});

// ---------------------------------------------------------------------------
// Tool definitions (MCP-facing metadata)
// ---------------------------------------------------------------------------

const TOOLS: Tool[] = [
  {
    name: "create_design_concept",
    description:
      "Acts as a senior creative director to produce a full production-ready design concept: project understanding, creative direction, visual strategy, typography, color system, layout, brand psychology, production specs for Figma/Canva/Photoshop/Illustrator, AI image prompts for 5 platforms, 3 variations, and a deliverable checklist. Use this as the primary tool for any logo, brand identity, thumbnail, poster, flyer, social graphic, ad, packaging, app icon, hero section, landing page, or marketing asset request.",
    inputSchema: {
      type: "object",
      properties: {
        design_type: {
          type: "string",
          enum: DesignTypeEnum.options,
          description:
            "The category of design being requested. Use 'auto' to let the director infer it from the brief.",
        },
        brief: {
          type: "string",
          description:
            "The client's request in natural language: business description, audience, vibe, constraints, competitors, anything relevant.",
        },
        brand_name: { type: "string", description: "Name of the brand/product, if known." },
        existing_colors: {
          type: "string",
          description: "Existing brand colors to respect/incorporate, if any.",
        },
      },
      required: ["design_type", "brief"],
    },
  },
  {
    name: "evaluate_brand_names",
    description:
      "Evaluates a list of candidate brand/product names for memorability, pronounceability, trademark-risk red flags, domain/social viability heuristics, and fit with the target industry and audience. Ranks them with reasoning.",
    inputSchema: {
      type: "object",
      properties: {
        candidate_names: {
          type: "array",
          items: { type: "string" },
          description: "List of candidate brand/product names to evaluate.",
        },
        industry: { type: "string", description: "Industry or category the name will operate in." },
        target_audience: { type: "string", description: "Description of the target audience." },
      },
      required: ["candidate_names", "industry"],
    },
  },
  {
    name: "competitor_visual_analysis",
    description:
      "Analyzes named competitors' visual/brand positioning (from names/URLs provided) and recommends how the user's brand should differentiate visually — color, typography, tone — to stand apart in the same category.",
    inputSchema: {
      type: "object",
      properties: {
        competitor_names_or_urls: {
          type: "array",
          items: { type: "string" },
          description: "Competitor brand names or URLs to analyze positioning/visual strategy against.",
        },
        our_brief: {
          type: "string",
          description: "Brief describing the brand being positioned against these competitors.",
        },
      },
      required: ["competitor_names_or_urls", "our_brief"],
    },
  },
  {
    name: "analyze_uploaded_image",
    description:
      "Uses a Groq vision model to analyze an uploaded image — a logo, brand asset, screenshot, or competitor packaging photo — and extracts brand elements (colors, typography style, composition, tone) or performs a design critique/teardown.",
    inputSchema: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "Publicly accessible image URL or base64 data URL of the asset to analyze.",
        },
        analysis_goal: {
          type: "string",
          description: "What to extract: 'brand_elements', 'competitor_teardown', 'critique', or free text.",
        },
      },
      required: ["image_url"],
    },
  },
  {
    name: "generate_ai_image_prompts",
    description:
      "Converts a finalized visual concept description into highly detailed, platform-optimized AI image generation prompts for Flux, GPT Image, Midjourney, Ideogram, and Stable Diffusion (including negative prompts).",
    inputSchema: {
      type: "object",
      properties: {
        concept_description: {
          type: "string",
          description: "Short description of the finalized visual concept to convert into AI image prompts.",
        },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["flux", "gpt_image", "midjourney", "ideogram", "stable_diffusion"] },
          description: "Which platforms to generate prompts for. Defaults to all five.",
        },
      },
      required: ["concept_description"],
    },
  },
];

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "designstudio-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

function textResult(content: string, warning?: string) {
  return {
    content: [
      ...(warning ? [{ type: "text" as const, text: `⚠️ ${warning}\n\n` }] : []),
      { type: "text" as const, text: content },
    ],
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_design_concept": {
        const input = CreateDesignConceptInput.parse(args);
        const briefText = [
          input.brand_name ? `Brand name: ${input.brand_name}` : null,
          input.existing_colors ? `Existing colors to respect: ${input.existing_colors}` : null,
          `Brief: ${input.brief}`,
        ]
          .filter(Boolean)
          .join("\n");

        const mode = input.design_type === "auto" ? "auto-detect from brief" : input.design_type;
        const task = buildUserTask(briefText, mode);

        const { text, usedGroq, warning } = await runWithFallback(task, () =>
          buildFallbackBrief(briefText, mode)
        );
        return textResult(text, usedGroq ? undefined : warning);
      }

      case "evaluate_brand_names": {
        const input = EvaluateNamesInput.parse(args);
        const task = `Evaluate the following candidate brand names for the "${input.industry}" industry${
          input.target_audience ? `, targeting: ${input.target_audience}` : ""
        }.

Candidates: ${input.candidate_names.join(", ")}

For each name, score (1-10) on: Memorability, Pronounceability, Visual/logo potential, Trademark-risk red flags (heuristic only, not legal advice), and Domain/social-handle viability (heuristic). Then rank all candidates from strongest to weakest with a one-line verdict for each, and declare a single winning recommendation with reasoning grounded in brand strategy, not generic praise.`;

        const { text, usedGroq, warning } = await runWithFallback(task, () => {
          const ranked = input.candidate_names
            .map(
              (n, i) =>
                `${i + 1}. **${n}** — Score: ${(7 - i * 0.3 < 0 ? 5 : 7 - i * 0.3).toFixed(
                  1
                )}/10. Short, check live domain/trademark availability manually before committing.`
            )
            .join("\n");
          return `# Brand Name Evaluation (local fallback — Groq unavailable)\n\nIndustry: ${input.industry}\n\n${ranked}\n\n**Recommendation:** ${input.candidate_names[0]} is the strongest default choice for first-syllable stress and visual-mark potential, but verify trademark and domain availability directly before final selection — this fallback evaluation is heuristic only.`;
        });
        return textResult(text, usedGroq ? undefined : warning);
      }

      case "competitor_visual_analysis": {
        const input = CompetitorAnalysisInput.parse(args);
        const task = `Perform a competitor visual/brand-positioning analysis.

Our brand brief: ${input.our_brief}

Competitors to analyze: ${input.competitor_names_or_urls.join(", ")}

For each competitor, infer their likely visual category codes (colors, typography style, tone) based on what is typical for that brand/category. Then identify the single biggest visual white space our brand can own to differentiate, and give a decisive recommendation: which color, typographic, and tonal direction we should take specifically BECAUSE competitors are NOT doing it.`;

        const { text, usedGroq, warning } = await runWithFallback(task, () =>
          `# Competitor Visual Analysis (local fallback — Groq unavailable)\n\nCompetitors listed: ${input.competitor_names_or_urls.join(
            ", "
          )}\n\nWithout live retrieval, the safest decisive move is to audit each competitor's homepage/packaging directly for: dominant color (most category leaders cluster on blue or green for trust/eco cues), typography (most use a humanist sans), and tone (most default to friendly/approachable copy). The single highest-leverage differentiation move available to most challengers in any category is choosing the ONE color and tone cluster competitors are avoiding — commonly: a confident, less "safe" accent color (e.g. a saturated warm tone in a category dominated by cool tones), paired with a more editorial, opinionated brand voice instead of generic friendliness.\n\n*For a precise, current teardown, restore GROQ_API_KEY connectivity or supply screenshots via analyze_uploaded_image.*`
        );
        return textResult(text, usedGroq ? undefined : warning);
      }

      case "analyze_uploaded_image": {
        const input = AnalyzeImageInput.parse(args);
        const goal = input.analysis_goal ?? "brand_elements";
        const instruction = `You are DesignStudio MCP's visual analysis module. Analyze this image for: ${goal}.

Extract and report concretely:
- Dominant and secondary colors (give approximate hex codes)
- Typography style observed (if any text/logotype is visible)
- Composition and layout pattern
- Apparent brand personality/tone conveyed
- One specific, decisive critique or improvement recommendation

Be specific and decisive, not generic.`;

        const result = await runVisionAnalysis(input.image_url, instruction);
        if (result.ok && result.text.trim()) {
          return textResult(result.text);
        }
        return textResult(
          `# Image Analysis Unavailable\n\nThe vision model call failed (${
            result.error ?? "unknown error"
          }). Recommendation: verify GROQ_API_KEY is set and that GROQ_VISION_MODEL points to a currently-available vision model, then retry. As a manual fallback, describe the image's dominant colors, typography, and composition in text and pass it to create_design_concept's "brief" field — the creative-direction tool will reason over that description directly.`,
          "Vision analysis call failed — see message body for remediation steps."
        );
      }

      case "generate_ai_image_prompts": {
        const input = GeneratePromptSetInput.parse(args);
        const platforms = input.platforms ?? [
          "flux",
          "gpt_image",
          "midjourney",
          "ideogram",
          "stable_diffusion",
        ];
        const task = `Convert this finalized visual concept into highly detailed, platform-optimized AI image generation prompts.

Concept: ${input.concept_description}

Generate one prompt for EACH of these platforms only: ${platforms.join(", ")}.
- For Midjourney, include --ar, --style, and --v flags.
- For Stable Diffusion, include a separate "Negative prompt:" line.
- Every prompt must be a single dense paragraph, highly specific about color (hex if relevant), lighting, composition, and style — no generic filler like "high quality" or "best quality" alone.`;

        const { text, usedGroq, warning } = await runWithFallback(task, () => {
          const lines = platforms.map((p) => {
            const label =
              p === "flux"
                ? "Flux"
                : p === "gpt_image"
                ? "GPT Image"
                : p === "midjourney"
                ? "Midjourney"
                : p === "ideogram"
                ? "Ideogram"
                : "Stable Diffusion";
            const tail =
              p === "midjourney"
                ? " --ar 1:1 --style raw --v 6"
                : p === "stable_diffusion"
                ? "\nNegative prompt: clutter, low contrast, blurry, watermark, extra limbs, text artifacts, mismatched colors"
                : "";
            return `**${label}:** "${input.concept_description}, bold minimal composition, single dominant focal point, professional commercial design, sharp clean edges, studio lighting, 8k"${tail}`;
          });
          return `# AI Image Prompts (local fallback — Groq unavailable)\n\n${lines.join("\n\n")}`;
        });
        return textResult(text, usedGroq ? undefined : warning);
      }

      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Tool execution error in "${name}": ${err?.message ?? String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DesignStudio MCP server running on stdio.");
}

main().catch((err) => {
  console.error("Fatal error starting DesignStudio MCP server:", err);
  process.exit(1);
});
