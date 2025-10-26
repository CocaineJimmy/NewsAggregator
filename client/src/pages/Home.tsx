import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  views: number;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  commentsCount: number;
}

export default function Home() {
  const [location] = useLocation();
  const categorySlug = new URLSearchParams(location.split("?")[1] || "").get("category") || "all";
  
  const { data: newsItems, isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news", categorySlug],
    queryFn: async () => {
      const url = categorySlug === "all" 
        ? "/api/news" 
        : `/api/news?category=${categorySlug}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
  });
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Новости Минска
          </h1>
          <p className="text-lg text-muted-foreground">
            Актуальные события, мероприятия и важные новости столицы
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : newsItems && newsItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.map((newsItem) => (
              <NewsCard
                key={newsItem.id}
                id={newsItem.id}
                title={newsItem.title}
                excerpt={newsItem.excerpt}
                category={newsItem.category.name}
                imageUrl={newsItem.imageUrl || undefined}
                views={newsItem.views}
                commentsCount={newsItem.commentsCount}
                publishedAt={formatDistanceToNow(new Date(newsItem.createdAt), {
                  addSuffix: true,
                  locale: ru,
                })}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Новостей пока нет</p>
          </div>
        )}
      </main>
    </div>
  );
}
