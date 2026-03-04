import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({
  message = "Loading...",
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-1 w-full items-center justify-center py-20">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
