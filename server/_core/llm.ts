import { ENV } from "./env";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface InvokeParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  response_format?: {
    type: "json_schema" | "json_object" | "text";
    json_schema?: {
      name: string;
      strict?: boolean;
      schema: Record<string, unknown>;
    };
  };
}

export interface InvokeResult {
  choices: Array<{
    message: { role: "assistant"; content: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const payload: Record<string, unknown> = {
    model: params.model ?? ENV.openAiModel,
    messages: params.messages.map(m => ({ role: m.role, content: m.content })),
    temperature: params.temperature ?? 0.3,
    max_tokens: params.maxTokens ?? 1024,
  };

  if (params.response_format) {
    payload.response_format = params.response_format;
  }

  const url = `${ENV.openAiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openAiApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `LLM request failed: ${response.status} ${response.statusText} ${body}`
    );
  }

  return (await response.json()) as InvokeResult;
}
