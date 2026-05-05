import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-md px-5 py-2.5 font-mono text-xs font-medium tracking-[0.06em] transition-[opacity,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-50",
        isPrimary
          ? "bg-app-text text-app-bg hover:bg-app-text/90"
          : "border border-app-border bg-transparent text-app-subtext hover:border-app-accent hover:text-app-text",
        className
      )}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}
