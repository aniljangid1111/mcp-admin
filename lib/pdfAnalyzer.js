import { extractText } from "unpdf";

/**
 * Extracts and structures product & battery specifications from a PDF buffer.
 * Built with `unpdf` to work reliably across Next.js Turbopack, Node, and Serverless.
 * @param {Buffer|Uint8Array} buffer - The PDF file buffer
 * @returns {Promise<{ pdfText: string, specifications: string, fullAnalysis: string, summary: string, metadata: object }>}
 */
export async function extractPdfSpecs(buffer) {
  try {
    const uint8 = buffer instanceof Uint8Array
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);

    const result = await extractText(uint8);

    // unpdf returns text either as string or array of page strings
    const pages = Array.isArray(result.text)
      ? result.text
      : typeof result.text === "string"
      ? [result.text]
      : [];

    const totalPages = result.totalPages || pages.length || 1;

    // Clean text per page
    const cleanedPages = pages
      .map((p) => (typeof p === "string" ? p.trim() : ""))
      .filter(Boolean);

    const fullCleanText = cleanedPages.join("\n\n---\n\n");

    // Detect if this is a catalog with multiple items or a single product sheet
    const structuredAnalysis = analyzeBatteryDocument(cleanedPages, fullCleanText);

    return {
      pdfText: fullCleanText,
      specifications: structuredAnalysis.specifications,
      fullAnalysis: structuredAnalysis.fullFormattedText,
      summary: structuredAnalysis.summary,
      metadata: {
        totalPages,
        detectedItemsCount: structuredAnalysis.items.length,
      },
    };
  } catch (error) {
    console.error("Error in extractPdfSpecs with unpdf:", error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}

/**
 * Analyzes battery pages, extracting models, specs, features, and applications
 */
function analyzeBatteryDocument(pages, fullText) {
  const items = [];

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i];
    const item = parsePageBatteryDetails(pageText, i + 1);
    if (item) {
      items.push(item);
    }
  }

  let specifications = "";
  let fullFormattedText = "";
  let summary = "";

  if (items.length > 0) {
    const specSections = [];
    const fullSections = [];

    for (const it of items) {
      specSections.push(formatItemSpecifications(it));
      fullSections.push(formatItemFullContent(it));
    }

    specifications = specSections.join("\n\n");
    fullFormattedText = fullSections.join("\n\n---\n\n");
    summary = `Catalog containing ${items.length} battery models: ${items.map(it => it.title).slice(0, 4).join(", ")}${items.length > 4 ? "..." : ""}`;
  } else {
    // Single general product or generic text fallback
    specifications = extractKeyAttributesFromText(fullText);
    fullFormattedText = fullText;
    summary = fullText.slice(0, 120);
  }

  return {
    items,
    specifications,
    fullFormattedText,
    summary,
  };
}

/**
 * Extracts a specific section from text based on section header
 */
function extractSection(text, header) {
  const rx = new RegExp(`(?:^|\\n)${header}\\s*\\n+([\\s\\S]*?)(?=(?:\\n[A-Z &/:–-]{3,30}\\s*\\n|$))`, "i");
  const m = text.match(rx);
  return m ? m[1].trim() : null;
}

/**
 * Parses a page for battery model name, description, specs, and suitable uses
 */
function parsePageBatteryDetails(pageText, pageNum) {
  // Check if page contains battery specifications
  const hasVoltageOrCapacity = /VOLTAGE\s+AND\s+CAPACITY|STORAGE\s+CAPACITY|LIFESPAN|DISCHARGE/i.test(pageText);
  if (!hasVoltageOrCapacity) {
    return null;
  }

  // Find model title: look for DAKOTA LITHIUM or battery model headings
  let title = null;
  const titleMatch = pageText.match(/DAKOTA\s+LITHIUM\s+[^\n]+(?:BATTERY|POWERBOX\s*\d+)/i)
    || pageText.match(/(?:DAKOTA\s+LITHIUM\s+[^.\n]{5,50}|MODEL\s*:[^\n]+)/i);

  if (titleMatch) {
    title = titleMatch[0].trim().replace(/\s+/g, " ");
  }

  const vc = extractSection(pageText, "VOLTAGE AND CAPACITY");
  const size = extractSection(pageText, "SIZE") || extractSection(pageText, "DIMENSIONS");
  const weight = extractSection(pageText, "WEIGHT");
  const storageCapacity = extractSection(pageText, "STORAGE CAPACITY") || extractSection(pageText, "CAPACITY");
  const lifespan = extractSection(pageText, "LIFESPAN/LIFECYCLES") || extractSection(pageText, "BATTERY LIFESPAN (LIFECYCLES)");
  const discharge = extractSection(pageText, "DISCHARGE");
  const charge = extractSection(pageText, "CHARGE");
  const operatingTemp = extractSection(pageText, "OPERATING TEMPERATURE");
  const safeReliable = extractSection(pageText, "SAFE & RELIABLE");

  if (!title) {
    title = vc ? `Battery ${vc}` : `Battery Model (Page ${pageNum})`;
  }

  // Extract Suitable for / Applications
  let suitableFor = [];
  const suitableText = extractSection(pageText, "SUITABLE FOR:") || extractSection(pageText, "SPECIFICATIONS:");
  if (suitableText) {
    suitableFor = suitableText
      .split("\n")
      .map(s => s.replace(/^[•\s*-]+/, "").trim())
      .filter(s => s.length > 2 && !/^(SUITABLE|SPECIFICATIONS|200%|DAKOTA)/i.test(s));
  }

  // Extract description paragraphs
  const paragraphs = pageText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 50 && !p.includes("VOLTAGE AND CAPACITY") && !p.includes("SUITABLE FOR") && !p.includes("SPECIFICATIONS:"));

  const description = paragraphs[0] ? paragraphs[0].replace(/\n+/g, " ") : "";

  return {
    title,
    description,
    voltageCapacity: vc ? vc.replace(/\n+/g, " ") : null,
    size: size ? size.replace(/\n+/g, " ") : null,
    weight: weight ? weight.replace(/\n+/g, " ") : null,
    storageCapacity: storageCapacity ? storageCapacity.replace(/\n+/g, " ") : null,
    lifespan: lifespan ? lifespan.replace(/\n+/g, " ") : null,
    discharge: discharge ? discharge.replace(/\n+/g, " ") : null,
    charge: charge ? charge.replace(/\n+/g, " ") : null,
    operatingTemp: operatingTemp ? operatingTemp.replace(/\n+/g, " ") : null,
    safeReliable: safeReliable ? safeReliable.replace(/\n+/g, " ") : null,
    suitableFor,
  };
}

/**
 * Formats an item into markdown specifications
 */
function formatItemSpecifications(item) {
  const lines = [`### ${item.title}`];

  if (item.voltageCapacity) lines.push(`- **Rated Voltage & Capacity:** ${item.voltageCapacity}`);
  if (item.storageCapacity) lines.push(`- **Storage Capacity:** ${item.storageCapacity}`);
  if (item.lifespan) lines.push(`- **Cycle Life / Lifespan:** ${item.lifespan}`);
  if (item.discharge) lines.push(`- **Discharge Rate:** ${item.discharge}`);
  if (item.charge) lines.push(`- **Charging Rate:** ${item.charge}`);
  if (item.operatingTemp) lines.push(`- **Operating Temperature:** ${item.operatingTemp}`);
  if (item.size) lines.push(`- **Dimensions / Size:** ${item.size}`);
  if (item.weight) lines.push(`- **Weight:** ${item.weight}`);
  if (item.safeReliable) lines.push(`- **BMS Protection:** ${item.safeReliable}`);

  if (item.suitableFor && item.suitableFor.length > 0) {
    lines.push(`- **Suitable Applications:** ${item.suitableFor.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Formats an item into rich product content
 */
function formatItemFullContent(item) {
  const lines = [`## ${item.title}`];

  if (item.description) {
    lines.push("");
    lines.push(item.description);
  }

  lines.push("");
  lines.push("### Technical Specifications:");
  if (item.voltageCapacity) lines.push(`- **Voltage and Capacity:** ${item.voltageCapacity}`);
  if (item.storageCapacity) lines.push(`- **Storage Capacity:** ${item.storageCapacity}`);
  if (item.size) lines.push(`- **Dimensions:** ${item.size}`);
  if (item.weight) lines.push(`- **Weight:** ${item.weight}`);
  if (item.lifespan) lines.push(`- **Lifespan / Cycles:** ${item.lifespan}`);
  if (item.discharge) lines.push(`- **Discharge:** ${item.discharge}`);
  if (item.charge) lines.push(`- **Charge:** ${item.charge}`);
  if (item.operatingTemp) lines.push(`- **Operating Temperature:** ${item.operatingTemp}`);
  if (item.safeReliable) lines.push(`- **Safety & BMS:** ${item.safeReliable}`);

  if (item.suitableFor && item.suitableFor.length > 0) {
    lines.push("");
    lines.push("### Suitable Applications:");
    for (const app of item.suitableFor) {
      lines.push(`• ${app}`);
    }
  }

  return lines.join("\n");
}

function extractKeyAttributesFromText(text) {
  const lines = ["### Product Specifications"];
  const matches = text.match(/(?:[A-Za-z\s]+):\s*[^\n]+/g) || [];
  for (const m of matches.slice(0, 25)) {
    lines.push(`- ${m.trim()}`);
  }
  return lines.join("\n");
}
