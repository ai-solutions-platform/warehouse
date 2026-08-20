import { NextResponse } from "next/server";
import { ProxyAgent } from "undici";

export const runtime = "nodejs";

interface AssistantRequest {
  question: string;
  localAnswer: string;
  inventory: Array<{
    tagId: string;
    product: string;
    category: string;
    warehouse: string;
    zone: string;
    rack: string;
    container: string;
    quantity: number;
    minimumStock: number;
    status: string;
    stockIn: number;
    stockOut: number;
  }>;
  warehouses: string[];
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const cause =
    "cause" in error && error.cause
      ? `; cause: ${JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause))}`
      : "";
  return `${error.message}${cause}`;
}

function safeDebug(value: string, maxLength = 700) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

interface ProxyConfig {
  uri: string;
  token?: string;
}

function getProxyConfig(): ProxyConfig | undefined {
  const raw =
    process.env.HTTPS_PROXY ??
    process.env.HTTP_PROXY ??
    process.env.https_proxy ??
    process.env.http_proxy;

  if (!raw) return undefined;

  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;

  if (username && password) {
    const token = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    return { uri: raw, token };
  }

  return { uri: raw };
}

function buildFriendlyFallback(question: string) {
  const normalized = question.trim().toLowerCase();

  if (normalized.includes("venta") || normalized.includes("sales")) {
    return "Hi, I can help with estimated sales from stock-out movements. Which product or warehouse should I check?";
  }

  return "Hi, I could not find it with that name. Which product do you need help with?";
}

function buildSystemPrompt() {
  return [
    "You are a friendly NFC warehouse inventory assistant.",
    "Always answer in English, even if the user writes in Spanish or mixes languages.",
    "All JSON fields must be in English, including answer, option labels, and option queries.",
    "Be brief and useful. Usually answer in 1 or 2 short sentences.",
    "For locations, use this style: 'Hi, that is in Celaya, Zone A, Rack A2, Container C04.'",
    "If the product is not found, never repeat the raw local fallback. Ask kindly which product they need help with.",
    "If the user asks an ambiguous warehouse question, ask which warehouse and provide options.",
    "You can discuss ventas/sales using stockOut as estimated outgoing sales and stockIn as incoming stock.",
    "Do not invent data. Use only the inventory context received.",
    "If localAnswer is not in English, rewrite it in friendly English instead of copying it.",
    "Return only valid JSON shaped like: {\"answer\":\"...\",\"options\":[{\"label\":\"...\",\"query\":\"...\"}]}",
  ].join(" ");
}

function buildUserPrompt(payload: AssistantRequest) {
  return JSON.stringify({
    question: payload.question,
    localAnswer: payload.localAnswer,
    friendlyFallback: buildFriendlyFallback(payload.question),
    warehouses: payload.warehouses,
    inventory: payload.inventory,
  });
}

function extractResponseText(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const response = data as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
        type?: string;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") return response.output_text.trim();

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("")
      .trim() ?? ""
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AssistantRequest;
  const enabled = process.env.OPENAI_ENABLED === "true";
  const apiKey = process.env.OPENAI_API_KEY;
  const endpoint = process.env.OPENAI_ENDPOINT;
  const deployment = process.env.OPENAI_DEPLOYMENT_NAME;
  const temperature = Number(process.env.OPENAI_TEMPERATURE ?? "0.2");
  const fallbackAnswer = buildFriendlyFallback(payload.question);

  if (!enabled || !apiKey || !endpoint || !deployment) {
    const missing = [
      !enabled ? "OPENAI_ENABLED" : null,
      !apiKey ? "OPENAI_API_KEY" : null,
      !endpoint ? "OPENAI_ENDPOINT" : null,
      !deployment ? "OPENAI_DEPLOYMENT_NAME" : null,
    ].filter(Boolean);

    console.error("[assistant-llm] disabled or missing config", { missing });

    return NextResponse.json({
      answer: fallbackAnswer,
      options: [],
      source: "local",
      debug: {
        error: `LLM disabled or missing config: ${missing.join(", ")}`,
      },
    });
  }

  try {
    const url = new URL("responses", endpoint.endsWith("/") ? endpoint : `${endpoint}/`);
    const proxyConfig = getProxyConfig();
    console.info("[assistant-llm] request", {
      endpoint: url.toString(),
      deployment,
      inventoryItems: payload.inventory.length,
      proxy: proxyConfig ? new URL(proxyConfig.uri).host : "none",
      proxyAuth: proxyConfig?.token ? "basic" : "none",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: deployment,
        instructions: buildSystemPrompt(),
        input: buildUserPrompt(payload),
        temperature,
      }),
      ...(proxyConfig ? { dispatcher: new ProxyAgent(proxyConfig) } : {}),
    } as RequestInit & { dispatcher?: ProxyAgent });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Assistant request failed with ${response.status} ${response.statusText}: ${safeDebug(errorBody)}`
      );
    }

    const data = await response.json();
    const content = extractResponseText(data);
    if (!content) {
      throw new Error(`Assistant response had no message content: ${safeDebug(JSON.stringify(data))}`);
    }

    let parsed: { answer?: unknown; options?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Assistant returned non-JSON content: ${safeDebug(content)}`);
    }

    console.info("[assistant-llm] success", {
      answerPreview:
        typeof parsed.answer === "string" ? safeDebug(parsed.answer, 140) : "missing answer",
    });

    return NextResponse.json({
      answer: typeof parsed.answer === "string" ? parsed.answer : fallbackAnswer,
      options: Array.isArray(parsed.options) ? parsed.options.slice(0, 4) : [],
      source: "openai",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[assistant-llm] error", message);

    return NextResponse.json({
      answer: fallbackAnswer,
      options: [],
      source: "local",
      debug: {
        error: message,
      },
    });
  }
}
