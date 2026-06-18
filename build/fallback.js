/**
 * Deterministic fallback so the server NEVER returns an empty or generic
 * "sorry, I can't help" response, even with zero network access.
 * It produces a real, decisive, structured recommendation using a small
 * rules-based design-knowledge base keyed off the brief's keywords.
 */
const PALETTES = {
    food: {
        primary: ["#C1440E", "#F4E3B2"],
        secondary: ["#2E1503", "#7A9D54"],
        accent: ["#F2C572"],
        reasoning: "Warm terracotta and char-brown trigger appetite and craft/heritage cues; sage green signals freshness; gold accent reads as premium without veering luxury-cold.",
    },
    saas: {
        primary: ["#3B5BFE", "#0B0F19"],
        secondary: ["#E7EBFF", "#6E7891"],
        accent: ["#00D4B5"],
        reasoning: "Electric indigo signals trust + innovation typical of B2B SaaS; near-black grounds it as serious infrastructure; teal accent creates a single CTA focal color competitors in this space rarely use.",
    },
    startup: {
        primary: ["#111111", "#F7F5F2"],
        secondary: ["#5B5B5B"],
        accent: ["#FF4D2E"],
        reasoning: "Stark black/cream signals confidence and editorial credibility; a single hot accent isolates the CTA and brand mark so it survives compression on small screens.",
    },
    restaurant: {
        primary: ["#1F2A1A", "#E8DCC4"],
        secondary: ["#8B5E34"],
        accent: ["#C9A227"],
        reasoning: "Deep forest + bone cream reads as an elevated, ingredient-led kitchen; brass-gold accent implies craftsmanship and price point without ostentation.",
    },
    luxury: {
        primary: ["#0A0A0A", "#D4AF37"],
        secondary: ["#FFFFFF"],
        accent: ["#7A1F2B"],
        reasoning: "Black/gold is the category-default luxury code, used deliberately here, not generically; oxblood accent breaks the cliché just enough to be memorable.",
    },
    default: {
        primary: ["#1A1A2E", "#FFFFFF"],
        secondary: ["#4A4E69"],
        accent: ["#F2545B"],
        reasoning: "High-contrast navy/white base maximizes legibility across every export size; coral accent isolates the single most important interactive element.",
    },
};
function pickPalette(brief) {
    const b = brief.toLowerCase();
    if (/(restaurant|menu|cafe|bistro)/.test(b))
        return PALETTES.restaurant;
    if (/(food|kitchen|snack|beverage|drink|sauce|spice)/.test(b))
        return PALETTES.food;
    if (/(saas|app|software|platform|dashboard)/.test(b))
        return PALETTES.saas;
    if (/(luxury|premium|jewel|watch|couture)/.test(b))
        return PALETTES.luxury;
    if (/(startup|founder|pitch|venture)/.test(b))
        return PALETTES.startup;
    return PALETTES.default;
}
function detectDesignType(brief) {
    const b = brief.toLowerCase();
    if (/logo/.test(b))
        return "Logo / Brand Mark";
    if (/thumbnail/.test(b))
        return "Video Thumbnail";
    if (/(poster)/.test(b))
        return "Poster";
    if (/(flyer)/.test(b))
        return "Flyer";
    if (/(packaging|package|box|label)/.test(b))
        return "Product Packaging";
    if (/(app icon)/.test(b))
        return "App Icon";
    if (/(hero|landing page|website)/.test(b))
        return "Website Hero / Landing Page";
    if (/(social|instagram|post)/.test(b))
        return "Social Media Graphic";
    if (/(ad|advertisement|campaign)/.test(b))
        return "Advertisement";
    if (/(deck|presentation|slide)/.test(b))
        return "Presentation Visual";
    return "Brand Identity System";
}
export function buildFallbackBrief(brief, mode) {
    const palette = pickPalette(brief);
    const designType = detectDesignType(brief);
    return `# Project Understanding
- Design Type: ${designType}
- Industry: Inferred from brief keywords (see request mode: ${mode})
- Audience: General market consumers matching the brief's category conventions
- Goal: Drive recognition and the primary conversion action implied by the brief
- Brand Personality: Confident, modern, trustworthy
- Desired Emotion: Immediate trust paired with curiosity to engage further

# Creative Direction
A high-contrast, single-focal-point composition built around one dominant visual anchor (wordmark, hero product shot, or symbol), surrounded by generous negative space so the design reads instantly at both full size and thumbnail size. The system leans on a two-tone base with one isolated accent color reserved exclusively for the call-to-action or focal mark, ensuring the eye has exactly one place to land first.

## Visual Strategy
- Visual Style: Bold-minimal — flat color fields, no gradients, no drop shadows except a single soft contact shadow under the focal element.
- Design Language: Geometric structure with one organic/human accent (texture, photo, or illustrated detail) to avoid feeling sterile.
- Visual Hierarchy: Focal element (60% visual weight) -> headline/wordmark (25%) -> supporting copy or icon system (15%).
- Key Focus Element: The primary brand mark or hero subject, placed on the optical center (slightly above true center, per visual-weight convention).
- Supporting Elements: Thin rule lines or a single geometric shape (circle or angled bar) used consistently to frame the focal element without competing with it.

## Typography
- Font Style: A grotesque sans-serif (e.g., Inter, General Sans, or Neue Montreal) for primary type; one serif or display face reserved only for a single emphasis word if the brief implies heritage/premium positioning.
- Font Personality: Confident, contemporary, high-legibility at small sizes.
- Weight: Bold/Black (700-900) for the primary mark or headline; Regular/Medium (400-500) for supporting copy to create clear contrast in the hierarchy.
- Usage Recommendations: Never exceed two typefaces. Track headline letterspacing to 0 to -1%; body copy at 0 to +1% for readability at small sizes.

## Color System
- Primary Colors: ${palette.primary.join(", ")}
- Secondary Colors: ${palette.secondary.join(", ")}
- Accent Colors: ${palette.accent.join(", ")}
- Psychological Reasoning: ${palette.reasoning}

## Layout & Composition
12-column grid. Focal element occupies columns 3-10, vertically centered with a 5% upward bias from true center (this reads as more dynamic than dead-center placement). Headline sits directly below or beside the focal element on a single baseline, never wrapping more than two lines. CTA or logo lockup anchors the bottom-left or bottom-right corner inside an 8% margin safe zone on all sides to survive cropping on social platforms.

## Brand Psychology
Single dominant focal point plus one isolated accent color exploits the "von Restorff effect" — the one thing that looks different is the one thing remembered. The two-tone restrained palette signals confidence (categories with too many colors read as low-budget or indecisive). Generous negative space is read subconsciously as premium/quality, since cluttered compositions correlate with lower perceived price point in consumer testing.

# Production Specification
**Figma:** Build on a 1080x1080 (social) or 1920x1080 (hero) frame with an 8pt spacing grid. Create color styles for all five hex values above before placing any elements. Use Auto Layout for the text block so copy changes don't break alignment. Export focal element as a component for reuse across size variants.
**Canva:** Start from a blank custom-size design at the target output dimensions. Lock the brand colors into a custom palette first (Brand Kit if available). Use "Position > Align center" then nudge the focal element up using arrow keys (~5% of canvas height) to match the optical-center rule above.
**Photoshop:** Set up the canvas at 300 DPI for print or 72 DPI for digital. Use Smart Objects for the focal image so the composition stays non-destructive. Apply the single contact shadow via a clipped layer at 25% opacity, 0px spread, 8px blur, positioned directly beneath the focal element only.
**Illustrator:** Build the brand mark as a vector on a 100x100pt artboard first, test it at 16px to confirm small-size legibility before scaling up. Use the Pathfinder to keep all shapes boolean-clean for crisp scaling across every export size.

# AI Image Generation Prompts
**Flux:** "${designType}, ${palette.primary[0]} and ${palette.primary[1]} color palette with ${palette.accent[0]} accent, bold minimal composition, single dominant focal element centered with slight upward bias, generous negative space, flat color fields, soft single contact shadow, professional studio lighting, ultra-sharp focus, 8k commercial photography style, no text artifacts"
**GPT Image:** "A professional ${designType.toLowerCase()} design, color palette of ${palette.primary.join(" and ")} with a single ${palette.accent[0]} accent color, minimalist bold composition with one clear focal point, clean negative space, modern commercial design, high production value, crisp vector-clean edges"
**Midjourney:** "${designType.toLowerCase()}, ${palette.primary.join(" and ")} palette, ${palette.accent[0]} accent, bold minimal composition, single focal point, negative space, flat design, studio lighting --ar 1:1 --style raw --v 6"
**Ideogram:** "${designType} concept art, primary colors ${palette.primary.join(" and ")}, accent color ${palette.accent[0]}, minimal bold layout, one dominant focal element, clean professional commercial design, sharp clean vector edges, no clutter"
**Stable Diffusion:** "${designType.toLowerCase()}, ${palette.primary.join(" and ")} color scheme, ${palette.accent[0]} accent, bold minimal design, single focal point composition, professional commercial quality, clean flat color, sharp focus, 8k -- Negative prompt: clutter, multiple focal points, gradient noise, low contrast, blurry, watermark, text artifacts, busy background, mismatched colors"

# Variations
**Premium Version:** Shift primary palette toward near-black + a single metallic accent (gold or champagne), increase negative space by another 20%, swap grotesque sans for a refined serif on the headline only — signals higher price point through restraint, not embellishment.
**Minimal Version:** Strip to one color plus black/white, remove all supporting elements and rule lines, focal element and wordmark only — maximizes legibility at extreme small sizes (favicon, app icon, 1-inch print).
**High-Conversion Marketing Version:** Add a high-contrast CTA button in the accent color sized to occupy 8-10% of total canvas area, place urgency or benefit copy directly above the focal element, increase accent-color saturation by 10-15% to pull the eye to the action — optimized for ad placements where attention dwell time is under 2 seconds.

# Deliverable Checklist
- Primary file: master source file (.fig / .psd / .ai) with all color and text styles named
- Export set: PNG @1x/@2x/@3x for digital, PDF/X-1a for print if applicable
- Social crops: 1:1 (1080x1080), 4:5 (1080x1350), 9:16 (1080x1920), 16:9 (1920x1080)
- Favicon/app-icon set if a mark is involved: 16px, 32px, 180px, 512px, 1024px
- Style guide one-pager: color hex values, type specs, clear-space rule for the focal mark
- Source vector of any logo/mark element (.svg + .ai), black and white single-color versions included

---
*Note: This response was generated by DesignStudio MCP's local fallback engine because the Groq reasoning API was unavailable. It is a complete, decisive recommendation, not a placeholder — but for deeper competitor analysis or naming evaluation, restore GROQ_API_KEY connectivity for higher-fidelity reasoning.*`;
}
