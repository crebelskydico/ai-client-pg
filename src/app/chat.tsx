"use client";
import React from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNewChatCreated } from "../utils/is-new-chat-created";
import { Loader2 } from "lucide-react";
import { StickToBottom } from "use-stick-to-bottom";

import type { Message } from "ai";

export interface ChatProps {
  userName: string;
  chatId: string;
  isNewChat: boolean;
  initialMessages?: Message[];
}

export const ChatPage = ({
  userName,
  chatId,
  isNewChat,
  initialMessages,
}: ChatProps) => {
  const router = useRouter();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setInput,
    data,
  } = useChat({
    body: {
      chatId,
      isNewChat,
    },
    initialMessages,
  });

  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];
    if (isNewChatCreated(lastDataItem)) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);
  const [showSignIn, setShowSignIn] = React.useState(false);
  // Assume userName === "Guest" means not authenticated
  const isAuthenticated = userName !== "Guest";
  const isLoading = status === "submitted" || status === "streaming";

  const onHandleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowSignIn(true);
      setInput("");
      return;
    }
    handleSubmit(e);
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="relative mx-auto w-full max-w-[65ch] flex-1 overflow-auto p-4 [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 hover:[&>div]:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
          role="log"
          aria-label="Chat messages"
        >
          <StickToBottom.Content className="flex flex-col">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                role={message.role}
                userName={userName}
              />
            ))}
          </StickToBottom.Content>
        </StickToBottom>

        <div className="border-t border-gray-700">
          <form onSubmit={onHandleSubmit} className="mx-auto max-w-[65ch] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
};
