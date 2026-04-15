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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const index = new LocalIndex(path.join(__dirname, 'vector-db'));

if (!(await index.isIndexCreated())) {
  await index.createIndex();
}

async function getEmbeddings(text) {
  const response = await openAiClient.embeddings.create({
    // model: 'text-embedding-multilingual-e5-base',
    model: 'text-embedding-multilingual-e5-large',
    // model: 'jina-embeddings-v3',
    input: text,
    encoding_format: 'base64',
  });

  return response.data[0].embedding;
}

async function addItem(text) {
  const embedding = await getEmbeddings(text);

  await index.insertItem({
    vector: embedding,
    metadata: { text },
  });
}

async function query(text) {
  const embedding = await getEmbeddings(text);

  const results = await index.queryItems(embedding, text, 3);

  if (results.length > 0) {
    for (const result of results) {
      console.log(`[${result.score}] ${result.item.metadata.text}`);
    }
  } else {
    console.log(`No results found.`);
  }
}

// uncomment for first run (fill database)

//await addItem('Die Sonne verschwand langsam hinter den Bergen und tauchte den Himmel in ein tiefes Orange.');
//await addItem('Künstliche Intelligenz revolutioniert die Medizin durch präzisere Diagnosen und personalisierte Therapien.')
//await addItem('Nach einem langen Arbeitstag freute sich Lisa auf eine Tasse heißen Kamillentee.');
//await addItem('Der alte Leuchtturm an der Küste trotzt seit Jahrhunderten Wind und Wetter.');
// await addItem('Im letzten Fußballspiel überraschte die Mannschaft mit einer aggressiven Offensivstrategie.');


// print similarities
await query('Die Sonne verschwand langsam hinter den Bergen und tauchte den Himmel in ein tiefes Orange.');
// await query('Der Mond verschwand langsam hinter den Bergen und tauchte den Himmel in ein tiefes Schwarz.');
// await query('Słónco so pomału zady horami chowaše a njebjo na sylnu oranžowu barbu měnješe.');
