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
    const delayPerWord = 200; // 200ms per word instead of 800ms
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

  const analyzeAccessibilityIntent = async (text: string) => {
    try {
      const response = await fetch('/api/accessibility-assistant/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze accessibility intent');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error analyzing accessibility intent:', error);
      return null;
    }
  };

  const handleAccessibilityAction = (intent: any) => {
    switch (intent.intentType) {
      case 'FONT_SIZE':
        const size = intent.action === 'INCREASE' ? '1.2rem' : 
                    intent.action === 'DECREASE' ? '0.8rem' : '1rem';
        document.documentElement.style.fontSize = size;
        return `Veličina fonta je ${intent.action === 'RESET' ? 'vraćena na početnu vrijednost' : 'prilagođena'}.`;
      
      case 'FONT_TYPE':
        if (intent.action === 'SET' && intent.value === 'dyslexic') {
          document.body.classList.remove(inter.className);
          document.body.classList.add(dyslexicFont.className);
          return 'Font je prilagođen za lakše čitanje osobama s disleksijom.';
        }
        document.body.classList.remove(dyslexicFont.className);
        document.body.classList.add(inter.className);
        return 'Font je vraćen na standardni tip.';
      
      case 'THEME':
        if (intent.action === 'SET') {
          if (intent.value === 'dark') {
            document.body.classList.add('dark-theme');
            return 'Tamna tema je aktivirana.';
          }
          document.body.classList.remove('dark-theme');
          return 'Svijetla tema je aktivirana.';
        }
        return 'Tema je vraćena na početnu vrijednost.';
      
      case 'GENERAL_QUERY':
        return `$$$$`; // This will trigger the help message display
      
      default:
        return null;
    }
  };

  // Add handleQuickQuestion function
  const handleQuickQuestion = (text: string) => {
    // Direct mappings for quick questions
    const quickQuestionMappings: Record<string, any> = {
      "koje opcije pristupačnosti nudiš?": {
        intentType: "GENERAL_QUERY",
        confidence: 1.0
      },
      "tamna tema": {
        intentType: "THEME",
        action: "SET",
        value: "dark",
        confidence: 1.0
      },
      "svijetla tema": {
        intentType: "THEME",
        action: "SET",
        value: "light",
        confidence: 1.0
      },
      "povećaj font": {
        intentType: "FONT_SIZE",
        action: "INCREASE",
        confidence: 1.0
      },
      "smanji font": {
        intentType: "FONT_SIZE",
        action: "DECREASE",
        confidence: 1.0
      },
      "resetiraj veličinu fonta": {
        intentType: "FONT_SIZE",
        action: "RESET",
        confidence: 1.0
      },
      "font prilagođen disleksiji": {
        intentType: "FONT_TYPE",
        action: "SET",
        value: "dyslexic",
        confidence: 1.0
      },
      "resetiraj tip fonta": {
        intentType: "FONT_TYPE",
        action: "RESET",
        confidence: 1.0
      }
    };

    const normalizedText = text.toLowerCase().trim();
    return quickQuestionMappings[normalizedText];
  };

  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim()) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);

    // Check if it's a quick question first
    const quickQuestionIntent = handleQuickQuestion(userInput);
    if (quickQuestionIntent) {
      const response = handleAccessibilityAction(quickQuestionIntent);
      if (response) {
        setMessages(currentMessages => [
          ...currentMessages,
          { role: "assistant", text: response }
        ]);
        setUserInput("");
        setInputDisabled(false);
        scrollToBottom();
        return;
      }
    }

    // If not a quick question, proceed with regular flow
    const intent = await analyzeAccessibilityIntent(userInput);
    
    // Show accessibility options menu if:
    // 1. Confidence is low but not zero (potential accessibility request)
    // 2. Intent type is GENERAL_QUERY (explicitly asking about options)
    // 3. Confidence is between 0.3 and 0.7 (model is uncertain)
    if (intent && (
      intent.intentType === "GENERAL_QUERY" ||
      (intent.confidence > 0.3 && intent.confidence < 0.7) ||
      (intent.intentType !== "NOT_ACCESSIBILITY" && intent.confidence < 0.7)
    )) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: "$$$$" } // Show the help menu
      ]);
      setUserInput("");
      setInputDisabled(false);
      scrollToBottom();
      return;
    }
    
    // Handle high-confidence accessibility intents
    if (intent && intent.confidence >= 0.7) {
      const response = handleAccessibilityAction(intent);
      if (response) {
        setMessages(currentMessages => [
          ...currentMessages,
          { role: "assistant", text: response }
        ]);
        setUserInput("");
        setInputDisabled(false);
        scrollToBottom();
        return;
      }
    }

    // If no accessibility intent detected or confidence is low, proceed with regular chat
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
    return <button 
      className={styles.quickQuestionButton} 
      onClick={() => {
        setUserInput(input);
        handleSubmit();
      }}
    >
      {input}
    </button>
  }, [setUserInput, handleSubmit]);

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
