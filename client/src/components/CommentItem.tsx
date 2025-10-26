import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserLevelBadge from "./UserLevelBadge";

interface CommentItemProps {
  username: string;
  avatarUrl?: string;
  level: number;
  content: string;
  timeAgo: string;
}

export default function CommentItem({
  username,
  avatarUrl,
  level,
  content,
  timeAgo,
}: CommentItemProps) {
  const initials = username.slice(0, 2).toUpperCase();

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
      </div>
    </div>
  );
}
