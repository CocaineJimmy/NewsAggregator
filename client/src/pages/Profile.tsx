import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import Header from "@/components/Header";
import UserLevelBadge from "@/components/UserLevelBadge";
import XPProgress from "@/components/XPProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    news: {
      id: string;
      title: string;
    };
  }>;
};

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  // Set initial values when profile loads
  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setAvatarPreview(profile.avatarUrl || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Ошибка при обновлении профиля");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api", "me"] });
      toast({
        title: "Профиль обновлен",
        description: "Ваши изменения успешно сохранены",
      });
      setIsEditing(false);
      setAvatarFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const formData = new FormData();
    formData.append("username", username);
    
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    
    updateProfileMutation.mutate(formData);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUsername(profile?.username || "");
    setAvatarPreview(profile?.avatarUrl || "");
    setAvatarFile(null);
  };

  // Calculate XP progress
  const calculateXPForNextLevel = (level: number) => {
    return (level * level) * 100;
  };

  const currentXP = profile?.xp || 0;
  const level = profile?.level || 1;
  const xpForCurrentLevel = calculateXPForNextLevel(level - 1);
  const xpForNextLevel = calculateXPForNextLevel(level);
  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  const xpRequiredForLevel = xpForNextLevel - xpForCurrentLevel;

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center space-y-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-4xl font-bold mb-8">Мой профиль</h1>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="h-32 w-32">
                {avatarPreview && <AvatarImage src={avatarPreview} alt={username} />}
                <AvatarFallback className="text-3xl">
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {isEditing && (
                <div className="w-full">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Загрузить фото</span>
                    </Button>
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="input-avatar"
                  />
                </div>
              )}
              
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                  data-testid="button-edit-profile"
                >
                  <Edit className="h-4 w-4" />
                  Редактировать
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button 
                    size="sm" 
                    onClick={handleSave} 
                    className="flex-1" 
                    data-testid="button-save-profile"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                    data-testid="button-cancel-edit"
                    disabled={updateProfileMutation.isPending}
                  >
                    Отмена
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Никнейм</Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    data-testid="input-username"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold" data-testid="text-username">{username}</p>
                    <UserLevelBadge level={level} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-muted-foreground" data-testid="text-email">{profile.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Прогресс</Label>
                <XPProgress
                  currentXP={xpInCurrentLevel}
                  requiredXP={xpRequiredForLevel}
                  level={level}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              История комментариев
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                У вас пока нет комментариев
              </p>
            ) : (
              <div className="space-y-4">
                {profile.comments.map((comment) => (
                  <Link key={comment.id} href={`/news/${comment.news.id}`}>
                    <Card className="hover-elevate transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="font-semibold text-sm hover:text-primary transition-colors" data-testid={`text-comment-news-title-${comment.id}`}>
                            {comment.news.title}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-comment-content-${comment.id}`}>
                            {comment.content}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-comment-date-${comment.id}`}>
                            {formatDistanceToNow(new Date(comment.createdAt), { 
                              addSuffix: true, 
                              locale: ru 
                            })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
