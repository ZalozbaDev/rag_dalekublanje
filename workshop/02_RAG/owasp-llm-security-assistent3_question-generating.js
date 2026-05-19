import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI, OpenAIClient } from '@langchain/openai';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { QdrantClient } from '@qdrant/js-client-rest';

setGlobalDispatcher(new ProxyAgent('http://localhost:8080'));

// Disable certificate verification
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const collectionName = 'vector-db-qg-chunking-md';

const client = new QdrantClient({
  url: 'http://192.168.178.80:6333',
});

const chatOpenAI = new ChatOpenAI({
  model: 'qwen/qwen3-4b-2507',
  streaming: false,
  ...createLMStudioConfig(),
  temperature: 0.1,
  configuration: {
    baseURL: 'http://192.168.178.80:1234/v1'
  },
});

const openAiClient = new OpenAIClient({
  apiKey: 'none', 
  baseURL: "http://192.168.178.80:1234/v1",
});

const app = express();
const ollamaApi = createOllamaApiFacade(app, chatOpenAI);

ollamaApi.postApiChat(async (chatRequest, chatModel, chatResponse) => {
  chatRequest.addSystemMessage(`Du bist OWASP TOP 10 für LLM Applications Berater. 
        Erkläre fragen in einfachen worten.  
        Achte ganz besonders stark darauf, das du nur das beantwortest, was im Datenkontext enthalten ist. 
        Ansonsten sagst du, das du keine Antwort auf die Frage hast. Aktuelles Datum: 15.04.2026`);

  let lastHumanMessage = chatRequest.lastHumanMessage();
  const results = await query(lastHumanMessage?.content);

  const prompt = `Bitte beantworte die folgende Frage: ${lastHumanMessage?.content}

###

Datenkontext: ${JSON.stringify(results)}
`;

  chatRequest.replaceLastHumanMessage(prompt);
  const response = await chatModel.stream(chatRequest.messages);

  chatResponse.asStream(response);
});

async function query(text) {
  const embedding = await getEmbeddings(text);
  const result = await client.search(collectionName, {
    vector: embedding,
    limit: 3,
    with_vector: false,
    with_payload: true,
  });

  return result;
}

async function getEmbeddings(text) {
  const response = await openAiClient.embeddings.create({
    model: 'text-embedding-multilingual-e5-base',
    input: text,
    encoding_format: 'base64',
  });

  return response.data[0].embedding;
}

ollamaApi.listen();
