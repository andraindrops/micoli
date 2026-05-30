import type { ModelMessage } from "ai";
import { Box, render, Text } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useMemo, useRef, useState } from "react";

import { send } from "./lib/llm";
import { createExecTools, createFileTools, createWebTools } from "./tool";

const ENTRY_TYPE_REQ = "user";
type Status = "running";

function getMessageText(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content;

  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter((text) => text.trim() !== "")
    .join("\n");
}

function App() {
  const [modelMessages, setModelMessages] = useState<ModelMessage[]>([]);
  const [status, setStatus] = useState<Status | undefined>(undefined);

  const [input, setInput] = useState("");

  const appendModelMessages = useCallback(
    ({ entries }: { entries: ModelMessage[] }) => {
      setModelMessages((prev) => [...prev, ...entries]);
    },
    [],
  );

  const modelMessagesRef = useRef(modelMessages);
  modelMessagesRef.current = modelMessages;

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
      if (value.trim() === "" || status != null) return;

      if (value.trim() === "/exit") {
        process.exit(0);
      }

      try {
        setStatus("running");

        setInput("");

        const reqMessage: ModelMessage = {
          role: ENTRY_TYPE_REQ,
          content: value,
        };

        const { responseMessages: resMessages } = await send({
          messages: [...modelMessagesRef.current, reqMessage],
          tools,
        });

        appendModelMessages({
          entries: [reqMessage, ...resMessages],
        });
      } finally {
        setStatus(undefined);
      }
    },
    [status, appendModelMessages, tools],
  );

  return (
    <Box flexDirection="column" width="100%">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#8BE9FD"
        paddingX={1}
      >
        <Text color="#F1FA8C" dimColor>
          {status || "hello"}
        </Text>
        {modelMessages.length > 0 &&
          // biome-ignore lint/suspicious/useIterableCallbackReturn: ignore
          modelMessages.map((message, i) => {
            const text = getMessageText(message.content);

            if (text === "") return null;

            const key = `${i}`;

            switch (message.role) {
              case "user":
                return (
                  <Text key={key} color="#50FA7B">
                    {">"} {text}
                  </Text>
                );
              case "assistant":
                return (
                  <Text key={key} color="#F8F8F2">
                    {text}
                  </Text>
                );
              case "tool":
                return (
                  <Text key={key} color="#6272A4" dimColor>
                    {text}
                  </Text>
                );
            }
          })}
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
