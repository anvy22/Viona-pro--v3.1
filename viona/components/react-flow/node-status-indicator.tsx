import { type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type NodeStatus = "loading" | "success" | "error" | "initial";

export type NodeStatusVariant = "overlay" | "border";

export type NodeStatusIndicatorProps = {
  status?: NodeStatus;
  variant?: NodeStatusVariant;
  children: ReactNode;
  className?: string;
};

export const SpinnerLoadingIndicator = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <div className="relative">
      <StatusBorder className="border-blue-700/40">{children}</StatusBorder>

      <div className="bg-background/50 absolute inset-0 z-50 rounded-[9px] backdrop-blur-xs" />
      <div className="absolute inset-0 z-50">
        <span className="absolute top-[calc(50%-1.25rem)] left-[calc(50%-1.25rem)] inline-block h-10 w-10 animate-ping rounded-full bg-blue-700/20" />

        <LoaderCircle className="absolute top-[calc(50%-0.75rem)] left-[calc(50%-0.75rem)] size-6 animate-spin text-blue-700" />
      </div>
    </div>
  );
};

export const BorderLoadingIndicator = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className="relative">
      {/* Animated conic-gradient border layer — sits behind content */}
      <div
        className={cn(
          "absolute -inset-[2px] overflow-hidden rounded-md",
          className,
        )}
      >
        <style>
          {`
            @keyframes node-border-spin {
              from { transform: translate(-50%, -50%) rotate(0deg); }
              to { transform: translate(-50%, -50%) rotate(360deg); }
            }
          `}
        </style>
        <div
          className="absolute left-1/2 top-1/2 aspect-square w-[150%]"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, rgb(59, 130, 246) 0deg, rgb(59, 130, 246) 60deg, transparent 120deg, transparent 360deg)",
            animation: "node-border-spin 2s linear infinite",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      {/* Content sits on top — bg-card masks the gradient center,
          leaving only the 2px border strip visible around the edges */}
      <div className={cn("relative z-10 bg-card rounded-md", className)}>
        {children}
      </div>
    </div>
  );
};

const StatusBorder = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className="relative">
      <div
        className={cn(
          "absolute -inset-[2px] rounded-md border-2",
          className,
        )}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export const NodeStatusIndicator = ({
  status,
  variant = "border",
  children,
  className,
}: NodeStatusIndicatorProps) => {
  switch (status) {
    case "loading":
      switch (variant) {
        case "overlay":
          return <SpinnerLoadingIndicator>{children}</SpinnerLoadingIndicator>;
        case "border":
          return (
            <BorderLoadingIndicator className={className}>
              {children}
            </BorderLoadingIndicator>
          );
        default:
          return <>{children}</>;
      }
    case "success":
      return (
        <StatusBorder className={cn("border-green-500/60", className)}>
          {children}
        </StatusBorder>
      );
    case "error":
      return (
        <StatusBorder className={cn("border-red-500/60", className)}>
          {children}
        </StatusBorder>
      );
    default:
      return <>{children}</>;
  }
};
