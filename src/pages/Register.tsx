import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { EncryptedBadge } from "../components/EncryptedBadge";
import { generateKeyPair, exportPublicKey, generateSalt, wrapPrivateKey } from "../crypto/keys";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/useAuthStore";
import { wsManager } from "../api/ws";
import { getRegistrationErrorMessage } from "@/lib/errors";

export function Register() {
  const navigate = useNavigate();
  const setSession = useAuthStore(s => s.setSession);

  const [form, setForm] = useState({ username: "", display_name: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "generating">("form");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const username = form.username.trim().toLowerCase();
    const displayName = form.display_name.trim();

    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    if (username.length < 3) return setError("Username must be at least 3 characters");
    if (!/^[a-z0-9_]+$/.test(username)) return setError("Username can only contain lowercase letters, numbers, and underscores");

    setLoading(true);
    setStep("generating");

    try {
      // 1. Generate keypair
      const keyPair = await generateKeyPair();
      const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
      const salt = generateSalt();
      const wrappedPrivateKey = await wrapPrivateKey(keyPair.privateKey, form.password, salt);

      // 2. Register
      const res = await authApi.register({
        username,
        display_name: displayName,
        password: form.password,
        public_key: publicKeyB64,
        wrapped_private_key: wrappedPrivateKey,
        pbkdf2_salt: salt,
      });

      // 3. Set session + connect WS
      setSession(res.access_token, res.refresh_token, res.user, keyPair.privateKey);
      wsManager.connect(res.access_token);
      navigate("/chat");
    } catch (err) {
      setError(getRegistrationErrorMessage(err, "Registration failed"));
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-bg px-4 py-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <div className="mb-3">
            <EncryptedBadge />
          </div>
          <h1 className="mb-1.5 font-mono text-[22px] font-medium text-app-text">
            WhisperBox
          </h1>
          <p className="text-[13px] text-app-subtext">Welcome to WhisperBox. Create an account to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Username" value={form.username} onChange={set("username")} placeholder="john_doe" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <Input label="Display name" value={form.display_name} onChange={set("display_name")} placeholder="John Doe" required />
          <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required autoComplete="new-password" />
          <Input label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" required error={error.includes("match") ? error : ""} />

          {error && !error.includes("match") && (
            <p className="font-mono text-xs text-app-danger">{error}</p>
          )}

          {step === "generating" && (
            <p className="font-mono text-[11px] tracking-[0.06em] text-app-accent">
              ⟳ Creating account...
            </p>
          )}

          <Button type="submit" loading={loading} className="mt-2 cursor-pointer">
            CREATE ACCOUNT
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-app-subtext">
          Already have an account?{" "}
          <Link to="/login" className="border-b border-app-border text-app-text no-underline cursor-pointer">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
