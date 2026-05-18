import type { ModelMessage as HistoryForDataEntry } from "ai";
import { Box, render, Text } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useMemo, useRef, useState } from "react";
import { send } from "./lib/llm";
import { createExecTools, createFileTools, createWebTools } from "./tool";

type HistoryForViewEntry = {
  type: "user" | "assistant" | "reasoning" | "tool-req" | "tool-res" | "error";
  text: string;
};

const ENTRY_TYPE_REQ = "user";
const ENTRY_TYPE_RES = "assistant";

function App() {
  const [historyForView, setHistoryForView] = useState<HistoryForViewEntry[]>(
    [],
  );
  const [historyForData, setHistoryForData] = useState<HistoryForDataEntry[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");

  const appendHistoryForView = useCallback(
    ({ entries }: { entries: HistoryForViewEntry[] }) => {
      setHistoryForView((prev) => [...prev, ...entries]);
    },
    [],
  );

  const appendHistoryForData = useCallback(
    ({ entries }: { entries: HistoryForDataEntry[] }) => {
      setHistoryForData((prev) => [...prev, ...entries]);
    },
    [],
  );

  const appendStreamingReasoning = useCallback(
    ({ delta }: { delta: string }) => {
      setStreamingReasoning((prev) => prev + delta);
    },
    [],
  );

  const commitStreamingReasoning = useCallback(() => {
    setStreamingReasoning((prev) => {
      if (prev !== "") {
        setHistoryForView((prevHistory) => [
          ...prevHistory,
          { type: "reasoning", text: prev },
        ]);
      }
      return "";
    });
  }, []);

  const historyForDataRef = useRef(historyForData);
  historyForDataRef.current = historyForData;

  const tools = useMemo(
    () => ({
      ...createFileTools(),
      ...createExecTools(),
      ...createWebTools(),
    }),
    [],
  );

  const handleSubmit = useCallback(
    async (value: string) => {
      if (value.trim() === "" || loading) return;

      if (value.trim() === "/exit") {
        process.exit(0);
      }

      try {
        setInput("");

        setLoading(true);

        setStatus("thinking...");

        setStreamingReasoning("");

        appendHistoryForView({
          entries: [{ type: ENTRY_TYPE_REQ, text: value }],
        });

        const reqMessage: HistoryForDataEntry = {
          role: ENTRY_TYPE_REQ,
          content: value,
        };

        const { text, responseMessages: resMessages } = await send({
          messages: [...historyForDataRef.current, reqMessage],
          onReasoningDelta: (d) => {
            setStatus("");

            appendStreamingReasoning({ delta: d });
          },
          onToolReq: ({ toolName, args }) => {
            setStatus(`running ${toolName}...`);

            commitStreamingReasoning();

            appendHistoryForView({
              entries: [
                {
                  type: "tool-req",
                  text: `[tool-req] ${toolName} ${JSON.stringify(args)}`,
                },
              ],
            });
          },
          onToolRes: ({ toolName, result }) => {
            appendHistoryForView({
              entries: [
                {
                  type: "tool-res",
                  text: `[tool-res] ${toolName} ${JSON.stringify(result, null, 2)}`,
                },
              ],
            });
          },
          tools,
        });

        commitStreamingReasoning();

        appendHistoryForView({
          entries: [{ type: ENTRY_TYPE_RES, text }],
        });

        appendHistoryForData({
          entries: [reqMessage, ...resMessages],
        });
      } catch (err) {
        appendHistoryForView({
          entries: [
            {
              type: "error",
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        });
      } finally {
        setStatus("");
        setStreamingReasoning("");
        setLoading(false);
      }
    },
    [
      loading,
      appendHistoryForData,
      appendHistoryForView,
      appendStreamingReasoning,
      commitStreamingReasoning,
      tools,
    ],
  );

  return (
    <Box flexDirection="column" width="100%">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#8BE9FD"
        paddingX={1}
      >
        {historyForView.length > 0 &&
          // biome-ignore lint/suspicious/useIterableCallbackReturn: ignore
          historyForView.map((log, i) => {
            const key = `${i}`;
            switch (log.type) {
              case "user":
                return (
                  <Text key={key} color="#50FA7B">
                    {">"} {log.text}
                  </Text>
                );
              case "assistant":
                return (
                  <Text key={key} color="#F8F8F2">
                    {log.text}
                  </Text>
                );
              case "reasoning":
                return (
                  <Text key={key} color="#6272A4" dimColor>
                    {log.text}
                  </Text>
                );
              case "tool-req":
                return (
                  <Text key={key} color="#F1FA8C" dimColor>
                    {log.text}
                  </Text>
                );
              case "tool-res":
                return (
                  <Text key={key} color="#BD93F9" dimColor>
                    {log.text}
                  </Text>
                );
              case "error":
                return (
                  <Text key={key} color="#FF5555">
                    {log.text}
                  </Text>
                );
            }
          })}
        {streamingReasoning !== "" && (
          <Text color="#6272A4" dimColor>
            {streamingReasoning}
          </Text>
        )}
        {status !== "" && (
          <Text color="#F1FA8C" dimColor>
            {status}
          </Text>
        )}
      </Box>
      <Box paddingX={1}>
        <Text color="#8BE9FD" bold>
          {">"}{" "}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message... (/exit to quit)"
        />
      </Box>
    </Box>
  );
}

render(<App />);
