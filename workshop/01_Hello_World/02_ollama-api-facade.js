import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from "@langchain/openai";

const chatOpenAI = new ChatOpenAI({
    model: 'qwen/qwen3-4b-2507',
    streaming: true,
    ...createLMStudioConfig()
});

const app = express();
const ollamaApi = createOllamaApiFacade(app, chatOpenAI);

ollamaApi.postApiChat(async (chatRequest, chatModel, chatRespose) => {
    const response = await chatModel.stream(chatRequest.messages);
    chatRespose.asStream(response);
});

ollamaApi.listen();
