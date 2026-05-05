import { Link } from "react-router-dom";
import { EncryptedBadge } from "../components/EncryptedBadge";
import { Button } from "../components/ui/Button";

export function Landing() {
  return (
    <main className="min-h-dvh bg-app-bg text-app-text">
      <section className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 md:px-6 md:py-8">
        <header className="flex items-center justify-between gap-4 border-b border-app-border pb-4">
          <div>
            <p className="font-mono text-[11px] md:text-xl tracking-[0.12em] text-app-accent">
              WHISPERBOX
            </p>
          </div>
          <EncryptedBadge />
        </header>

        <div className="flex items-center py-10 md:py-14 text-center">
          <div className="w-full">
            <p className="mb-4 font-mono text-[11px] tracking-[0.12em] text-app-subtext">
              PRIVATE CONVERSATIONS, ENCRYPTED IN THE BROWSER
            </p>
            <h1 className="w-full text-4xl font-medium leading-tight md:text-6xl md:leading-[1.05] max-w-2xl mx-auto">
              Private messages for you and yours
            </h1>
            <p className="mt-5 text-base leading-7 text-app-subtext text-center max-w-xl mx-auto">
              WhisperBox is an end-to-end encrypted messaging app. Keys are generated in your browser,
              messages are encrypted before they leave your device, and the interface stays focused on
              clean, direct conversation.
            </p>

            <div className="mt-8 flex justify-center gap-3 flex-col md:flex-row">
              <Link to="/register" className="w-full sm:w-[220px] mx-auto">
                <Button className="cursor-pointer">GET STARTED</Button>
              </Link>
              <Link to="/login" className="w-full sm:w-[220px] mx-auto">
                <Button variant="ghost" className="cursor-pointer">
                  SIGN IN
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

