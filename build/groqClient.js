import Groq from "groq-sdk";
import { DESIGNSTUDIO_PERSONA } from "./persona.js";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Text-reasoning model: fast + strong instruction following.
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
// Vision-capable model for image/screenshot analysis.
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "llama-3.2-90b-vision-preview";
let client = null;
function getClient() {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not set. Add it to your MCP server's env config to enable Groq-powered reasoning.");
    }
    if (!client) {
        client = new Groq({ apiKey: GROQ_API_KEY });
    }
    return client;
}
/**
 * Core text reasoning call. Used for the full creative-direction output,
 * naming evaluation, competitor analysis, etc.
 */
export async function runDesignReasoning(userTask, opts = {}) {
    try {
        const groq = getClient();
        const completion = await groq.chat.completions.create({
            model: TEXT_MODEL,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.maxTokens ?? 4096,
            messages: [
                { role: "system", content: opts.systemOverride ?? DESIGNSTUDIO_PERSONA },
                { role: "user", content: userTask },
            ],
        });
        const text = completion.choices[0]?.message?.content ?? "";
        return { ok: true, text };
    }
    catch (err) {
        return {
            ok: false,
            text: "",
            error: err?.message ?? String(err),
        };
    }
}
/**
 * Vision call for analyzing an uploaded image (logo, screenshot, competitor
 * packaging photo, etc). Image must be passed as a data URL or public URL.
 */
export async function runVisionAnalysis(imageUrlOrDataUrl, instruction) {
    try {
        const groq = getClient();
        const completion = await groq.chat.completions.create({
            model: VISION_MODEL,
            temperature: 0.4,
            max_tokens: 2048,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: instruction },
                        { type: "image_url", image_url: { url: imageUrlOrDataUrl } },
                    ],
                },
            ],
        });
        const text = completion.choices[0]?.message?.content ?? "";
        return { ok: true, text };
    }
    catch (err) {
        return {
            ok: false,
            text: "",
            error: err?.message ?? String(err),
        };
    }
}
/**
 * Wraps a Groq call so a tool ALWAYS returns a usable recommendation,
 * even if the API key is missing or the call fails — per the
 * "Return the best recommendation even if a tool fails" rule.
 */
export async function runWithFallback(userTask, fallbackBuilder, opts = {}) {
    const result = await runDesignReasoning(userTask, opts);
    if (result.ok && result.text.trim().length > 0) {
        return { text: result.text, usedGroq: true };
    }
    return {
        text: fallbackBuilder(),
        usedGroq: false,
        warning: `Groq reasoning unavailable (${result.error ?? "empty response"}). Returned a locally-generated baseline recommendation instead.`,
    };
}
