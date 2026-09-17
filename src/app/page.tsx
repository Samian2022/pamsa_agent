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
      return;
    }
    router.push("/workspace");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2c4a3e_0%,transparent_42%),radial-gradient(circle_at_bottom_right,#c17a3a33_0%,transparent_36%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <section className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-moss">Team workspace</p>
          <h1 className="serif mt-4 text-5xl leading-[1.05] text-moss-deep md:text-6xl">
            PAMSA
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink-soft">
            PAMSA is a shared workspace for double materiality assessments and the
            pricing models that follow them. The agent researches any company,
            surfaces issues the company and its peers are not disclosing, and helps
            you lock a DMA you can defend. Only after that sign-off does it teach
            you how the financial models work, then build them with you.
          </p>
          <ul className="mt-8 space-y-4 text-sm leading-6 text-ink-soft">
            <li>
              The workflow is stage-gated. You research, profile, score, and sign off
              on the DMA before any pricing model is allowed to start. That keeps
              the financial work from running ahead of the evidence.
            </li>
            <li>
              Blind-spot discovery compares the company against peers, upcoming
              regulation, litigation, and news. The point is to find material issues
              that never made it into the sustainability report.
            </li>
            <li>
              Every number is either sourced or flagged as an assumption. If you
              challenge a finding, the log keeps the original claim, your objection,
              the new evidence, and the revised conclusion.
            </li>
            <li>
              Access is limited to named people on the email allowlist. The access
              code is not enough on its own. Anyone who is not on that list is
              refused until you add them.
            </li>
          </ul>
        </section>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-[var(--line)] bg-white/80 p-8 shadow-[0_24px_80px_rgba(20,32,27,0.12)] backdrop-blur"
        >
          <h2 className="serif text-2xl">Sign in with the team access code</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Enter the exact name and work email that were added to the team
            allowlist, plus the shared access code. If your name or email is not
            on the list, you will not get in, even with the correct code. Ask the
            workspace owner to add you before you try again.
          </p>
          <label className="mt-6 block text-sm font-medium">
            Name
            <input
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 outline-none focus:border-moss"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Work email
            <input
              type="email"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 outline-none focus:border-moss"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Access code
            <input
              type="password"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 outline-none focus:border-moss"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              required
            />
          </label>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-full bg-moss px-4 py-3 text-sm font-semibold text-paper transition hover:bg-moss-deep disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Enter workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}
