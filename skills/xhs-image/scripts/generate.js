import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PROVIDER = "google";
const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_ASPECT_RATIO = "3:4";
const DEFAULT_QUALITY = "2k";
const SUPPORTED_PROVIDER = new Set(["google", "auto"]);

function usage() {
  return `
Usage:
  node skills/xhs-image/scripts/generate.js --promptfile prompts/01-cover.md --image images/01-cover.png
  node skills/xhs-image/scripts/generate.js --prompt "A cute infographic" --image out.png --provider google
  node skills/xhs-image/scripts/generate.js --promptfile prompts/02.md --image images/02.png --ref images/01.png

Options:
  --prompt, -p        Inline prompt text
  --promptfile        Prompt file to read (repeatable)
  --image             Output image path (required)
  --ref               Reference image path (repeatable)
  --provider          google | auto (default: auto)
  --model, -m         Google image model (default: gemini-3.1-flash-image-preview)
  --ar                Aspect ratio hint appended to prompt (default: 3:4)
  --quality           normal | 2k (default: 2k)
  --json              Print JSON result
  --help, -h          Show this help

Environment:
  .env                Project-root .env is auto-loaded if present
  GOOGLE_API_KEY      Google AI API key
  GEMINI_API_KEY      Alias for GOOGLE_API_KEY
  GOOGLE_IMAGE_MODEL  Default model override
  GOOGLE_BASE_URL     Override Google API base URL
`.trim();
}

function expectValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

export function parseArgs(argv) {
  const args = {
    prompt: null,
    promptFiles: [],
    outputPath: null,
    referenceImages: [],
    provider: null,
    model: null,
    aspectRatio: null,
    quality: null,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--json") {
      args.json = true;
      continue;
    }

    if (token === "--prompt" || token === "-p") {
      args.prompt = expectValue(argv, i, token);
      i += 1;
      continue;
    }

    if (token === "--promptfile") {
      args.promptFiles.push(expectValue(argv, i, token));
      i += 1;
      continue;
    }

    if (token === "--image") {
      args.outputPath = expectValue(argv, i, token);
      i += 1;
      continue;
    }

    if (token === "--ref") {
      args.referenceImages.push(expectValue(argv, i, token));
      i += 1;
      continue;
    }

    if (token === "--provider") {
      const provider = expectValue(argv, i, token).toLowerCase();
      if (!SUPPORTED_PROVIDER.has(provider)) {
        throw new Error(
          `Unsupported provider: ${provider}. This minimal xhs-image backend currently supports only google.`,
        );
      }
      args.provider = provider;
      i += 1;
      continue;
    }

    if (token === "--model" || token === "-m") {
      args.model = expectValue(argv, i, token);
      i += 1;
      continue;
    }

    if (token === "--ar") {
      args.aspectRatio = expectValue(argv, i, token);
      i += 1;
      continue;
    }

    if (token === "--quality") {
      const quality = expectValue(argv, i, token);
      if (quality !== "normal" && quality !== "2k") {
        throw new Error(`Unsupported quality: ${quality}. Use normal or 2k.`);
      }
      args.quality = quality;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.help) {
    if (!args.prompt && args.promptFiles.length === 0) {
      throw new Error("Provide --prompt or at least one --promptfile.");
    }
    if (!args.outputPath) {
      throw new Error("Missing required --image output path.");
    }
  }

  return args;
}

function stripInlineComment(rawValue) {
  let inSingle = false;
  let inDouble = false;

  for (let index = 0; index < rawValue.length; index += 1) {
    const char = rawValue[index];
    const prev = index > 0 ? rawValue[index - 1] : "";

    if (char === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      continue;
    }

    if (char === "#" && !inSingle && !inDouble) {
      return rawValue.slice(0, index).trimEnd();
    }
  }

  return rawValue.trimEnd();
}

function parseScalar(rawValue) {
  const value = stripInlineComment(rawValue).trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value === "[]") return [];
  if (value === "{}") return {};
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => parseScalar(item));
  }
  return value;
}

export function extractFrontmatter(text) {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) {
    return text;
  }

  const lines = trimmed.split(/\r?\n/);
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) {
    return text;
  }

  return lines.slice(1, endIndex).join("\n");
}

export function parseSimpleYaml(source) {
  const yaml = extractFrontmatter(source);
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const match = trimmed.match(/^([^:]+):(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim();
    const rawValue = match[2];

    while (stack.length > 1 && indent <= stack.at(-1).indent) {
      stack.pop();
    }

    const parent = stack.at(-1).value;
    const value = rawValue.trim();

    if (!value) {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
      continue;
    }

    parent[key] = parseScalar(value);
  }

  return root;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseDotEnv(source) {
  const result = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice("export ".length) : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    const rawValue = normalized.slice(separatorIndex + 1).trim();
    const value = stripWrappingQuotes(stripInlineComment(rawValue).trim());
    result[key] = value;
  }

  return result;
}

export async function loadProjectDotEnv({
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  const dotEnvPath = path.join(cwd, ".env");
  if (!(await fileExists(dotEnvPath))) {
    return null;
  }

  const content = await readFile(dotEnvPath, "utf8");
  const parsed = parseDotEnv(content);
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in env)) {
      env[key] = value;
    }
  }
  return dotEnvPath;
}

export async function loadExtendConfig({
  cwd = process.cwd(),
  home = os.homedir(),
} = {}) {
  const candidates = [
    path.join(cwd, ".xhs-image", "EXTEND.md"),
    path.join(home, ".xhs-image", "EXTEND.md"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      const content = await readFile(candidate, "utf8");
      return { path: candidate, config: parseSimpleYaml(content) };
    }
  }

  return { path: null, config: {} };
}

function getGoogleApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

export function resolveGenerationSettings(args, extendConfig = {}) {
  const imageGeneration = extendConfig.image_generation || {};
  const requestedProvider = args.provider || imageGeneration.provider || DEFAULT_PROVIDER;
  const normalizedProvider = String(requestedProvider).toLowerCase();

  if (!SUPPORTED_PROVIDER.has(normalizedProvider)) {
    throw new Error(
      `Unsupported provider in EXTEND.md: ${requestedProvider}. This minimal backend currently supports only google.`,
    );
  }

  const provider = normalizedProvider === "auto" ? DEFAULT_PROVIDER : normalizedProvider;
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY or GEMINI_API_KEY is required for xhs-image Google generation.",
    );
  }

  return {
    provider,
    apiKey,
    model:
      args.model ||
      process.env.GOOGLE_IMAGE_MODEL ||
      imageGeneration.model ||
      DEFAULT_MODEL,
    aspectRatio: args.aspectRatio || imageGeneration.aspect_ratio || DEFAULT_ASPECT_RATIO,
    quality: args.quality || imageGeneration.quality || DEFAULT_QUALITY,
  };
}

export async function readPrompt(args) {
  const chunks = [];
  if (args.prompt) {
    chunks.push(args.prompt.trim());
  }

  for (const promptFile of args.promptFiles) {
    const absolutePath = path.resolve(promptFile);
    const content = await readFile(absolutePath, "utf8");
    chunks.push(content.trim());
  }

  const prompt = chunks.filter(Boolean).join("\n\n").trim();
  if (!prompt) {
    throw new Error("Prompt content is empty after reading input.");
  }
  return prompt;
}

export async function validateReferenceImages(referenceImages) {
  for (const refPath of referenceImages) {
    const absolutePath = path.resolve(refPath);
    try {
      await access(absolutePath);
    } catch {
      throw new Error(`Reference image not found: ${absolutePath}`);
    }
  }
}

function normalizeGoogleModelId(model) {
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

function getGoogleBaseUrl() {
  const base =
    process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com";
  return base.replace(/\/+$/g, "");
}

function buildGoogleUrl(model) {
  return `${getGoogleBaseUrl()}/v1beta/models/${normalizeGoogleModelId(model)}:generateContent`;
}

function getGoogleImageSize(quality) {
  return quality === "2k" ? "2K" : "1K";
}

export function buildPromptWithAspect(prompt, aspectRatio, quality) {
  let result = prompt.trim();
  if (aspectRatio && !/aspect ratio:/i.test(result)) {
    result += `\n\nAspect ratio: ${aspectRatio}.`;
  }
  if (quality === "2k" && !/high resolution 2048px/i.test(result)) {
    result += "\nHigh resolution 2048px.";
  }
  return result;
}

async function readImageAsBase64(filePath) {
  const buffer = await readFile(path.resolve(filePath));
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  if (ext === ".webp") mimeType = "image/webp";
  if (ext === ".gif") mimeType = "image/gif";
  return { data: buffer.toString("base64"), mimeType };
}

export function buildGoogleRequest(prompt, settings, inlineRefs = []) {
  const parts = [...inlineRefs, { text: buildPromptWithAspect(prompt, settings.aspectRatio, settings.quality) }];
  return {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: settings.aspectRatio,
        imageSize: getGoogleImageSize(settings.quality),
      },
    },
  };
}

export function extractInlineImageData(response) {
  for (const candidate of response?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.inlineData?.data === "string" && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
  }
  return null;
}

async function postGoogleJson(url, apiKey, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function generateGoogleImage({ prompt, settings, referenceImages }) {
  const inlineRefs = [];
  for (const referenceImage of referenceImages) {
    const { data, mimeType } = await readImageAsBase64(referenceImage);
    inlineRefs.push({
      inlineData: {
        data,
        mimeType,
      },
    });
  }

  const requestBody = buildGoogleRequest(prompt, settings, inlineRefs);
  const response = await postGoogleJson(
    buildGoogleUrl(settings.model),
    settings.apiKey,
    requestBody,
  );
  const imageData = extractInlineImageData(response);
  if (!imageData) {
    throw new Error("Google API response did not contain inline image data.");
  }
  return Buffer.from(imageData, "base64");
}

export async function run(args, options = {}) {
  const cwd = options.cwd || process.cwd();
  const dotEnvPath = await loadProjectDotEnv({ cwd, env: process.env });
  const { path: extendPath, config: extendConfig } = await loadExtendConfig(options);
  const settings = resolveGenerationSettings(args, extendConfig);
  await validateReferenceImages(args.referenceImages);
  const prompt = await readPrompt(args);
  const imageBuffer = await generateGoogleImage({
    prompt,
    settings,
    referenceImages: args.referenceImages,
  });

  const outputPath = path.resolve(args.outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, imageBuffer);

  return {
    provider: settings.provider,
    model: settings.model,
    aspectRatio: settings.aspectRatio,
    quality: settings.quality,
    outputPath,
    promptFiles: args.promptFiles.map((file) => path.resolve(file)),
    referenceImages: args.referenceImages.map((file) => path.resolve(file)),
    extendPath,
    dotEnvPath,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const result = await run(args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Generated image with ${result.provider} / ${result.model}`);
  if (result.extendPath) {
    console.log(`Loaded preferences: ${result.extendPath}`);
  } else {
    console.log("Loaded preferences: none");
  }
  if (result.dotEnvPath) {
    console.log(`Loaded env: ${result.dotEnvPath}`);
  } else {
    console.log("Loaded env: none");
  }
  console.log(`Saved image: ${result.outputPath}`);
}

const entryHref = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entryHref && import.meta.url === entryHref) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
