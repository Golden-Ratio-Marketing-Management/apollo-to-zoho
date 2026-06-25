import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$default(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date())
})

export const sessions = sqliteTable("sessions", {
  id: text("id")
    .primaryKey()
    .$default(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date())
})

export const apolloAccounts = sqliteTable("apolloAccounts", {
  id: text("id")
    .primaryKey()
    .$default(() => crypto.randomUUID()),
  account: text("account").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  adminId: text("admin_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date())
})

export const apolloCompany = sqliteTable("apolloCompany", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  apolloAccountId: text("apollo_account_id").notNull().unique(),
  employeeCount: integer("employee_count").notNull(),
  industry: text("industry").notNull()
})

export const zohoSecrets = sqliteTable("zohoSecrets", {
  id: text("id")
    .primaryKey()
    .$default(() => crypto.randomUUID()),
  encryptedClientId: text("encrypted_client_id").notNull(),
  encryptedClientSecret: text("encrypted_client_secret").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp"
  }).notNull(),
  configuredById: text("configured_by_id").references(() => users.id, {
    onDelete: "set null"
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$default(() => new Date())
})

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  apolloAccounts: many(apolloAccounts)
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}))

export const apolloAccountsRelations = relations(apolloAccounts, ({ one }) => ({
  admin: one(users, {
    fields: [apolloAccounts.adminId],
    references: [users.id]
  })
}))
