import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { model } from "~/models";
import { Langfuse } from "langfuse";
import { env } from "~/env";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check authentication
  const { auth } = await import("~/server/auth/index");
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Initialize Langfuse client
  const langfuse = new Langfuse({
    environment: env.NODE_ENV,
  });

  // Create Langfuse trace as early as possible (no sessionId yet)
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  // Rate limit logic
  const {
    getUserRequestsToday,
    incrementUserRequests,
    isUserAdmin,
    upsertChat,
  } = await import("~/server/db/queries");
  const userId = session.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Langfuse span: check if user is admin
  const adminSpan = trace.span({
    name: "check-user-admin",
    input: { userId },
  });
  const isAdmin = await isUserAdmin(userId);
  adminSpan.end({ output: { isAdmin } });

  const MAX_REQUESTS_PER_DAY = 100;
  if (!isAdmin) {
    // Langfuse span: get user requests today
    const getReqSpan = trace.span({
      name: "get-user-requests-today",
      input: { userId, date: new Date().toISOString() },
    });
    const todayCount = await getUserRequestsToday(userId, new Date());
    getReqSpan.end({ output: { todayCount } });
    if (todayCount >= MAX_REQUESTS_PER_DAY) {
      return new Response("Too Many Requests", { status: 429 });
    }
    // Langfuse span: increment user requests
    const incReqSpan = trace.span({
      name: "increment-user-requests",
      input: { userId, date: new Date().toISOString() },
    });
    await incrementUserRequests(userId, new Date());
    incReqSpan.end({ output: { incremented: true, newCount: todayCount + 1 } });
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  let { messages, chatId, isNewChat } = body;
  let createdChatId = chatId;

  // Use first user message as title (or fallback)
  const firstUserMsg = (msg: Message[]) => msg.find((m) => m.role === "user");
  const title =
    firstUserMsg(messages)?.content?.toString().slice(0, 50) || "New Chat";

  // If this is a new chat, save it before streaming
  if (isNewChat) {
    // Langfuse span: upsert chat (initial)
    const upsertSpan = trace.span({
      name: "upsert-chat-initial",
      input: { userId, chatId: createdChatId, title, messages },
    });
    await upsertChat({
      userId,
      chatId: createdChatId,
      title,
      messages: messages,
    });
    upsertSpan.end({ output: { chatId: createdChatId } });
  } else {
    // If not a new chat, still update trace with sessionId
    trace.update({ sessionId: createdChatId });
  }

  // (trace is now created at the top and updated with sessionId above)

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { z } = await import("zod");
      const { searchSerper } = await import("~/serper");
      const { bulkCrawlWebsites } = await import("~/server/scraper/scraper");

      // If a new chat was just created, notify the frontend
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: createdChatId,
        });
      }

      const result = streamText({
        model,
        messages,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );
              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
                date: result.date,
              }));
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z
                .array(z.string())
                .describe("A list of URLs to scrape for full page content."),
            }),
            execute: async ({ urls }) => {
              const crawlResult = await bulkCrawlWebsites({ urls });
              return crawlResult.results.map(({ url, result }) => {
                if (!result.success) {
                  return { url, markdown: `Error: ${result.error}` };
                }
                return { url, markdown: result.data };
              });
            },
          },
        },
        system: `You are a helpful AI assistant with access to real-time web search capabilities. The current date and time is ${new Date().toLocaleString()}. When answering questions:

1. Always search the web for up-to-date information when relevant
2. ALWAYS format URLs as markdown links using the format [title](url)
3. Be thorough but concise in your responses
4. If you're unsure about something, search the web to verify
5. When providing information, always include the source where you found it using markdown links
6. Never include raw URLs - always use markdown link format
7. When users ask for up-to-date information, use the current date to provide context about how recent the information is
8. IMPORTANT: After finding relevant URLs from search results, ALWAYS use the scrapePages tool to get the full content of those pages. Never rely solely on search snippets.

Your workflow should be:
1. Use searchWeb to find 10 relevant URLs from diverse sources (news sites, blogs, official documentation, etc.)
2. Select 4-6 of the most relevant and diverse URLs to scrape
3. Use scrapePages to get the full content of those URLs
4. Use the full content to provide detailed, accurate answers

Remember to:
- Always scrape multiple sources (4-6 URLs) for each query
- Choose diverse sources (e.g., not just news sites or just blogs)
- Prioritize official sources and authoritative websites
- Use the full content to provide comprehensive answers`,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `chat-agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        onFinish: async ({ text, finishReason, usage, response }) => {
          const responseMessages = response.messages;
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          const title =
            firstUserMsg(updatedMessages)?.content?.toString().slice(0, 50) ||
            "New Chat";
          // Langfuse span: upsert chat (final)
          const upsertFinalSpan = trace.span({
            name: "upsert-chat-final",
            input: {
              userId,
              chatId: createdChatId,
              title,
              messages: updatedMessages,
            },
          });
          await upsertChat({
            userId,
            chatId: createdChatId,
            title,
            messages: updatedMessages,
          });
          upsertFinalSpan.end({ output: { chatId: createdChatId } });
          // Flush Langfuse trace
          await langfuse.flushAsync();
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
