import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from "@langchain/openai";
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';

setGlobalDispatcher(new ProxyAgent('http://localhost:8080'));

// Disable certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const chatOpenAI = new ChatOpenAI({
    apiKey: 'none',
    model: 'qwen/qwen3-4b-2507',
    streaming: false,
    configuration: {
        baseURL: 'http://192.168.178.80:1234/v1'
    },
});


const app = express();
const ollamaApi = createOllamaApiFacade(app, chatOpenAI);

const prompt = `Bitte beantworte die folgende Frage: {question}

###

Hacker News: {context}
`;

ollamaApi.postApiChat(async (chatRequest, chatModel, chatResponse) => {
  const url = 'https://news.ycombinator.com';
  const cheerioWebBaseLoader = new CheerioWebBaseLoader(url, {
    selector: '#bigbox > td > table > tbody',
    headers:  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                  "(KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  }
  });

  const documents = await cheerioWebBaseLoader.load();

  const promptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      'Antworte ausschließlich in Deutsch. Dein Datenkontext ist englisch, die Antwort muss ebenfalls auf Deutsch erfolgen.'
    ),
    HumanMessagePromptTemplate.fromTemplate(prompt),
  ]);
  const response = await promptTemplate.pipe(chatModel).invoke({
    question: chatRequest.lastHumanMessage()?.content,
    context: documents.map((doc) => doc.pageContent).join(' '),
  });

  chatResponse.asStream(response);
});

ollamaApi.listen();
