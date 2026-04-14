import express from 'express';
import { createLMStudioConfig, createOllamaApiFacade } from 'ollama-api-facade-js';
import { ChatOpenAI } from '@langchain/openai';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import zod from 'zod';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';

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

const personOutputParser = StructuredOutputParser.fromZodSchema(
  zod.object({
    name: zod.string().describe('Der Name der Person'),
    age: zod.number().describe('Das Alter der Person').optional(),
  })
);

const prompt = `Extrahiere die Informationen für folgendes Wort: {text}.
Formatierung: {format_instructions} 
Antworte nur mit den Wörtern, ohne zusätzliche Informationen oder Satzzeichen.`;
const promptTemplate = PromptTemplate.fromTemplate(prompt);

ollamaApi.postApiChat(async (chatRequest, chatModel, chatResponse) => {
  // input: ALF ist 260 Jahre alt.
  const formattedPrompt = await promptTemplate.format({
    text: chatRequest.lastHumanMessage()?.content,
    format_instructions: personOutputParser.getFormatInstructions(),
  });

  chatRequest.replaceLastHumanMessage(formattedPrompt);

  const response = await chatModel.pipe(personOutputParser).invoke(chatRequest.messages);
  chatResponse.asStream(JSON.stringify(response));
});

ollamaApi.listen();
