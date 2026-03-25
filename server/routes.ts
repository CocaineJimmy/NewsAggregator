import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertNewsSchema,
  updateNewsSchema,
  insertCommentSchema,
  type User,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Extend Express session types
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Middleware to check authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  next();
}

// Middleware to check admin role
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Доступ запрещен" });
  }
  
  next();
}

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Только изображения разрешены!"));
    }
  },
});

// Auth routes
router.post("/api/register", async (req: Request, res: Response) => {
  try {
    const parsed = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingEmail = await storage.getUserByEmail(parsed.email);
    if (existingEmail) {
      return res.status(400).json({ error: "Email уже используется" });
    }
    
    const existingUsername = await storage.getUserByUsername(parsed.username);
    if (existingUsername) {
      return res.status(400).json({ error: "Имя пользователя уже занято" });
    }
    
    const user = await storage.createUser(parsed);
    req.session.userId = user.id;
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    res.status(500).json({ error: "Ошибка при регистрации" });
  }
});

router.post("/api/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(parsed.email);
    if (!user || user.password !== parsed.password) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ error: "Ваш аккаунт заблокирован" });
    }
    
    req.session.userId = user.id;
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    res.status(500).json({ error: "Ошибка при входе" });
  }
});

router.post("/api/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Ошибка при выходе" });
    }
    res.json({ success: true });
  });
});

router.get("/api/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении данных пользователя" });
  }
});

// Categories routes
router.get("/api/categories", async (req: Request, res: Response) => {
  try {
    const categories = await storage.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении категорий" });
  }
});

// News search route (must be before /api/news/:id)
router.get("/api/news/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q) {
      return res.json([]);
    }
    const newsItems = await storage.searchNews(q);
    res.json(newsItems);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при поиске новостей" });
  }
});

// News routes
router.get("/api/news", async (req: Request, res: Response) => {
  try {
    const categorySlug = req.query.category as string | undefined;
    const newsItems = await storage.getAllNews(categorySlug === "all" ? undefined : categorySlug);
    res.json(newsItems);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении новостей" });
  }
});

router.get("/api/news/:id/related", async (req: Request, res: Response) => {
  try {
    const newsItem = await storage.getNewsById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ error: "Новость не найдена" });
    }
    const related = await storage.getRelatedNews(req.params.id, newsItem.categoryId, 3);
    res.json(related);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении похожих новостей" });
  }
});

router.get("/api/news/:id", async (req: Request, res: Response) => {
  try {
    // Increment views first so the returned data reflects the new count
    await storage.incrementNewsViews(req.params.id);
    
    const newsItem = await storage.getNewsById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ error: "Новость не найдена" });
    }
    
    // Award XP if user is logged in and hasn't viewed this news before
    if (req.session.userId) {
      const hasViewed = await storage.hasUserViewedNews(req.session.userId, req.params.id);
      if (!hasViewed) {
        await storage.recordNewsView(req.session.userId, req.params.id);
        await storage.awardXP(req.session.userId, 5); // 5 XP for viewing news
      }
    }
    
    res.json(newsItem);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении новости" });
  }
});

router.post("/api/news", requireAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      authorId: req.session.userId,
    };
    
    const parsed = insertNewsSchema.parse(data);
    const newsItem = await storage.createNews(parsed);
    res.json(newsItem);
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    res.status(500).json({ error: "Ошибка при создании новости" });
  }
});

router.put("/api/news/:id", requireAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      ...(req.file && { imageUrl: `/uploads/${req.file.filename}` }),
    };
    
    const parsed = updateNewsSchema.parse(data);
    const newsItem = await storage.updateNews(req.params.id, parsed);
    
    if (!newsItem) {
      return res.status(404).json({ error: "Новость не найдена" });
    }
    
    res.json(newsItem);
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    res.status(500).json({ error: "Ошибка при обновлении новости" });
  }
});

router.delete("/api/news/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await storage.deleteNews(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении новости" });
  }
});

// Comments routes
router.get("/api/news/:newsId/comments", async (req: Request, res: Response) => {
  try {
    const comments = await storage.getCommentsByNewsId(req.params.newsId);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении комментариев" });
  }
});

router.post("/api/news/:newsId/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = {
      newsId: req.params.newsId,
      userId: req.session.userId!,
      content: req.body.content,
    };
    
    const parsed = insertCommentSchema.parse(data);
    const comment = await storage.createComment(parsed);
    
    // Award XP for commenting
    await storage.awardXP(req.session.userId!, 10); // 10 XP for commenting
    
    res.json(comment);
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    res.status(500).json({ error: "Ошибка при создании комментария" });
  }
});

// Bookmark routes
router.get("/api/bookmarks", requireAuth, async (req: Request, res: Response) => {
  try {
    const userBookmarks = await storage.getUserBookmarks(req.session.userId!);
    res.json(userBookmarks);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении закладок" });
  }
});

router.get("/api/bookmarks/:newsId", requireAuth, async (req: Request, res: Response) => {
  try {
    const isBookmarked = await storage.isBookmarked(req.session.userId!, req.params.newsId);
    res.json({ isBookmarked });
  } catch (error) {
    res.status(500).json({ error: "Ошибка при проверке закладки" });
  }
});

router.post("/api/bookmarks/:newsId", requireAuth, async (req: Request, res: Response) => {
  try {
    const newsItem = await storage.getNewsById(req.params.newsId);
    if (!newsItem) {
      return res.status(404).json({ error: "Статья не найдена" });
    }
    const isBookmarked = await storage.isBookmarked(req.session.userId!, req.params.newsId);
    if (isBookmarked) {
      await storage.removeBookmark(req.session.userId!, req.params.newsId);
      res.json({ isBookmarked: false });
    } else {
      await storage.addBookmark(req.session.userId!, req.params.newsId);
      res.json({ isBookmarked: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении закладки" });
  }
});

// Profile routes
router.get("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const { password, ...userWithoutPassword } = user;
    const userComments = await storage.getCommentsByUserId(req.params.id);
    
    res.json({
      ...userWithoutPassword,
      comments: userComments,
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении профиля" });
  }
});

router.put("/api/users/:id", requireAuth, upload.single("avatar"), async (req: Request, res: Response) => {
  try {
    if (req.session.userId !== req.params.id) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }
    
    const data: Partial<User> = {
      username: req.body.username,
      ...(req.file && { avatarUrl: `/uploads/${req.file.filename}` }),
    };
    
    const user = await storage.updateUser(req.params.id, data);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении профиля" });
  }
});

// Admin routes
router.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsers();
    const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении пользователей" });
  }
});

router.patch("/api/admin/users/:id/block", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await storage.updateUser(req.params.id, { isBlocked: true });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при блокировке пользователя" });
  }
});

router.patch("/api/admin/users/:id/unblock", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await storage.updateUser(req.params.id, { isBlocked: false });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при разблокировке пользователя" });
  }
});

router.get("/api/admin/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await storage.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении статистики" });
  }
});

export default router;
