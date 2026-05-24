import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const apolloAccounts = sqliteTable("apolloAccounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account: text("account").notNull(),
  encryptedKey: text("encrypted_key").notNull()
})
