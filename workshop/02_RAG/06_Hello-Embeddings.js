import { OpenAIClient } from '@langchain/openai';
import { createLMStudioConfig } from 'ollama-api-facade-js';
import { LocalIndex } from 'vectra';
import * as path from 'path';
import { fileURLToPath } from 'url';

// const openAiClient = new OpenAIClient(createLMStudioConfig());

const openAiClient = new OpenAIClient({
  apiKey: 'none', 
  baseURL: "http://192.168.178.80:1234/v1",
});

async function getEmbeddings(text) {
  const response = await openAiClient.embeddings.create({
    model: 'text-embedding-multilingual-e5-base',
    // model: 'text-embedding-multilingual-e5-large',
    // model: 'jina-embeddings-v3',
    input: text,
    encoding_format: 'base64',
  });

  return response.data[0].embedding;
}

const a = await getEmbeddings('Nach einem langen Arbeitstag freute sich Lisa auf eine Tasse heißen Kamillentee.');
// const b = await getEmbeddings('Entspannung nach einem anstrengenden Tag mit einem warmen Getränk.');
// const b = await getEmbeddings('Der alte Leuchtturm an der Küste trotzt seit Jahrhunderten Wind und Wetter.');
const b = await getEmbeddings('Po dołhim dźěłowym dnju wjeseleše so Lisa na šalku horceho kamilkeho čaja.');
// const b = await getEmbeddings('Folklorny festiwal w Chróšćicach běše lětsa zaso jara zajimawe!');
// const b = await getEmbeddings('Přichodny boža mša w Chróšćicach je njedźelu rano w dźewjeć hodźin.');

const similarity = cosineSimilarity(a, b);
console.log('Cosinus-Ähnlichkeit:', similarity);

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length)
    throw new Error('Vektoren müssen die gleiche Länge haben');
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
