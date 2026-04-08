import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";

import {
  buildGoogleRequest,
  buildPromptWithAspect,
  extractInlineImageData,
  loadProjectDotEnv,
  parseArgs,
  parseDotEnv,
  parseSimpleYaml,
  resolveGenerationSettings,
} from "./generate.js";

test("parseArgs reads prompt files, refs, and output path", () => {
  const args = parseArgs([
    "--promptfile",
    "prompts/01.md",
    "--promptfile",
    "prompts/02.md",
    "--image",
    "images/02.png",
    "--ref",
    "images/01.png",
    "--provider",
    "google",
  ]);

  assert.deepEqual(args.promptFiles, ["prompts/01.md", "prompts/02.md"]);
  assert.deepEqual(args.referenceImages, ["images/01.png"]);
  assert.equal(args.outputPath, "images/02.png");
  assert.equal(args.provider, "google");
});

test("parseSimpleYaml reads nested image generation config", () => {
  const config = parseSimpleYaml(`---
version: "1.0"
style:
  preferred: none
image_generation:
  provider: google
  model: gemini-3.1-flash-image-preview
  quality: 2k
  aspect_ratio: 3:4
---`);

  assert.equal(config.version, "1.0");
  assert.equal(config.image_generation.provider, "google");
  assert.equal(config.image_generation.model, "gemini-3.1-flash-image-preview");
  assert.equal(config.image_generation.quality, "2k");
});

test("parseSimpleYaml ignores inline comments in EXTEND values", () => {
  const config = parseSimpleYaml(`---
image_generation:
  provider: google # google | auto
  model: "gemini-3.1-flash-image-preview" # default
---`);

  assert.equal(config.image_generation.provider, "google");
  assert.equal(config.image_generation.model, "gemini-3.1-flash-image-preview");
});

test("parseDotEnv reads quoted values and ignores comments", () => {
  const env = parseDotEnv(`
# comment
GEMINI_API_KEY="abc123"
GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image-preview # inline
export GOOGLE_BASE_URL=https://example.test
`);

  assert.equal(env.GEMINI_API_KEY, "abc123");
  assert.equal(env.GOOGLE_IMAGE_MODEL, "gemini-3.1-flash-image-preview");
  assert.equal(env.GOOGLE_BASE_URL, "https://example.test");
});

test("loadProjectDotEnv loads root .env without overriding existing env", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "xhs-image-env-"));

  try {
    await writeFile(
      path.join(tempDir, ".env"),
      'GEMINI_API_KEY="from-dotenv"\nGOOGLE_IMAGE_MODEL=gemini-3.1-flash-image-preview\n',
      "utf8",
    );

    const env = {
      GOOGLE_IMAGE_MODEL: "already-set",
    };

    const loadedPath = await loadProjectDotEnv({ cwd: tempDir, env });
    assert.equal(loadedPath, path.join(tempDir, ".env"));
    assert.equal(env.GEMINI_API_KEY, "from-dotenv");
    assert.equal(env.GOOGLE_IMAGE_MODEL, "already-set");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("resolveGenerationSettings supports GEMINI_API_KEY alias", () => {
  const previousGoogle = process.env.GOOGLE_API_KEY;
  const previousGemini = process.env.GEMINI_API_KEY;
  const previousGoogleImageModel = process.env.GOOGLE_IMAGE_MODEL;
  delete process.env.GOOGLE_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-key";
  delete process.env.GOOGLE_IMAGE_MODEL;

  try {
    const settings = resolveGenerationSettings(
      {
        provider: null,
        model: null,
        aspectRatio: null,
        quality: null,
      },
      {
        image_generation: {
          provider: "google",
          model: "gemini-3.1-flash-image-preview",
          quality: "normal",
          aspect_ratio: "1:1",
        },
      },
    );

    assert.equal(settings.provider, "google");
    assert.equal(settings.model, "gemini-3.1-flash-image-preview");
    assert.equal(settings.quality, "normal");
    assert.equal(settings.aspectRatio, "1:1");
    assert.equal(settings.apiKey, "gemini-key");
  } finally {
    if (previousGoogle === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previousGoogle;
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
    if (previousGoogleImageModel === undefined) delete process.env.GOOGLE_IMAGE_MODEL;
    else process.env.GOOGLE_IMAGE_MODEL = previousGoogleImageModel;
  }
});

test("resolveGenerationSettings prefers env model over EXTEND model", () => {
  const previousGoogle = process.env.GOOGLE_API_KEY;
  const previousGoogleImageModel = process.env.GOOGLE_IMAGE_MODEL;
  process.env.GOOGLE_API_KEY = "google-key";
  process.env.GOOGLE_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

  try {
    const settings = resolveGenerationSettings(
      {
        provider: null,
        model: null,
        aspectRatio: null,
        quality: null,
      },
      {
        image_generation: {
          provider: "google",
          model: "gemini-3.1-flash-image-preview",
          quality: "2k",
          aspect_ratio: "3:4",
        },
      },
    );

    assert.equal(settings.model, "gemini-3.1-flash-image-preview");
  } finally {
    if (previousGoogle === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previousGoogle;
    if (previousGoogleImageModel === undefined) delete process.env.GOOGLE_IMAGE_MODEL;
    else process.env.GOOGLE_IMAGE_MODEL = previousGoogleImageModel;
  }
});

test("buildPromptWithAspect appends aspect and 2k hint", () => {
  const prompt = buildPromptWithAspect("Hello world", "3:4", "2k");
  assert.match(prompt, /Aspect ratio: 3:4/);
  assert.match(prompt, /High resolution 2048px/);
});

test("buildGoogleRequest uses inline refs and image modality", () => {
  const request = buildGoogleRequest(
    "Prompt body",
    {
      aspectRatio: "3:4",
      quality: "2k",
    },
    [{ inlineData: { data: "abc", mimeType: "image/png" } }],
  );

  assert.equal(request.contents[0].parts[0].inlineData.data, "abc");
  assert.equal(request.generationConfig.responseModalities[0], "TEXT");
  assert.equal(request.generationConfig.responseModalities[1], "IMAGE");
  assert.equal(request.generationConfig.imageConfig.aspectRatio, "3:4");
  assert.equal(request.generationConfig.imageConfig.imageSize, "2K");
});

test("extractInlineImageData finds base64 output", () => {
  const imageData = extractInlineImageData({
    candidates: [
      {
        content: {
          parts: [{ inlineData: { data: "ZmFrZS1pbWFnZQ==" } }],
        },
      },
    ],
  });

  assert.equal(imageData, "ZmFrZS1pbWFnZQ==");
});
