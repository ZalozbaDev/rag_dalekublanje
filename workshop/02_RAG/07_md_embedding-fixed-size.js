import { OpenAIClient, ChatOpenAI } from '@langchain/openai';
import { createLMStudioConfig } from 'ollama-api-facade-js';
import { MarkdownTextSplitter } from "@langchain/textsplitters"
import { LocalIndex } from 'vectra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import mdFiles from './owasp_vulns_order.json' with { type: 'json' };
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const index = new LocalIndex(path.join(__dirname, 'vector-db-fixed-size'));

if (!(await index.isIndexCreated())) {
  await index.createIndex();
}

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

mdFiles.forEach(async file => {
  const chunks = await loadChunksFromMarkdown(file);
  chunks.forEach(async chunk => {
    const embedding = await getEmbeddings(chunk.pageContent);
      await index.insertItem({
            vector: embedding,
            metadata: { text: chunk.pageContent}, // TBD: metadata from chunk is currently ignored, can and should usually be added
        });
  });
});

export async function loadChunksFromMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");

  // Semantisch sinnvoller Markdown Split
  const mdSplitter = new MarkdownTextSplitter({
    chunkSize: 800,
    chunkOverlap: 80,
  });

  const chunks = await mdSplitter.splitText(raw);

  // Zusätzliche Metadaten ergänzen
  const docs = chunks.map((text, index) => ({
    pageContent: text,
    metadata: {
      file: path.basename(filePath),
      chunk_index: index,
    },
  }));

  return docs;
}
