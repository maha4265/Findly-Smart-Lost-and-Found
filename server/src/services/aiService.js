import fs from "fs/promises";
import sharp from "sharp";

export async function analyzeImage(filePath, category) {
  if (process.env.AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    return analyzeWithOpenAi(filePath, category);
  }

  return analyzeLocally(filePath, category);
}

async function analyzeWithOpenAi(filePath, category) {
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString("base64");
  const description = `Uploaded ${category} image prepared for visual matching.`;
  const embeddingText = `${category} ${description} image-bytes:${base64.slice(0, 2000)}`;
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: embeddingText }),
  });

  if (!response.ok) {
    throw new Error("OpenAI embedding request failed.");
  }

  const payload = await response.json();
  return {
    description,
    embedding: payload.data[0].embedding,
  };
}

async function analyzeLocally(filePath, category) {
  const { data } = await sharp(filePath)
    .resize(32, 32, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data);
  const coefficients = dct2d(pixels, 32);
  const lowFrequency = [];

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      lowFrequency.push(coefficients[y][x]);
    }
  }

  const comparisonCoefficients = lowFrequency.slice(1);
  const median = [...comparisonCoefficients].sort((a, b) => a - b)[Math.floor(comparisonCoefficients.length / 2)];
  const embedding = lowFrequency.map((value) => (value > median ? 1 : 0));
  const brightness = Math.round((pixels.reduce((sum, value) => sum + value, 0) / pixels.length / 255) * 100);
  const shade = brightness < 40 ? "dark" : brightness > 70 ? "light" : "mid-tone";

  return {
    description: `Likely ${shade} ${category} with perceptual image hash for visual similarity matching.`,
    embedding,
  };
}

function dct2d(pixels, size) {
  const coefficients = Array.from({ length: size }, () => Array(size).fill(0));

  for (let v = 0; v < size; v += 1) {
    for (let u = 0; u < size; u += 1) {
      let sum = 0;

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const pixel = pixels[y * size + x];
          sum +=
            pixel *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
        }
      }

      const alphaU = u === 0 ? 1 / Math.sqrt(size) : Math.sqrt(2 / size);
      const alphaV = v === 0 ? 1 / Math.sqrt(size) : Math.sqrt(2 / size);
      coefficients[v][u] = alphaU * alphaV * sum;
    }
  }

  return coefficients;
}
