import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  xp: true,
  level: true,
  isAdmin: true,
  isBlocked: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// News table
export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  imageUrl: text("image_url"),
  authorId: varchar("author_id").notNull().references(() => users.id),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNewsSchema = insertNewsSchema.partial();

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type UpdateNews = z.infer<typeof updateNewsSchema>;
export type News = typeof news.$inferSelect;

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsId: varchar("news_id").notNull().references(() => news.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// News views tracking (for awarding XP only once per news per user)
export const newsViews = pgTable("news_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsId: varchar("news_id").notNull().references(() => news.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure a user can only view a news article once for XP purposes
  uniqueUserNews: unique().on(table.userId, table.newsId),
  // Index for fast lookups
  userNewsIdx: index("idx_news_views_user_news").on(table.userId, table.newsId),
}));

export type NewsView = typeof newsViews.$inferSelect;

// Comment likes table
export const commentLikes = pgTable("comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  isLike: boolean("is_like").notNull(), // true for like, false for dislike
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure a user can only like/dislike a comment once
  uniqueUserComment: unique().on(table.userId, table.commentId),
  // Index for fast lookups
  userCommentIdx: index("idx_comment_likes_user_comment").on(table.userId, table.commentId),
  commentIdx: index("idx_comment_likes_comment").on(table.commentId),
}));

export const insertCommentLikeSchema = createInsertSchema(commentLikes).omit({
  id: true,
  createdAt: true,
});

export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;
export type CommentLike = typeof commentLikes.$inferSelect;
