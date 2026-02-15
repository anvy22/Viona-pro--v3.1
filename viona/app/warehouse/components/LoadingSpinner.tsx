import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  showCard?: boolean;
}

export function LoadingSpinner({
  message = "Loading...",
  size = 32,
  showCard = true,
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2
        className="animate-spin text-primary"
        style={{ width: size, height: size }}
      />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="p-12">{content}</Card>;
}
