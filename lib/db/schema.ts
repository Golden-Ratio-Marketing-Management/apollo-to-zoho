import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const apolloAccounts = sqliteTable("apolloAccounts", {
  id: text("id")
    .primaryKey()
    .$default(() => crypto.randomUUID()),
  account: text("account").notNull(),
  encryptedKey: text("encrypted_key").notNull()
})
