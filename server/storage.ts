import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users,
  categories,
  news,
  comments,
  newsViews,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type News,
  type InsertNews,
  type UpdateNews,
  type Comment,
  type InsertComment,
} from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // News
  getAllNews(categorySlug?: string): Promise<(News & { category: Category; author: User; commentsCount: number })[]>;
  getNewsById(id: string): Promise<(News & { category: Category; author: User; commentsCount: number }) | undefined>;
  createNews(newsData: InsertNews): Promise<News>;
  updateNews(id: string, newsData: UpdateNews): Promise<News | undefined>;
  deleteNews(id: string): Promise<void>;
  incrementNewsViews(id: string): Promise<void>;
  
  // Comments
  getCommentsByNewsId(newsId: string): Promise<(Comment & { user: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByUserId(userId: string): Promise<(Comment & { news: News })[]>;
  
  // News Views (for XP tracking)
  hasUserViewedNews(userId: string, newsId: string): Promise<boolean>;
  recordNewsView(userId: string, newsId: string): Promise<void>;
  
  // XP and Levels
  awardXP(userId: string, amount: number): Promise<User | undefined>;
  
  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalNews: number;
    totalComments: number;
    totalViews: number;
  }>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  // News
  async getAllNews(categorySlug?: string): Promise<(News & { category: Category; author: User; commentsCount: number })[]> {
    const query = db
      .select({
        news: news,
        category: categories,
        author: users,
        commentsCount: sql<number>`cast(count(distinct ${comments.id}) as int)`,
      })
      .from(news)
      .leftJoin(categories, eq(news.categoryId, categories.id))
      .leftJoin(users, eq(news.authorId, users.id))
      .leftJoin(comments, eq(news.id, comments.newsId))
      .groupBy(news.id, categories.id, users.id)
      .orderBy(desc(news.createdAt));

    let result;
    if (categorySlug) {
      result = await query.where(eq(categories.slug, categorySlug));
    } else {
      result = await query;
    }

    return result.map(r => ({
      ...r.news,
      category: r.category!,
      author: r.author!,
      commentsCount: r.commentsCount,
    }));
  }

  async getNewsById(id: string): Promise<(News & { category: Category; author: User; commentsCount: number }) | undefined> {
    const result = await db
      .select({
        news: news,
        category: categories,
        author: users,
        commentsCount: sql<number>`cast(count(distinct ${comments.id}) as int)`,
      })
      .from(news)
      .leftJoin(categories, eq(news.categoryId, categories.id))
      .leftJoin(users, eq(news.authorId, users.id))
      .leftJoin(comments, eq(news.id, comments.newsId))
      .where(eq(news.id, id))
      .groupBy(news.id, categories.id, users.id)
      .limit(1);

    if (result.length === 0) return undefined;

    return {
      ...result[0].news,
      category: result[0].category!,
      author: result[0].author!,
      commentsCount: result[0].commentsCount,
    };
  }

  async createNews(newsData: InsertNews): Promise<News> {
    const result = await db.insert(news).values(newsData).returning();
    return result[0];
  }

  async updateNews(id: string, newsData: UpdateNews): Promise<News | undefined> {
    const result = await db
      .update(news)
      .set({ ...newsData, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();
    return result[0];
  }

  async deleteNews(id: string): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }

  async incrementNewsViews(id: string): Promise<void> {
    await db
      .update(news)
      .set({ views: sql`${news.views} + 1` })
      .where(eq(news.id, id));
  }

  // Comments
  async getCommentsByNewsId(newsId: string): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select({
        comment: comments,
        user: users,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.newsId, newsId))
      .orderBy(desc(comments.createdAt));

    return result.map(r => ({
      ...r.comment,
      user: r.user!,
    }));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(comment).returning();
    return result[0];
  }

  async getCommentsByUserId(userId: string): Promise<(Comment & { news: News })[]> {
    const result = await db
      .select({
        comment: comments,
        news: news,
      })
      .from(comments)
      .leftJoin(news, eq(comments.newsId, news.id))
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt));

    return result.map(r => ({
      ...r.comment,
      news: r.news!,
    }));
  }

  // News Views
  async hasUserViewedNews(userId: string, newsId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(newsViews)
      .where(and(eq(newsViews.userId, userId), eq(newsViews.newsId, newsId)))
      .limit(1);
    return result.length > 0;
  }

  async recordNewsView(userId: string, newsId: string): Promise<void> {
    await db.insert(newsViews).values({ userId, newsId }).onConflictDoNothing();
  }

  // XP and Levels
  async awardXP(userId: string, amount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const newXP = user.xp + amount;
    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

    return await this.updateUser(userId, {
      xp: newXP,
      level: newLevel,
    });
  }

  // Stats
  async getStats(): Promise<{
    totalUsers: number;
    totalNews: number;
    totalComments: number;
    totalViews: number;
  }> {
    const usersCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users);
    const newsCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(news);
    const commentsCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(comments);
    const viewsSum = await db.select({ sum: sql<number>`cast(coalesce(sum(${news.views}), 0) as int)` }).from(news);

    return {
      totalUsers: usersCount[0].count,
      totalNews: newsCount[0].count,
      totalComments: commentsCount[0].count,
      totalViews: viewsSum[0].sum,
    };
  }
}

export const storage = new DbStorage();
