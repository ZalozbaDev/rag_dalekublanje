import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from '@langchain/openai';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

setGlobalDispatcher(new ProxyAgent('http://localhost:8080'));

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

ollamaApi.postApiChat(async (chatRequest, chatModel, chatRespose) => {
  const lastHumanMessage = chatRequest.lastHumanMessage();

  const chatPromptTemplate = ChatPromptTemplate.fromMessages([
    [
      'system',
      `Nur bei fragen, orientiere dich beim beantworten der Fragen am Datenkontext. Ansonsten Datenkontext ignorieren.
            ###
    
    Datenkontext: {context}
            `,
    ],
    ['human', '{question}'],
  ]);

  const messages = await chatPromptTemplate.formatMessages({
    question: lastHumanMessage?.content,
    context: `Ano Nym - den geheimnisvollen Ethical Hacker, der das Herz unserer Community 'My Coding Zone' bildet.`,
  });

  const response = await chatModel.invoke(messages);
  chatRespose.asStream(response);

//   const prompt = `Bitte beantworte die folgende Frage: {question}
    
//     ###

//     Datenkontext: {context}`;

  // const promptTemplate = PromptTemplate.fromTemplate(prompt);
  // const response = await promptTemplate.pipe(chatModel).invoke({
  //     question: lastHumanMessage?.content,
  //     context: `Ano Nym - den geheimnisvollen Ethical Hacker, der das Herz unserer Community 'My Coding Zone' bildet.`
  // });

});

ollamaApi.listen();
