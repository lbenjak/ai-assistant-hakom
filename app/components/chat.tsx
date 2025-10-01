"use client";

import { AssistantStream } from "openai/lib/AssistantStream";
import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import styles from "./chat.module.css";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import RecordAudio from "./speech_recognition/record-audio";
import ModelSelectorDropdown from "./speech_synthesis/model-selector-dropdown";
import { localTTSURL, TTSServiceURL } from "../speech-config";
import { handleAccessibilityAction } from "./accessibility";
import { handleQuickQuestion, analyzeAccessibilityIntent } from "./intentRecognition";
import { scrollToBottom, appendToLastMessage, appendMessage, markLastMessageAsFinished } from "./chatUtils";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  helpMessage: ReactNode;
  selectedModel: string | null;
  isStreamFinished: boolean;
  isDarkTheme: boolean;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text, selectedModel, isStreamFinished, isDarkTheme }: { text: string, selectedModel: string | null, isStreamFinished: boolean, isDarkTheme: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioIdRef = useRef<string | null>(null);

  const handlePlayPause = async () => {
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioIdRef.current) {
        const response = await fetch('/api/speech/tts/different_models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, model: selectedModel }),
        });

        if (!response.ok) {
          console.error("Failed to get audioId from /api/speech/tts/different_models");
          return;
        }
        const data: { audioId: string } = await response.json();
        audioIdRef.current = data.audioId;
      }

      const streamUrl = `${selectedModel === "VITS-hr" ? TTSServiceURL : localTTSURL}/stream/${audioIdRef.current}`;

      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
        audioPlayerRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
          audioIdRef.current = null;
          audioPlayerRef.current = null;
        });
        audioPlayerRef.current.addEventListener('error', (e) => {
          setIsPlaying(false);
          audioIdRef.current = null;
        });
      }

      audioPlayerRef.current.src = streamUrl;
      audioPlayerRef.current.play().catch(e => {
        setIsPlaying(false);
        audioIdRef.current = null;
      });
      setIsPlaying(true);
    } catch (error) {
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.assistantMessageContainer}>
      <div className={styles.assistantMessage}>
        <Markdown>{text}</Markdown>
      </div>
      {isStreamFinished && <img
        className={styles.playPauseButton}
        alt="Pokreni audio"
        onClick={handlePlayPause}
        src={
          isPlaying
            ? `/pause-button-round-icon${isDarkTheme ? '-dark' : ''}.svg`
            : `/play-button-round-icon${isDarkTheme ? '-dark' : ''}.svg`
        }
      />}
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

const Message = ({ role, text, helpMessage, selectedModel, isStreamFinished, isDarkTheme }: MessageProps) => {
  if (text === "$$$$") {
    return helpMessage;
  }

  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} selectedModel={selectedModel} isStreamFinished={isStreamFinished} isDarkTheme={isDarkTheme} />;
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

const TypingIndicator = () => (
  <div className={styles.typingIndicator}>
    <span className={styles.typingDot}></span>
    <span className={styles.typingDot}></span>
    <span className={styles.typingDot}></span>
  </div>
);

const ENABLE_LOGGING = typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true';

const Chat = ({
  functionCallHandler = () => Promise.resolve(""),
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const handleRecognizedSpeech = (recognizedText: string) => {
    setUserInput(recognizedText);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDarkTheme(document.body.classList.contains('dark-theme'));

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            setIsDarkTheme(document.body.classList.contains('dark-theme'));
          }
        });
      });

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });

      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/speech/tts/get_models",
          {
            method: "GET",
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }
        const data = await response.json();
        setModels(data.models);
        setSelectedModel(data.models[0]);
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };

    fetchModels();
  }, []);

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
  };


  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  const sendMessage = async (text) => {
    setLoading(true);
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
    setLoading(true);
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

  const handleTextCreated = () => {
    appendMessage(setMessages, "assistant", "");
  };

  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(setMessages, delta.value);
    };
  };

  const handleImageFileDone = (image) => {
    appendToLastMessage(setMessages, `\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage(setMessages, "code", "");
  };

  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(setMessages, delta.code_interpreter.input);
  };

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

  const handleRunCompleted = () => {
    setInputDisabled(false);
    setLoading(false);
    markLastMessageAsFinished(setMessages);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    stream.on("imageFileDone", handleImageFileDone);

    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim()) return;
    setLoading(true);
    setUserInput("");

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput, isStreamFinished: true },
    ]);

    const quickQuestionIntent = handleQuickQuestion(userInput);
    if (quickQuestionIntent) {
      const response = handleAccessibilityAction(quickQuestionIntent);
      if (response) {
        setMessages(currentMessages => [
          ...currentMessages,
          { role: "assistant", text: response, isStreamFinished: true }
        ]);
        setInputDisabled(false);
        setLoading(false);
        scrollToBottom(messagesEndRef);
        return;
      }
    }

    const intent = await analyzeAccessibilityIntent(userInput);

    if (intent && (
      intent.intentType === "GENERAL_QUERY" ||
      (intent.confidence > 0.3 && intent.confidence < 0.7) ||
      (intent.intentType !== "NOT_ACCESSIBILITY" && intent.confidence < 0.7)
    )) {
      setMessages(currentMessages => [
        ...currentMessages,
        { role: "assistant", text: `$$$$`, isStreamFinished: true }
      ]);
      setInputDisabled(false);
      setLoading(false);
      scrollToBottom(messagesEndRef);
      return;
    }

    if (intent && intent.confidence >= 0.7) {
      const response = handleAccessibilityAction(intent);
      if (response) {
        setMessages(currentMessages => [
          ...currentMessages,
          { role: "assistant", text: response }
        ]);
        setInputDisabled(false);
        setLoading(false);
        scrollToBottom(messagesEndRef);
        return;
      }
    }

    sendMessage(userInput);
    scrollToBottom(messagesEndRef);
  };

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

  function shouldShowTypingIndicator(loading: boolean, messages: any[]): boolean {
    if (!loading) return false;
    if (!messages.length) return true;
    const last = messages[messages.length - 1];
    return last.role !== "assistant" || last.text === "";
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message 
            key={index} 
            role={msg.role} 
            text={msg.text} 
            selectedModel={selectedModel}
            isStreamFinished={msg.isStreamFinished}
            isDarkTheme={isDarkTheme}
            helpMessage={
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
            } 
          />
        ))}
        {shouldShowTypingIndicator(loading, messages) && <TypingIndicator />}
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
        <RecordAudio onRecognize={handleRecognizedSpeech} />
        <ModelSelectorDropdown
          models={models}
          selectedModel={selectedModel}
          handleModelSelect={handleModelSelect}
      />
      </form>
    </div>
  );
};

export default Chat;
