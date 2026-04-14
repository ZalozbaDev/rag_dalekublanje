import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from '@langchain/openai';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { dateTimeTool } from './tools/dateTimeTool.js';

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

const tools = [dateTimeTool];

ollamaApi.postApiChat(async (chatRequest, chatModel, chatResponse, toolCallService) => {
  chatRequest.addSystemMessage(
    `You are a helpful Devbot. You have a dateTimeTool registered, execute it when asked about the time / date / day.`
  );

  const response = await toolCallService.with(tools).invoke(chatRequest.messages);
  chatResponse.asStream(response);
});

ollamaApi.listen();
