"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { appConfig } from "@/config/warehouse-config";
import { activeInventoryDataset } from "@/config/dataset-config";
import { voiceConfig } from "@/config/voice-config";
import { buildVoiceAssistantResponse } from "@/lib/inventory-utils";
import type {
  AssistantState,
  InventoryMovement,
  InventoryRecord,
  VoiceAssistantResponse,
} from "@/types/inventory";
import { VoiceResultCard } from "@/components/assistant/VoiceResultCard";

interface VoiceAssistantProps {
  records: InventoryRecord[];
  movements: InventoryMovement[];
  onHighlight: (payload: {
    productIds?: string[];
    warehouseIds?: string[];
    tagIds?: string[];
  }) => void;
  onOpenMap: (warehouseId?: string) => void;
  onOpenInventory: () => void;
}

interface AssistantChatMessage {
  role: "user" | "assistant";
  text: string;
  matches?: InventoryRecord[];
  options?: VoiceAssistantResponse["options"];
}

interface AssistantApiResponse extends Pick<VoiceAssistantResponse, "answer" | "options"> {
  source?: "openai" | "local";
  debug?: {
    error?: string;
  };
}

const INITIAL_RESPONSE: VoiceAssistantResponse = {
  transcript: "",
  answer: activeInventoryDataset.ui.assistant.initialAnswer,
  state: "ready",
  highlightedProductIds: [],
  highlightedWarehouseIds: [],
  highlightedTagIds: [],
  options: [],
};

export function VoiceAssistant({
  records,
  movements,
  onHighlight,
  onOpenMap,
  onOpenInventory,
}: VoiceAssistantProps) {
  const assistantUi = activeInventoryDataset.ui.assistant;
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [assistantState, setAssistantState] = useState<AssistantState>("ready");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    { role: "assistant", text: INITIAL_RESPONSE.answer },
  ]);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, expanded]);

  const movementTotals = useMemo(() => {
    return movements.reduce<Record<string, { stockIn: number; stockOut: number }>>(
      (totals, movement) => {
        const current = totals[movement.tagId] ?? { stockIn: 0, stockOut: 0 };
        if (movement.type === "stock-in") current.stockIn += movement.quantity;
        if (movement.type === "stock-out") current.stockOut += movement.quantity;
        totals[movement.tagId] = current;
        return totals;
      },
      {}
    );
  }, [movements]);

  function getMatches(nextResponse: VoiceAssistantResponse) {
    return records
      .filter((record) => nextResponse.highlightedTagIds.includes(record.tag.id))
      .slice(0, 3);
  }

  function getPreferredVoice() {
    const availableVoices =
      voices.length > 0 || typeof window === "undefined"
        ? voices
        : window.speechSynthesis.getVoices();
    const englishVoices = availableVoices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(voiceConfig.ttsLang.slice(0, 2).toLowerCase())
    );

    return (
      voiceConfig.preferredVoiceNames
        .map((name) =>
          englishVoices.find((voice) => voice.name.toLowerCase().includes(name.toLowerCase()))
        )
        .find(Boolean) ??
      englishVoices.find((voice) => /aria|jenny|sonia|libby|samantha|female|woman/i.test(voice.name)) ??
      englishVoices.find((voice) => /natural|online|neural|google/i.test(voice.name)) ??
      englishVoices[0] ??
      null
    );
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceConfig.ttsLang;
    utterance.rate = voiceConfig.ttsRate;
    utterance.pitch = voiceConfig.ttsPitch;
    utterance.voice = getPreferredVoice();
    utterance.onstart = () => setAssistantState("speaking");
    utterance.onend = () =>
      setAssistantState((current) => (current === "speaking" ? "product-found" : current));
    utterance.onerror = () =>
      setAssistantState((current) => (current === "speaking" ? "product-found" : current));
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setAssistantState((current) => (current === "speaking" ? "product-found" : current));
  }

  async function getLlmResponse(nextQuery: string, localResponse: VoiceAssistantResponse) {
    const payload = {
      question: nextQuery,
      localAnswer: localResponse.answer,
      warehouses: Array.from(new Set(records.map((record) => record.warehouse.shortName))),
      inventory: records.map((record) => {
        const totals = movementTotals[record.tag.id] ?? { stockIn: 0, stockOut: 0 };
        return {
          tagId: record.tag.id,
          product: record.product.name,
          category: record.product.category,
          warehouse: record.warehouse.shortName,
          zone: record.zoneName,
          rack: record.rackLabel,
          container: record.containerLabel,
          quantity: record.tag.quantity,
          minimumStock: record.product.minimumStock,
          status: record.status,
          stockIn: totals.stockIn,
          stockOut: totals.stockOut,
        };
      }),
    };

    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Assistant endpoint failed");
    const assistantResponse = (await response.json()) as AssistantApiResponse;
    if (assistantResponse.source === "local" && assistantResponse.debug?.error) {
      console.error("[assistant-llm]", assistantResponse.debug.error);
    }
    return assistantResponse;
  }

  async function runQuery(nextQuery: string) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setQuery("");
    setAssistantState("searching");
    setMessages((current) => [
      ...current,
      { role: "user", text: nextQuery },
    ]);

    const localResponse = buildVoiceAssistantResponse(records, nextQuery);
    const matches = getMatches(localResponse);
    let nextResponse = localResponse;

    try {
      const llmResponse = await getLlmResponse(nextQuery, localResponse);
      nextResponse = {
        ...localResponse,
        answer: llmResponse.answer || localResponse.answer,
        options: llmResponse.options?.length ? llmResponse.options : localResponse.options,
      };
    } catch (error) {
      console.error("[assistant-llm] client request failed", error);
      nextResponse = localResponse;
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text: nextResponse.answer,
        matches,
        options: nextResponse.options,
      },
    ]);
    setAssistantState(nextResponse.state);
    onHighlight({
      productIds: nextResponse.highlightedProductIds,
      warehouseIds: nextResponse.highlightedWarehouseIds,
      tagIds: nextResponse.highlightedTagIds,
    });
    if (nextResponse.highlightedWarehouseIds[0]) {
      onOpenMap(nextResponse.highlightedWarehouseIds[0]);
    }
    onOpenInventory();
    speak(nextResponse.answer);
  }

  function handleSubmit() {
    if (!query.trim()) return;
    runQuery(query.trim());
  }

  return (
    <div className={`assistant-dock ${expanded ? "expanded" : ""}`}>
      <button className="assistant-toggle" type="button" onClick={() => setExpanded((current) => !current)}>
        <span className={`assistant-pulse ${assistantState}`} />
        <div>
          <strong>{appConfig.assistantName}</strong>
        </div>
      </button>

      {expanded ? (
        <div className="assistant-panel">
          <div className="assistant-toolbar">
            <span aria-hidden="true" />
            <div className="assistant-toolbar-actions">
              <button className="btn ghost small" type="button" onClick={() => setExpanded(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="assistant-suggestions">
            {assistantUi.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="assistant-chip"
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  runQuery(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="assistant-body">
            <div className="assistant-conversation">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
                  <span>{message.text}</span>
                  {message.role === "assistant" && message.matches?.length ? (
                    <div className="assistant-results" aria-label="Matched inventory">
                      {message.matches.map((record) => (
                        <VoiceResultCard key={record.id} record={record} />
                      ))}
                    </div>
                  ) : null}
                  {message.role === "assistant" && message.options?.length ? (
                    <div className="assistant-option-row">
                      {message.options.map((option) => (
                        <button
                          className="assistant-option"
                          key={`${option.label}-${option.query}`}
                          type="button"
                          onClick={() => {
                            setQuery(option.query);
                            runQuery(option.query);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {assistantState === "searching" ? (
                <div className="assistant-thinking" aria-live="polite">
                  <span>Thinking</span>
                  <div className="thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : null}
              <div ref={conversationEndRef} />
            </div>
          </div>

          <div className="assistant-input-row">
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
              placeholder="Ask where a product is located"
            />
            <button className="btn primary" type="button" onClick={handleSubmit}>
              Search
            </button>
            {assistantState === "speaking" ? (
              <button
                className="assistant-stop-voice"
                type="button"
                onClick={stopSpeaking}
                aria-label="Stop voice"
                title="Stop voice"
              >
                <span />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
