import { db } from "./index";
import { userRequests, users, chats, messages } from "./schema";
import type { Message as AIMessage } from "ai";
// ...existing code...

// Upsert chat: create or replace all messages for a chat
export async function upsertChat(opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: AIMessage[];
}) {
  // Check chat ownership
  const chatArr = await db
    .select()
    .from(chats)
    .where(eq(chats.id, opts.chatId));
  const chat = chatArr[0];
  if (chat && chat.userId !== opts.userId) {
    throw new Error("Chat does not belong to user");
  }
  if (!chat) {
    await db.insert(chats).values({
      id: opts.chatId,
      userId: opts.userId,
      title: opts.title,
    });
  } else {
    await db
      .update(chats)
      .set({ title: opts.title })
      .where(eq(chats.id, opts.chatId));
    await db.delete(messages).where(eq(messages.chatId, opts.chatId));
  }
  // Insert new messages
  if (opts.messages.length > 0) {
    await db.insert(messages).values(
      opts.messages.map((m, i) => ({
        chatId: opts.chatId,
        role: m.role,
        parts: m.parts,
        order: i,
      })),
    );
  }
}

// Get a chat by id with its messages
export async function getChat(chatId: string, userId: string) {
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  if (chat.length === 0) return null;
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.order);
  return { ...chat[0], messages: msgs };
}

// Get all chats for a user, without messages
export async function getChats(userId: string) {
  return await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(chats.updatedAt);
}
import { eq, and, gte, lte } from "drizzle-orm";

export async function getUserRequestsToday(userId: string, date: Date) {
  // Get request count for user for today
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const rows = await db
    .select()
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.date, start),
        lte(userRequests.date, end),
      ),
    );
  return rows.length > 0 && rows[0] ? rows[0].count : 0;
}

export async function incrementUserRequests(userId: string, date: Date) {
  // Increment request count for user for today
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const rows = await db
    .select()
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.date, start),
        lte(userRequests.date, end),
      ),
    );
  if (rows.length > 0 && rows[0]) {
    await db
      .update(userRequests)
      .set({ count: (rows[0].count ?? 0) + 1 })
      .where(eq(userRequests.id, rows[0].id));
  } else {
    await db.insert(userRequests).values({ userId, date, count: 1 });
  }
}

export async function isUserAdmin(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId));
  return user.length > 0 && user[0] ? user[0].isAdmin : false;
}
