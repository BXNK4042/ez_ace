import {
  boolean,
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role").default("student").notNull(),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  temporaryPasswordUsed: boolean("temporary_password_used").default(false).notNull(),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    ...timestamps,
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
});

export const documentKind = pgEnum("document_kind", ["lecture", "summary"]);
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id").notNull().references(() => classes.id),
    kind: documentKind("kind").notNull(),
    filename: text("filename").notNull(),
    pathname: text("pathname").notNull().unique(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("documents_class_created_idx").on(table.classId, table.createdAt)],
);

export const examStatus = pgEnum("exam_status", ["draft", "published", "archived"]);
export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id").notNull().references(() => classes.id),
    title: text("title").notNull(),
    status: examStatus("status").default("draft").notNull(),
    sourceCsv: text("source_csv").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("exams_class_created_idx").on(table.classId, table.createdAt)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
    explanation: text("explanation").notNull(),
  },
  (table) => [uniqueIndex("questions_exam_ordinal_uidx").on(table.examId, table.ordinal)],
);

export const choices = pgTable(
  "choices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
  },
  (table) => [uniqueIndex("choices_question_key_uidx").on(table.questionId, table.key)],
);

export const attemptStatus = pgEnum("attempt_status", ["in_progress", "submitted"]);
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),
    examId: uuid("exam_id").notNull().references(() => exams.id),
    attemptNumber: integer("attempt_number").notNull(),
    status: attemptStatus("status").default("in_progress").notNull(),
    questionOrder: jsonb("question_order").$type<string[]>().notNull(),
    choiceOrder: jsonb("choice_order").$type<Record<string, string[]>>().notNull(),
    score: integer("score"),
    percentage: integer("percentage"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("attempts_user_exam_number_uidx").on(table.userId, table.examId, table.attemptNumber),
    uniqueIndex("attempts_one_in_progress_uidx").on(table.userId, table.examId).where(sql`${table.status} = 'in_progress'`),
    index("attempts_exam_submitted_idx").on(table.examId, table.submittedAt),
  ],
);

export const answers = pgTable(
  "answers",
  {
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id),
    choiceId: uuid("choice_id").notNull().references(() => choices.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.attemptId, table.questionId] })],
);
