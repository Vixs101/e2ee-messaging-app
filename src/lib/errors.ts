export type AppErrorKind =
  | "network"
  | "http"
  | "auth"
  | "validation"
  | "crypto"
  | "unknown";

export class AppError extends Error {
  kind: AppErrorKind;
  status?: number;

  constructor(message: string, kind: AppErrorKind = "unknown", status?: number) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceMessage(body: unknown, fallback: string) {
  if (isRecord(body) && typeof body.detail === "string" && body.detail.trim()) {
    return body.detail;
  }
  if (isRecord(body) && typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  return fallback;
}

function statusToKind(status: number): AppErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 400 || status === 409 || status === 422) return "validation";
  return "http";
}

export async function parseApiResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    throw new AppError(
      coerceMessage(body, res.statusText || "Request failed"),
      statusToKind(res.status),
      res.status
    );
  }

  return body as T;
}

export function toAppError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof AppError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppError("Request was cancelled", "unknown");
  }
  if (error instanceof TypeError) {
    return new AppError(
      "Unable to reach the server. Check your connection and try again.",
      "network"
    );
  }
  if (error instanceof Error && error.message.trim()) {
    return new AppError(error.message, "unknown");
  }
  return new AppError(fallback, "unknown");
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  const appError = toAppError(error, fallback);
  if (appError.kind === "network") return appError.message;
  if (appError.kind === "auth") return "Your username or password is incorrect.";
  if (appError.kind === "validation") return appError.message;
  return appError.message || fallback;
}

export function getRegistrationErrorMessage(error: unknown, fallback: string) {
  const appError = toAppError(error, fallback);
  if (appError.kind === "network") return appError.message;
  if (appError.kind === "validation") return appError.message;
  return appError.message || fallback;
}
