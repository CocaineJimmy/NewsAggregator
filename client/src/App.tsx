import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import NewsDetail from "@/pages/NewsDetail";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Admin from "@/pages/Admin";
import NewsEditor from "@/pages/NewsEditor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/news/:id" component={NewsDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/news/new" component={NewsEditor} />
      <Route path="/admin/news/:id/edit" component={NewsEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
