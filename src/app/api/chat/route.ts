import type { Message } from "ai";
import { streamText, createDataStreamResponse } from "ai";
import { model } from "~/models";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check authentication
  const { auth } = await import("~/server/auth/index");
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limit logic
  const { getUserRequestsToday, incrementUserRequests, isUserAdmin } =
    await import("~/server/db/queries");
  const userId = session.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const isAdmin = await isUserAdmin(userId);
  const MAX_REQUESTS_PER_DAY = 100;
  if (!isAdmin) {
    const todayCount = await getUserRequestsToday(userId, new Date());
    if (todayCount >= MAX_REQUESTS_PER_DAY) {
      return new Response("Too Many Requests", { status: 429 });
    }
    await incrementUserRequests(userId, new Date());
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

      const { z } = await import("zod");
      const { searchSerper } = await import("~/serper");

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
              }));
            },
          },
        },
        system: `You are a helpful AI agent with access to a web search tool. Always use the searchWeb tool to answer questions, and always cite your sources with inline links. Format all URLs as markdown links, e.g. [title](url).`,
        maxSteps: 10,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
