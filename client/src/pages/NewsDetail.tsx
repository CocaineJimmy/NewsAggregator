import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import Header from "@/components/Header";
import CategoryBadge from "@/components/CategoryBadge";
import ShareButton from "@/components/ShareButton";
import CommentForm from "@/components/CommentForm";
import CommentItem from "@/components/CommentItem";
import { Eye, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type NewsWithDetails = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  views: number;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  author: {
    id: string;
    username: string;
  };
  commentsCount: number;
};

type CommentWithUser = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    level: number;
  };
  likesCount: number;
  dislikesCount: number;
  userLike?: boolean | null;
};

export default function NewsDetail() {
  const [, params] = useRoute("/news/:id");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const newsId = params?.id || "";

  const { data: news, isLoading: newsLoading, error: newsError } = useQuery<NewsWithDetails>({
    queryKey: ["/api/news", newsId],
    enabled: !!newsId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/news", newsId, "comments"],
    enabled: !!newsId,
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/news/${newsId}/comments`, { content });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", newsId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "me"] });
      toast({
        title: "Комментарий добавлен!",
        description: "Вы получили +10 XP",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить комментарий",
        variant: "destructive",
      });
    },
  });

  if (newsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="w-full h-96 rounded-xl mb-8" />
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-12 w-3/4 mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </article>
      </div>
    );
  }

  if (newsError || !news) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
          <h1 className="text-2xl font-bold mb-4">Новость не найдена</h1>
          <p className="text-muted-foreground">Возможно, она была удалена или не существует.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {news.imageUrl && (
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-96 object-cover rounded-xl mb-8"
            data-testid="img-news-cover"
          />
        )}
        
        <div className="mb-6">
          <CategoryBadge category={news.category.name} />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" data-testid="text-news-title">
          {news.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span data-testid="text-news-date">
              {format(new Date(news.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span data-testid="text-news-views">{news.views} просмотров</span>
          </div>
          <ShareButton newsId={news.id} title={news.title} />
        </div>

        <div 
          className="prose prose-lg max-w-none font-serif leading-relaxed"
          dangerouslySetInnerHTML={{ __html: news.content }}
          data-testid="text-news-content"
        />

        <Separator className="my-12" />

        <section>
          <h2 className="text-2xl font-bold mb-6" data-testid="text-comments-count">
            Комментарии ({comments.length})
          </h2>
          
          {isAuthenticated ? (
            <div className="mb-8">
              <CommentForm 
                newsId={newsId}
                onCommentSubmit={(content) => commentMutation.mutate(content)}
              />
            </div>
          ) : (
            <div className="mb-8 p-4 border rounded-lg text-center text-muted-foreground">
              Войдите, чтобы оставить комментарий
            </div>
          )}

          {commentsLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id}
                  id={comment.id}
                  username={comment.user.username}
                  avatarUrl={comment.user.avatarUrl || undefined}
                  level={comment.user.level}
                  content={comment.content}
                  timeAgo={formatDistanceToNow(new Date(comment.createdAt), { 
                    addSuffix: true, 
                    locale: ru 
                  })}
                  likesCount={comment.likesCount}
                  dislikesCount={comment.dislikesCount}
                  userLike={comment.userLike}
                  newsId={newsId}
                />
              ))}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
