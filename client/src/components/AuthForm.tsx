import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        toast({
          title: "Вход выполнен",
          description: `Добро пожаловать!`,
        });
      } else {
        await register(email, username, password);
        toast({
          title: "Регистрация завершена",
          description: "Ваш аккаунт успешно создан!",
        });
      }
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || (mode === "login" ? "Ошибка входа" : "Ошибка регистрации"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "Вход" : "Регистрация"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Введите ваши данные для входа в систему"
              : "Создайте новый аккаунт для доступа ко всем возможностям"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="username">Никнейм</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ваш никнейм"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  data-testid="input-username"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit">
              {isLoading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? (
              <>
                Нет аккаунта?{" "}
                <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                  Зарегистрироваться
                </Link>
              </>
            ) : (
              <>
                Уже есть аккаунт?{" "}
                <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                  Войти
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
