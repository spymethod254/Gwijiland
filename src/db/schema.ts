import { pgTable, text, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";

/** Key/value settings (GitHub token lives here, server-side only) */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Registry of spawned terminal sessions */
export const terminalSessions = pgTable("terminal_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  cwd: text("cwd").notNull(),
  pid: integer("pid"),
  alive: boolean("alive").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

/** Commands typed into the browser terminals */
export const commandHistory = pgTable("command_history", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  command: text("command").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
