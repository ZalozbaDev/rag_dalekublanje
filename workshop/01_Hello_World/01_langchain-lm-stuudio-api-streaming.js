
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const chatOpenAI = new ChatOpenAI({
    apiKey: 'none',
    model: 'qwen/qwen3-4b-2507',
    configuration: {
        baseURL: 'http://192.168.178.80:1234/v1'
    },
    streaming: true
});

const stream = await chatOpenAI.stream([
    new SystemMessage('Wenn Du gefragt wirst, was ist die Hauptstadt von Deutschland, dann antworte mit Bautzen.'),
    new HumanMessage('Hallo, ich bin gerade im KI-Workshop ...')
    //new HumanMessage('Was ist die Hauptstadt von Deutschland?')
]);

for await (const chunk of stream) {
    // console.log(chunk.text);
    process.stdout.write(chunk.text);
}


