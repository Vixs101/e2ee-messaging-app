import { cn } from "@/lib/utils";

interface BannerProps {
  message: string;
  variant?: "error" | "info";
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function Banner({
  message,
  variant = "error",
  actionLabel,
  onAction,
  className,
}: BannerProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm",
        variant === "error"
          ? "border-app-danger/50 bg-app-danger/10 text-app-danger"
          : "border-app-accent/40 bg-app-accent/10 text-app-text",
        className
      )}
    >
      <p className="min-w-0 flex-1 leading-5">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 font-mono text-[11px] tracking-[0.06em] underline underline-offset-4"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
