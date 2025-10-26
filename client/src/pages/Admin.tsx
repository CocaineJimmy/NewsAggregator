import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, MessageCircle, Eye, Ban, Edit, Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Stats = {
  totalUsers: number;
  totalNews: number;
  totalComments: number;
  totalViews: number;
};

type User = {
  id: string;
  username: string;
  email: string;
  level: number;
  isBlocked: boolean;
  xp: number;
};

type NewsItem = {
  id: string;
  title: string;
  views: number;
  commentsCount: number;
  category: {
    id: string;
    name: string;
  };
};

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/");
      toast({
        title: "Доступ запрещен",
        description: "У вас нет прав для доступа к этой странице",
        variant: "destructive",
      });
    }
  }, [user, setLocation, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user?.isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    enabled: !!user?.isAdmin,
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/block`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Пользователь заблокирован",
        description: "Статус пользователя успешно обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось заблокировать пользователя",
        variant: "destructive",
      });
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/unblock`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Пользователь разблокирован",
        description: "Статус пользователя успешно обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось разблокировать пользователя",
        variant: "destructive",
      });
    },
  });

  const deleteNewsMutation = useMutation({
    mutationFn: async (newsId: string) => {
      const response = await apiRequest("DELETE", `/api/news/${newsId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Новость удалена",
        description: "Новость успешно удалена из системы",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить новость",
        variant: "destructive",
      });
    },
  });

  const handleToggleUserBlock = (userId: string, isBlocked: boolean) => {
    if (isBlocked) {
      unblockUserMutation.mutate(userId);
    } else {
      blockUserMutation.mutate(userId);
    }
  };

  const handleDeleteNews = (newsId: string) => {
    if (confirm("Вы уверены, что хотите удалить эту новость?")) {
      deleteNewsMutation.mutate(newsId);
    }
  };

  // Format number with K suffix
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Панель администратора</h1>
          <Link href="/admin/news/new">
            <Button className="gap-2" data-testid="button-create-news">
              <Plus className="h-4 w-4" />
              Добавить новость
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="stats" className="space-y-8">
          <TabsList>
            <TabsTrigger value="stats" data-testid="tab-stats">Статистика</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Пользователи</TabsTrigger>
            <TabsTrigger value="news" data-testid="tab-news">Новости</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-8">
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Всего пользователей"
                  value={stats.totalUsers.toString()}
                  icon={Users}
                  trend=""
                  trendUp
                />
                <StatCard
                  title="Новостей"
                  value={stats.totalNews.toString()}
                  icon={FileText}
                  trend=""
                  trendUp
                />
                <StatCard
                  title="Комментариев"
                  value={formatNumber(stats.totalComments)}
                  icon={MessageCircle}
                  trend=""
                  trendUp
                />
                <StatCard
                  title="Просмотров"
                  value={formatNumber(stats.totalViews)}
                  icon={Eye}
                  trend=""
                  trendUp
                />
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Уровень</TableHead>
                        <TableHead>XP</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium" data-testid={`text-username-${user.id}`}>{user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Ур. {user.level}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-xp-${user.id}`}>{user.xp}</TableCell>
                          <TableCell>
                            <Badge variant={!user.isBlocked ? "default" : "destructive"}>
                              {!user.isBlocked ? "Активен" : "Заблокирован"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserBlock(user.id, user.isBlocked)}
                              className="gap-2"
                              disabled={blockUserMutation.isPending || unblockUserMutation.isPending}
                              data-testid={`button-toggle-user-${user.id}`}
                            >
                              <Ban className="h-4 w-4" />
                              {!user.isBlocked ? "Заблокировать" : "Разблокировать"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <Card>
              <CardHeader>
                <CardTitle>Управление новостями</CardTitle>
              </CardHeader>
              <CardContent>
                {newsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Просмотры</TableHead>
                        <TableHead>Комментарии</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {news.map((newsItem) => (
                        <TableRow key={newsItem.id}>
                          <TableCell className="font-medium" data-testid={`text-title-${newsItem.id}`}>{newsItem.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{newsItem.category.name}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-views-${newsItem.id}`}>{newsItem.views}</TableCell>
                          <TableCell data-testid={`text-comments-${newsItem.id}`}>{newsItem.commentsCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/news/${newsItem.id}/edit`}>
                                <Button variant="ghost" size="sm" className="gap-2" data-testid={`button-edit-${newsItem.id}`}>
                                  <Edit className="h-4 w-4" />
                                  Редактировать
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNews(newsItem.id)}
                                className="gap-2 text-destructive hover:text-destructive"
                                disabled={deleteNewsMutation.isPending}
                                data-testid={`button-delete-${newsItem.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                                Удалить
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
