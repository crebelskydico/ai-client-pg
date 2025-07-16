import type { Message } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";
export type MessagePart = NonNullable<Message["parts"]>[number];

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const ToolInvocationUIPart = ({
  part,
}: {
  part: Extract<MessagePart, { type: "tool-invocation" }>;
}) => {
  const { toolInvocation } = part;
  return (
    <div className="chat-message-tool">
      <div>
        <strong>Tool:</strong> {toolInvocation.toolName}
      </div>
      <div>
        <strong>Args:</strong>{" "}
        <pre>{JSON.stringify(toolInvocation.args, null, 2)}</pre>
      </div>
      {toolInvocation.state === "result" && toolInvocation.result && (
        <div>
          <strong>Result:</strong>{" "}
          <pre>{JSON.stringify(toolInvocation.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

function renderMessagePart(part: MessagePart, index: number) {
  switch (part.type) {
    case "text":
      return (
        <div
          key={index}
          className="chat-message-text"
          title="TextUIPart: Hover to see type"
        >
          <Markdown>{part.text}</Markdown>
        </div>
      );
    case "tool-invocation":
      return (
        <div
          key={index}
          className="chat-message-tool"
          title="ToolInvocationUIPart: Hover to see type"
        >
          <ToolInvocationUIPart part={part} />
        </div>
      );
    default:
      return (
        <div
          key={index}
          className="chat-message-unknown"
          title={`Unknown MessagePart type: ${part.type}`}
        >
          <em>Unknown part type: {part.type}</em>
        </div>
      );
  }
}

export const ChatMessage = ({
  message: { parts },
  role,
  userName,
}: {
  message: Message;
  role: string;
  userName: string;
}) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {parts?.map((part, idx) => renderMessagePart(part, idx))}
        </div>
        <div className="chat-message-hint">
          <small>
            Hover over each part to see its type. <br />
            MessagePart can be text, tool-invocation, and more.
          </small>
        </div>
      </div>
    </div>
  );
};
