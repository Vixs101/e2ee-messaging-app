export function EncryptedBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded border border-app-accent px-2 py-[3px] font-mono text-[10px] tracking-[0.08em] text-app-accent">
      <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
        <rect x="1" y="4" width="7" height="5.5" rx="1" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1"/>
        <path d="M2.5 4V2.8A2 2 0 0 1 6.5 2.8V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      E2E ENCRYPTED
    </div>
  );
}
