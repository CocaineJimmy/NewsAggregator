import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentFormProps {
  newsId: string;
  onCommentSubmit?: (content: string) => void;
}

export default function CommentForm({ newsId, onCommentSubmit }: CommentFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;

    onCommentSubmit?.(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Написать комментарий..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-24"
        data-testid="input-comment"
      />
      <Button type="submit" disabled={!content.trim()} data-testid="button-submit-comment">
        Отправить
      </Button>
    </form>
  );
}
