import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { users, categories } from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminUsers = await db
    .insert(users)
    .values({
      email: "admin@minsk-news.by",
      username: "Администратор",
      password: "admin123", // В production должно быть зашифровано
      isAdmin: true,
    })
    .returning();
  console.log("Created admin user:", adminUsers[0].email);

  // Create default categories
  const defaultCategories = [
    { name: "Все новости", slug: "all" },
    { name: "Мероприятия", slug: "events" },
    { name: "События", slug: "news" },
    { name: "Экономика", slug: "economy" },
    { name: "Технологии", slug: "tech" },
    { name: "Спорт", slug: "sports" },
  ];

  for (const category of defaultCategories) {
    await db.insert(categories).values(category);
    console.log("Created category:", category.name);
  }

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
