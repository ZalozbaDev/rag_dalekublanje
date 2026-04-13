
import { ChatOpenAI } from "@langchain/openai";

const chatOpenAI = new ChatOpenAI({
    apiKey: 'none',
    model: 'qwen/qwen3-4b-2507',
    configuration: {
        baseURL: 'http://192.168.178.80:1234/v1'
    }
});

const result = await chatOpenAI.invoke('Hallo, kannst Du Deutsch?');
console.log(result.text);
