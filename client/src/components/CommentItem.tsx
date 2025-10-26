import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import UserLevelBadge from "./UserLevelBadge";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";

interface CommentItemProps {
  id: string;
  username: string;
  avatarUrl?: string;
  level: number;
  content: string;
  timeAgo: string;
  likesCount: number;
  dislikesCount: number;
  userLike?: boolean | null;
  newsId: string;
}

export default function CommentItem({
  id,
  username,
  avatarUrl,
  level,
  content,
  timeAgo,
  likesCount,
  dislikesCount,
  userLike,
  newsId,
}: CommentItemProps) {
  const initials = username.slice(0, 2).toUpperCase();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async (isLike: boolean) => {
      if (userLike === isLike) {
        // Remove like/dislike if clicking the same button
        await apiRequest("DELETE", `/api/comments/${id}/like`);
      } else {
        // Add or change like/dislike
        await apiRequest("POST", `/api/comments/${id}/like`, { isLike });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", newsId, "comments"] });
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) return;
    likeMutation.mutate(true);
  };

  const handleDislike = () => {
    if (!isAuthenticated) return;
    likeMutation.mutate(false);
  };

  return (
    <div className="flex gap-3" data-testid={`comment-${username}`}>
      <Avatar className="h-10 w-10 flex-shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{username}</span>
          <UserLevelBadge level={level} compact />
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm leading-relaxed">{content}</p>
        
        {isAuthenticated && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`h-8 px-2 ${userLike === true ? 'text-green-600' : 'text-muted-foreground'}`}
              data-testid={`button-like-${id}`}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              {likesCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDislike}
              className={`h-8 px-2 ${userLike === false ? 'text-red-600' : 'text-muted-foreground'}`}
              data-testid={`button-dislike-${id}`}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              {dislikesCount}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
