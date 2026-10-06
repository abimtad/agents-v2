import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";

import { tools } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import { Laminar, getTracer } from "@lmnr-ai/lmnr";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import type { AgentCallbacks } from "../types.ts";

const MODEL_NAME = "gpt-5-mini";

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});


export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<any> {
  // Filter and check if we need to compact the conversation history before starting
  const { text } = await generateText({
	model: openrouter(process.env.MODEL),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
    tools,
	experimental_telemetry: {
		isEnabled: true,
		tracer: getTracer()
	}
  });

  await Laminar.flush()

  console.log(text);
}
runAgent({
      prompt: "what is the current time?",
}).then((response) => {
      response.toolCalls.forEach(async (call) => {
              console.log(await executeTools(call.toolName, call.input))
      })
      console.log(response);
})
