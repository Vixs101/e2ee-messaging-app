// src/components/ui/Input.tsx
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-app-subtext">
          {label}
        </label>
      )}
      <input
        {...props}
        className={cn(
          "w-full rounded-md border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none transition-colors placeholder:text-app-subtext/70 focus:border-app-accent",
          error ? "border-app-danger focus:border-app-danger" : "border-app-border",
          className
        )}
      />
      {error && (
        <span className="font-mono text-xs text-app-danger">
          {error}
        </span>
      )}
    </div>
  );
}
