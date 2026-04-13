import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from "@langchain/openai";

const chatOpenAI = new ChatOpenAI({
    apiKey: 'none',
    model: 'qwen/qwen3-4b-2507',
    streaming: true,
    configuration: {
        baseURL: 'http://192.168.178.80:1234/v1'
    },
});

const app = express();
const ollamaApi = createOllamaApiFacade(app, chatOpenAI);

ollamaApi.postApiChat(async (chatRequest, chatModel, chatRespose) => {
    const response = await chatModel.stream(chatRequest.messages);
    chatRespose.asStream(response);
});

ollamaApi.listen();
