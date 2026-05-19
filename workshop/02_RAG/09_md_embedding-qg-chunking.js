import { OpenAIClient, ChatOpenAI } from '@langchain/openai';
import { createLMStudioConfig } from 'ollama-api-facade-js';
import * as path from 'path';
import fs from 'fs';
import mdFiles from './owasp_vulns_order.json' with { type: 'json' };
import crypto from 'crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// ============================================================================
// Qdrant Setup
// ============================================================================

//const client = new QdrantClient({
//  url: 'http://localhost:6333',
//});
const client = new QdrantClient({
  url: 'http://192.168.178.80:6333',
});

const collectionName = 'vector-db-qg-chunking-md';

await client.createCollection(collectionName, {
  vectors: {
    size: 768,
    distance: 'Cosine',
  },
});

// ============================================================================
// OpenAI Client für Embeddings
// ============================================================================

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

// ============================================================================
// Text Vorverarbeitung und Satz Segmentierung
// ============================================================================

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

// ============================================================================
// Cosine Similarity
// ============================================================================

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// ============================================================================
// Frage Prompt und LLM Setup wie im PDF Code
// ============================================================================

// Proxy und TLS für LM Studio
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
setGlobalDispatcher(new ProxyAgent('http://localhost:8080'));

const chatOpenAI = new ChatOpenAI({
  ...createLMStudioConfig(),
  model: 'qwen/qwen3-4b-2507',
  streaming: false,
  configuration: {
    baseURL: 'http://192.168.178.80:1234/v1'
  },
});

const prompt = PromptTemplate.fromTemplate(`Du bist ein deutscher Fachexperte für die OWASP Top 10 für LLMs Applications.
Erstelle **bis zu 3** prägnante, unterschiedliche Fragen, die sich **direkt und eindeutig** aus dem folgenden Text beantworten lassen.
 - Stil: sachlich, Fragewörter: Was | Warum | Welche | Wie | Ab wann | Für wen
 - Keine Ja/Nein -Fragen, keine „Welche Auswirkungen …”.

Gib **nur** ein JSON-Array im folgenden Format ohne zusätzliche Erklärungen zurück:

{{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {{
    "type": "object",
    "properties": {{
      "question": {{
        "type": "string"
      }}
    }},
    "required": ["question"],
    "additionalProperties": false
  }}
}}

Text:
"{chunk}"`);

const jsonOutputParser = new JsonOutputParser();
const MAX_Q_PER_CHUNK = 3;

// Deduplizierung der Fragen
function unique(arr) {
  const seen = new Set();
  return arr.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// Fragen aus einem Chunk generieren
// ============================================================================

async function generateQuestionsForChunk(chunkText) {
  try {
    const response = await prompt
      .pipe(chatOpenAI)
      .pipe(jsonOutputParser)
      .invoke({ chunk: chunkText });

    const questions = unique(
      response
        .map((o) => o.question?.trim())
        .filter((q) => q && q.length > 10)
        .slice(0, MAX_Q_PER_CHUNK)
    );

    return questions;
  } catch (err) {
    console.error('Fehler bei der Fragengenerierung für Chunk:', err);
    return [];
  }
}

// ============================================================================
// Hauptfunktion: Markdown Datei verarbeiten
// ============================================================================

async function processMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // 1 Sätze aus dem MD Text bauen
  const sentencesWithMetadata = sentencesFromMarkdown(raw, filePath);

  // 2 Embeddings für jeden Satz erzeugen
  for await (const sentence of sentencesWithMetadata) {
    // optional Länge prüfen falls du Calls sparen willst
    sentence.embedding = await getEmbeddings(sentence.text);
  }

  // 3 Semantische Chunks bilden wie in deinem PDF Code
  const chunks = [];

  const similarityThreshold = 0.7;
  const maxChunkChars = 2200;
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

  console.log(`  → ${chunks.length} Chunks erzeugt für Datei ${filePath}`);

  // 4 Pro Chunk Fragen generieren und in Qdrant speichern
  const questionsByChunk = [];

  console.time('   ↳ Fragen generieren');
  for await (const chunk of chunks) {
    const questions = await generateQuestionsForChunk(chunk.text);
    if (!questions.length) continue;

    questionsByChunk.push({ chunk, questions });
    process.stdout.write('.');
  }
  console.timeEnd('   ↳ Fragen generieren');

  // 5 Fragen embedden und als Punkte in Qdrant speichern
  for (const { chunk, questions } of questionsByChunk) {
    for await (const question of questions) {
      await addQuestionItem(question, chunk);
    }
  }
}

// ============================================================================
// Frage in Qdrant speichern
// ============================================================================

async function addQuestionItem(questionText, chunk) {
  const embedding = await getEmbeddings(questionText);

  const files = [...new Set(chunk.metadata.map((m) => m.file))];
  const sentenceIndices = chunk.metadata.map((m) => m.sentence_index);

  await client.upsert(collectionName, {
    points: [
      {
        id: crypto.randomUUID(),
        vector: embedding,
        payload: {
          question: questionText,
          chunk_text: chunk.text,
          files,
          sentence_indices: sentenceIndices,
        },
      },
    ],
  });
}

// ============================================================================
// Alle MD Dateien nacheinander verarbeiten
// ============================================================================

for (const file of mdFiles) {
  const absolutePath = file;
  console.log(`Verarbeite Markdown Datei: ${absolutePath}`);
  await processMarkdownFile(absolutePath);
}

console.log('Fertig mit semantischem Chunking und Fragegenerierung für alle Markdown Dateien');
