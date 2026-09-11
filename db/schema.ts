import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    title: text('title').notNull(),
    created: integer('created').notNull(),
    publishedVersion: text('published_version'),
    publishedAt: integer('published_at'),
    description: text('description').notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    reviewStatus: text('review_status').notNull().default('draft'),
    reviewVersion: text('review_version'),
    reviewRequestedAt: integer('review_requested_at'),
  },
  (t) => [index('projects_owner').on(t.owner)],
);
export const versions = sqliteTable(
  'versions',
  {
    id: text('id').primaryKey(),
    project: text('project')
      .notNull()
      .references(() => projects.id),
    prompt: text('prompt').notNull(),
    html: text('html').notNull(),
    summary: text('summary').notNull(),
    mode: text('mode').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('versions_project').on(t.project)],
);
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  created: integer('created').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  user: text('user')
    .notNull()
    .references(() => users.id),
  expires: integer('expires').notNull(),
});
export const attempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expires: integer('expires').notNull(),
});
export const aiCalls = sqliteTable(
  'ai_calls',
  {
    id: text('id').primaryKey(),
    user: text('user').notNull(),
    created: integer('created').notNull(),
    lease: integer('lease').notNull(),
    status: text('status').notNull(),
  },
  (t) => [
    index('ai_calls_user_created').on(t.user, t.created),
    index('ai_calls_created').on(t.created),
  ],
);
export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    project: text('project')
      .notNull()
      .references(() => projects.id),
    role: text('role').notNull(),
    content: text('content').notNull(),
    status: text('status').notNull(),
    mode: text('mode').notNull(),
    version: text('version'),
    trace: text('trace'),
    created: integer('created').notNull(),
  },
  (t) => [index('messages_project_created').on(t.project, t.created)],
);
export const appData = sqliteTable('app_data', {
  project: text('project')
    .primaryKey()
    .references(() => projects.id),
  data: text('data').notNull(),
  updated: integer('updated').notNull(),
});
