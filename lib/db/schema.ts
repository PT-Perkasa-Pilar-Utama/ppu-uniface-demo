import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const faces = sqliteTable("faces", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    embedding: text("embedding").notNull(), // JSON stringified Float32Array
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

export type Face = typeof faces.$inferSelect;
export type NewFace = typeof faces.$inferInsert;
