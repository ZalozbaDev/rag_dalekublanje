import { OpenAIClient } from '@langchain/openai';
import { createLMStudioConfig } from 'ollama-api-facade-js';
import * as path from 'path';
import fs from 'fs';
import mdFiles from './owasp_vulns_order.json' with { type: 'json' };
import crypto from 'crypto';
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: 'http://192.168.178.80:6333',
});

const collectionName = 'vector-db-semantic-chunking-md';

await client.createCollection(collectionName, {
  vectors: {
    size: 768,
    distance: 'Cosine',
  },
});

// const openAiClient = new OpenAIClient(createLMStudioConfig());

const openAiClient = new OpenAIClient({
  apiKey: 'none', 
  baseURL: "http://192.168.178.80:1234/v1",
});

async function getEmbeddings(text) {
  const response = await openAiClient.embeddings.create({
    model: 'text-embedding-multilingual-e5-base',
    input: text,
    encoding_format: 'base64',
  });

  return response.data[0].embedding;
}

function normalizeText(text) {
  return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Deutscher Satzsegmentierer
const segmenter = new Intl.Segmenter('de', { granularity: 'sentence' });

function sentencesFromMarkdown(raw, filePath) {
  const normalized = normalizeText(raw);
  const segments = Array.from(segmenter.segment(normalized), (s) => s.segment);

  const sentencesWithMetadata = [];

  for (let i = 0; i < segments.length; i++) {
    sentencesWithMetadata.push({
      text: segments[i],
      metadata: {
        file: path.basename(filePath),
        fullPath: filePath,
        sentence_index: i,
      },
      embedding: [0],
    });
  }

  return sentencesWithMetadata;
}

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (magnitudeA * magnitudeB);
}

async function processMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // 1. Sätze aus dem MD Text bauen
  const sentencesWithMetadata = sentencesFromMarkdown(raw, filePath);

  // 2. Embeddings für jeden Satz erzeugen
  for await (const sentence of sentencesWithMetadata) {
    // Wenn du wirklich Calls sparen willst, kannst du hier wieder eine Längenprüfung einbauen
    sentence.embedding = await getEmbeddings(sentence.text);
  }

  // 3. Semantische Chunks bilden wie in deinem PDF Code
  const chunks = [];

  // diese einstellungen sind wichtig
  const similarityThreshold = 0.7;
  const maxChunkChars = 2200; // orientiert sich am tokenizer, damit die chunks nicht abgeschnitten werden (z.B. 512 Tokens für BERT-basierte Modelle)
  const minChunkChars = 90;

  let currentChunk = [];
  let currentMeta = [];
  let currentLength = 0;

  for (let i = 0; i < sentencesWithMetadata.length; i++) {
    const current = sentencesWithMetadata[i];
    const sentenceLength = current.text.length;

    const previous = i > 0 ? sentencesWithMetadata[i - 1] : null;
    const similarity = previous
      ? cosineSimilarity(current.embedding, previous.embedding)
      : 1;

    const similarityTooLow = similarity < similarityThreshold;
    const chunkTooLong = currentLength + sentenceLength > maxChunkChars;
    const hasMinimumLength = currentLength >= minChunkChars;

    if ((similarityTooLow && hasMinimumLength) || chunkTooLong) {
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join(' '),
          metadata: currentMeta,
        });
      }

      currentChunk = [];
      currentMeta = [];
      currentLength = 0;
    }

    currentChunk.push(current.text);
    currentMeta.push(current.metadata);
    currentLength += sentenceLength;
  }

  // Letzten Chunk übernehmen
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(' '),
      metadata: currentMeta,
    });
  }

  // 4. Chunks in den Vektor Index schreiben
  for await (const chunk of chunks) {
    await addItem(chunk);
  }
}

async function addItem(chunk) {
  const embedding = await getEmbeddings(chunk.text);

  const files = [...new Set(chunk.metadata.map(m => m.file))];
  const sentenceIndices = chunk.metadata.map(m => m.sentence_index);

  await client.upsert(collectionName, {
  points: [{
    id: crypto.randomUUID(),
    vector: embedding,
    payload: {
      text: chunk.text,
      files,
      sentence_indices: sentenceIndices,
    }
  }]
});
}

// Alle MD Dateien nacheinander verarbeiten
for (const file of mdFiles) {
  const absolutePath = file;

  console.log(`Verarbeite Markdown Datei: ${absolutePath}`);
  await processMarkdownFile(absolutePath);
}

console.log('Fertig mit semantischem Chunking für alle Markdown Dateien');
