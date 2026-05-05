import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { EncryptedBadge } from "../components/EncryptedBadge";
import { unwrapPrivateKey } from "../crypto/keys";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/useAuthStore";
import { wsManager } from "../api/ws";

export function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore(s => s.setSession);

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const username = form.username.trim().toLowerCase();
      const res = await authApi.login(username, form.password);


      const privateKey = await unwrapPrivateKey(
        res.user.wrapped_private_key,
        form.password,
        res.user.pbkdf2_salt
      );

      setSession(res.access_token, res.refresh_token, res.user, privateKey);
      wsManager.connect(res.access_token);
      navigate("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-bg px-4 py-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <div className="mb-3"><EncryptedBadge /></div>
          <h1 className="mb-1.5 font-mono text-[22px] font-medium">
            WhisperBox
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Username" value={form.username} onChange={set("username")} placeholder="john_doe" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required autoComplete="current-password" />

          {error && (
            <p className="font-mono text-xs text-app-danger">{error}</p>
          )}

          <Button type="submit" loading={loading} className="mt-2 cursor-pointer">
            SIGN IN
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-app-subtext">
          No account?{" "}
          <Link to="/register" className="border-b border-app-border text-app-text no-underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
