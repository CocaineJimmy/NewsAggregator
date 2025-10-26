import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { Upload, Save } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  categoryId: string;
  imageUrl: string | null;
};

export default function NewsEditor() {
  const [, params] = useRoute("/admin/news/:id/edit");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isEditing = params?.id && params.id !== "new";
  const newsId = params?.id || "";

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

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

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: news, isLoading: newsLoading } = useQuery<NewsItem>({
    queryKey: ["/api/news", newsId],
    enabled: isEditing && !!newsId && newsId !== "new",
  });

  // Populate form when editing
  useEffect(() => {
    if (news && isEditing) {
      setTitle(news.title);
      setCategoryId(news.categoryId);
      setExcerpt(news.excerpt);
      setContent(news.content);
      setImagePreview(news.imageUrl || "");
    }
  }, [news, isEditing]);

  const createNewsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/news", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Ошибка при создании новости");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Новость создана",
        description: "Новость успешно опубликована",
      });
      setLocation("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать новость",
        variant: "destructive",
      });
    },
  });

  const updateNewsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Ошибка при обновлении новости");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news", newsId] });
      toast({
        title: "Новость обновлена",
        description: "Изменения успешно сохранены",
      });
      setLocation("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить новость",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !categoryId || !excerpt.trim() || !content.trim()) {
      toast({
        title: "Заполните все поля",
        description: "Все поля обязательны для заполнения",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("categoryId", categoryId);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    
    if (imageFile) {
      formData.append("image", imageFile);
    }

    if (isEditing) {
      updateNewsMutation.mutate(formData);
    } else {
      createNewsMutation.mutate(formData);
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  if (categoriesLoading || (isEditing && newsLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isPending = createNewsMutation.isPending || updateNewsMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-4xl font-bold mb-8">
          {isEditing ? "Редактировать новость" : "Создать новость"}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок</Label>
              <Input
                id="title"
                placeholder="Введите заголовок новости"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Краткое описание</Label>
              <Textarea
                id="excerpt"
                placeholder="Краткое описание для карточки новости"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="min-h-20"
                data-testid="input-excerpt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Изображение</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate transition-all">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full aspect-[16/9] object-cover rounded-lg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImagePreview("");
                        setImageFile(null);
                      }}
                      type="button"
                    >
                      Изменить изображение
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <Label htmlFor="image" className="cursor-pointer">
                        <Button variant="outline" asChild type="button">
                          <span>Загрузить изображение</span>
                        </Button>
                      </Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        data-testid="input-image"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Рекомендуемый размер: 1200x675 пикселей
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Содержание</Label>
              <Textarea
                id="content"
                placeholder="Полный текст новости..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-96 font-serif text-base leading-relaxed"
                data-testid="input-content"
              />
              <p className="text-xs text-muted-foreground">
                Для полноценного редактора с форматированием используйте rich text editor
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSave} 
                className="gap-2"
                disabled={isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4" />
                {isPending ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/admin")}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
