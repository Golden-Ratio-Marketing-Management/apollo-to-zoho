import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const apolloAccounts = pgTable("apolloAccounts", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  account: text("account").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
});
