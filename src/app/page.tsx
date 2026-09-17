"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClimateField } from "@/components/login/climate-field";
import "./login.css";

const FEATURES = [
  {
    lead: "The agent proposes. You decide.",
    rest: " Every claim is sourced, every gap documented, every assumption flagged.",
  },
  {
    lead: "Blind-spot discovery",
    rest: " compares the company against peers, regulation, and news so undisclosed climate and social risks stay visible.",
  },
  {
    lead: "Your investigation history is the defense:",
    rest: " original claim, your objection, new evidence, revised conclusion.",
  },
  {
    lead: "Named people only.",
    rest: " The access code is not enough on its own.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [granted, setGranted] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setGranted(false);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, accessCode }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setPending(false);
      setError(data.error || "Could not sign in. Check the access code and try again.");
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    setGranted(true);
    window.setTimeout(() => {
      router.push("/workspace");
      router.refresh();
    }, 450);
  }

  return (
    <main className="login-page">
      <ClimateField />
      <div className="login-shell">
        <section className="login-left">
          <p className="login-kicker">Team workspace</p>
          <h1 className="login-title">PAMSA</h1>
          <div className="login-rule" />
          <p className="login-intro">
            <strong>Where rigorous researchers uncover what companies don't disclose.</strong>
          </p>
          <p className="login-intro" style={{ marginTop: 14 }}>
            You research, probe, score, and lock a double materiality assessment before modeling
            financial impacts. <strong>Materiality hidden is risk unpriced.</strong>
          </p>
          <ul className="login-features">
            {FEATURES.map((item) => (
              <li key={item.lead}>
                <span className="login-check" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <span>
                  <strong>{item.lead}</strong>
                  {item.rest}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <form
          onSubmit={onSubmit}
          className={`login-card ${shake ? "is-shake" : ""}`}
        >
          <h2>Sign in</h2>
          <p className="lede">
            Enter the exact name and work email on the team allowlist, plus the shared access code.
          </p>
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label>
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Access code
            <input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={`login-submit ${granted ? "is-success" : ""}`}
          >
            {granted ? "Access granted" : pending ? "Verifying access..." : "Enter workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}
