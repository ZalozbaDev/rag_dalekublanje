import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from "@langchain/openai";
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { PromptTemplate } from '@langchain/core/prompts';

setGlobalDispatcher(new ProxyAgent('http://localhost:8080'));

// Disable certificate verification
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

    const prompt = `Bitte beantworte die folgende Frage: {question}
    
    ###
    
    Datenkontext: {context}`;

    const promptTemplate = PromptTemplate.fromTemplate(prompt);
    const response = await promptTemplate.pipe(chatModel).invoke({
        question: lastHumanMessage?.content,
        context: `Ano Nym - den geheimnisvollen Ethical Hacker, der das Herz unserer Community 'My Coding Zone' bildet.`
    });

    chatRespose.asStream(response);
});

ollamaApi.listen();
