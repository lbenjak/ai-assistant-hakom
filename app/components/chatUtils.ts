import { RefObject } from "react";

export function calculateTimeout(message: string): number {
  const words = message.split(" ").length;
  const delayPerWord = 200;
  return words * delayPerWord;
}

export function scrollToBottom(ref: RefObject<HTMLElement | null>) {
  ref.current?.scrollIntoView({ behavior: "smooth" });
}

export function appendToLastMessage(setMessages: Function, text: string) {
  setMessages((prevMessages: any[]) => {
    const lastMessage = prevMessages[prevMessages.length - 1];
    const updatedLastMessage = {
      ...lastMessage,
      text: lastMessage.text + text,
    };
    return [...prevMessages.slice(0, -1), updatedLastMessage];
  });
}

export function appendMessage(setMessages: Function, role: string, text: string) {
  setMessages((prevMessages: any[]) => [...prevMessages, { role, text, isStreamFinished: false }]);
}

export function markLastMessageAsFinished(setMessages: Function) {
  setMessages((prevMessages: any[]) => {
    if (prevMessages.length === 0) return prevMessages;
    const lastMessage = prevMessages[prevMessages.length - 1];
    const updatedLastMessage = {
      ...lastMessage,
      isStreamFinished: true,
    };
    return [...prevMessages.slice(0, -1), updatedLastMessage];
  });
} 