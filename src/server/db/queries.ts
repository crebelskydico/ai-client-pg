import { db } from "./index";
import { userRequests, users } from "./schema";
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
