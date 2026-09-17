"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, accessCode }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not sign in. Check the access code and try again.");
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    router.push("/workspace");
    router.refresh();
  }

  return (
    <main className="organic-bg relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#1a3a2e_0%,transparent_42%),radial-gradient(circle_at_bottom_right,#c85a3833_0%,transparent_36%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <section className="stagger max-w-xl">
          <p className="text-[12px] uppercase tracking-[0.28em] text-sage">Team workspace</p>
          <h1 className="serif mt-4 text-[48px] leading-[1.05] text-forest md:text-[56px]">PAMSA</h1>
          <p className="mt-4 text-[16px] leading-8 text-forest">
            Where rigorous researchers uncover what companies don't disclose. You research, probe,
            score, and lock a double materiality assessment before modeling financial impacts.
            Materiality hidden is risk unpriced.
          </p>
          <ul className="mt-8 space-y-4 text-[14px] leading-6 text-charcoal">
            <li>
              The agent proposes. You decide. Every claim is sourced, every gap documented, every
              assumption flagged.
            </li>
            <li>
              Blind-spot discovery compares the company against peers, upcoming regulation,
              litigation, and news, then invites you to agree or disagree with every finding.
            </li>
            <li>
              Your investigation history is the defense: original claim, your objection, new
              evidence, revised conclusion.
            </li>
            <li>
              Access is limited to named people on the email allowlist. The access code is not
              enough on its own.
            </li>
          </ul>
        </section>

        <form
          onSubmit={onSubmit}
          className={`animate-fade-up rounded-3xl border border-[var(--line)] bg-white/85 p-8 shadow-[0_24px_80px_rgba(26,58,46,0.12)] backdrop-blur ${
            shake ? "animate-[shake_0.4s_ease]" : ""
          }`}
        >
          <h2 className="serif text-[32px] text-forest">Sign in with the team access code</h2>
          <p className="mt-3 text-[14px] leading-6 text-ink-soft">
            Enter the exact name and work email on the team allowlist, plus the shared access
            code. If your name or email is not on the list, you will not get in.
          </p>
          <label className="mt-6 block text-[14px] font-medium">
            Name
            <input
              className="field-input mt-1.5 w-full rounded-xl px-3 py-2.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="mt-4 block text-[14px] font-medium">
            Work email
            <input
              type="email"
              className="field-input mt-1.5 w-full rounded-xl px-3 py-2.5"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="mt-4 block text-[14px] font-medium">
            Access code
            <input
              type="password"
              className="field-input mt-1.5 w-full rounded-xl px-3 py-2.5"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              required
            />
          </label>
          {error ? <p className="mt-4 text-sm text-rust">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="btn-primary mt-6 w-full rounded-full px-4 py-3 text-[14px] font-medium disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Enter workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}
