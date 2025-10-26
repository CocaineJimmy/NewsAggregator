import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Newspaper } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categories = [
  { id: "all", name: "Все новости" },
  { id: "events", name: "Мероприятия" },
  { id: "news", name: "События" },
  { id: "economy", name: "Экономика" },
  { id: "tech", name: "Технологии" },
  { id: "sports", name: "Спорт" },
];

export default function Header() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  
  const currentCategory = new URLSearchParams(location.split("?")[1] || "").get("category") || "all";

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Ошибка при выходе",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover-elevate px-3 py-2 rounded-lg transition-all">
              <Newspaper className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Новости Минска</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center px-6">
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map((cat) => (
                <Link key={cat.id} href={cat.id === "all" ? "/" : `/?category=${cat.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`whitespace-nowrap ${
                      currentCategory === cat.id
                        ? "border-b-2 border-primary rounded-none"
                        : ""
                    }`}
                    data-testid={`link-category-${cat.id}`}
                  >
                    {cat.name}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.username} />}
                      <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="link-profile">
                    Профиль
                  </DropdownMenuItem>
                  {user?.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="link-admin">
                        Админ-панель
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button size="sm" data-testid="button-login">
                  Войти
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t mt-2 pt-4">
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <Link key={cat.id} href={cat.id === "all" ? "/" : `/?category=${cat.id}`}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      currentCategory === cat.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {cat.name}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
