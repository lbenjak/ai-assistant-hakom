"use client";

import { AssistantStream } from "openai/lib/AssistantStream";
import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import styles from "./chat.module.css";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { dyslexicFont, inter } from "../fonts";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  helpMessage: ReactNode;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({ role, text, helpMessage }: MessageProps) => {
  if (text === "$$$$") {
    return helpMessage;
  }

  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [timeoutId, setTimeoutId] = useState(null);
  const [accessibilityMessageSent, setAccessibilityMessageSent] = useState(false);

  // Function to calculate timeout duration based on word count
  const calculateTimeout = (message) => {
    const words = message.split(" ").length;
    const delayPerWord = 800; // 1 second per word, adjust as needed
    return words * delayPerWord;
  };

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  // handle user inactivity
  useEffect(() => {
    if (timeoutId) clearTimeout(timeoutId);

    const lastAssistantMessage = messages.filter(msg => msg.role === "assistant").pop();
    const timeoutDuration = lastAssistantMessage ? calculateTimeout(lastAssistantMessage.text) : 10000;

    const id = setTimeout(() => {
      if (!accessibilityMessageSent) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", text: "Mogu li ti kako pomoći sa postavkama pristupačnosti?" }
        ]);
        setAccessibilityMessageSent(true);
        scrollToBottom();
      }
    }, timeoutDuration);

    setTimeoutId(id);
    return () => clearTimeout(id);
  }, [userInput, messages]);

  const sendMessage = async (text) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };


  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim()) return;

    const lowerCasedInput = userInput.toLowerCase();

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);

    if (lowerCasedInput.includes('koje opcije pristupačnosti nudiš')) {
      setMessages(currentMessages => [
        ...currentMessages,
        {
          role: "assistant", text: `$$$$`
        }
      ]);

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('povećaj font')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Veličina fonta je povećana." }
      ]);

      document.documentElement.style.fontSize = '1.2rem';

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('smanji font')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Veličina fonta je smanjena." }
      ]);

      document.documentElement.style.fontSize = '0.8rem';

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('resetiraj veličinu fonta')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Veličina fonta vraćena je na početnu vrijednost." }
      ]);

      document.documentElement.style.fontSize = '1rem';

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('resetiraj tip fonta')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Tip fonta vraćen je na početnu vrijednost." }
      ]);

      document.body.classList.remove(dyslexicFont.className);
      document.body.classList.add(inter.className);

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('disleks')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Tip fonta je promijenjen kako bi bio prilagođen osobama sa disleksijom." }
      ]);

      document.body.classList.remove(inter.className);
      document.body.classList.add(dyslexicFont.className);

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('tamna tema')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Tema je promijenjena na tamni način." }
      ]);

      document.body.classList.add('dark-theme');

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    if (lowerCasedInput.includes('svijetla tema')) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "Tema je promijenjena na svijetli način." }
      ]);

      document.body.classList.remove('dark-theme');

      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }

    sendMessage(userInput);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    // image
    stream.on("imageFileDone", handleImageFileDone);

    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  }

  const QuickQuestion = useCallback(({ input }: { input: string }) => {
    return <button className={styles.quickQuestionButton} onClick={() => {
      setUserInput(input.toLowerCase());
    }}>{input}</button>
  }, [setUserInput, handleSubmit])

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} helpMessage={
            <div className={styles.assistantMessage}>
              <p >Ako želiš promijeniti opcije pristupačnosti, samo napiši koje postavke želiš prilagoditi. Možeš ih prilagoditi i na sljedeće načine: </p>
              <br />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <QuickQuestion input="Tamna tema" />
                <QuickQuestion input="Svijetla tema" />
                <QuickQuestion input="Font prilagođen disleksiji" />
                <QuickQuestion input="Resetiraj tip fonta" />
                <QuickQuestion input="Povećaj font" />
                <QuickQuestion input="Smanji font" />
                <QuickQuestion input="Resetiraj veličinu fonta" />
              </div>
            </div>
          } />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.quickQuestions}>
        <QuickQuestion input="Imam li pravo na raskid ako sam ugovor sklopio izvan poslovnice?" />
        <QuickQuestion input="Mogu li ugovor prenijeti na drugu osobu?" />
        <QuickQuestion input="Koja prava imam ako operator ukine paket usluga koje koristim?" />
        <QuickQuestion input="Koje opcije pristupačnosti nudiš?" />
        <QuickQuestion input="Tamna tema" />
        <QuickQuestion input="Povećaj font" />
      </div>

      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Pošalji
        </button>
      </form>
    </div>
  );
};

export default Chat;
