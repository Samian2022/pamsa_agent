# PAMSA: Double Materiality and Pricing Agent

A team web app you can put on Vercel. You and teammates sign in with a shared access code, run staged double-materiality work together, hunt for undisclosed issues, lock a DMA, then build sourced pricing models.

It does **not** dump a finished DMA on the first prompt. The agent researches, presents options, asks you to decide, and will not start pricing models until sign-off is complete.

## What you get

- Team login limited to named people on the allowlist, plus the access code
- Shared engagements the whole team can pick up
- Seven-stage workflow: Discover → Profile → DMA → Sign-off → Scope → Teach → Build
- Persistent discovery log, probing log, and assumption checkpoints
- Pricing methodology teaching (five model types, eight components) before any model is locked
- DIY, agent-build, or hybrid coaching
- Excel export including logs, citations, assumptions, and scenario models

## Local run

1. Copy `.env.example` to `.env.local`
2. Set `ACCESS_CODE`, `AUTH_SECRET`, and at least one of `AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY`
3. Set `TAVILY_API_KEY` if you want live company search (strongly recommended)
4. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, create an engagement.

Local engagements are stored in `.data/` (gitignored).

## Deploy on Vercel so the team can use it

1. Import [this GitHub repo](https://github.com/Samian2022/pamsa_agent) in [Vercel](https://vercel.com/new). Use the **main** branch.
2. Add environment variables from `.env.example` (do not skip `TEAM_ALLOWLIST`, `ACCESS_CODE`, `AUTH_SECRET`, and an AI key)
3. Create a **Blob** store in the Vercel project so engagements persist (`BLOB_READ_WRITE_TOKEN`)
4. Deploy. Share the URL with allowlisted teammates only.

Recommended production env:

| Variable | Why |
| --- | --- |
| `ACCESS_CODE` | Shared team password |
| `AUTH_SECRET` | Signs session cookies (`openssl rand -base64 32`) |
| `TEAM_ALLOWLIST` | Required. Named people who can sign in (`Full Name <email>; ...`). Empty means nobody gets in. |
| `AI_GATEWAY_API_KEY` or provider key | The model |
| `TAVILY_API_KEY` | Company / peer / news research |
| `BLOB_READ_WRITE_TOKEN` | Persistent shared storage |

The chat route is allowed to run up to 300 seconds. On Vercel Hobby that may be truncated; Pro / Fluid Compute is the practical plan for a research agent.

## How a session works

1. Agent asks for search criteria, including whether you want to build models yourself
2. Ranked 5 to 7 company table with disclosure-maturity and likely blind spots
3. You pick a company
4. Snapshot + data-gap inventory
5. Stakeholders, peer-gap discovery cards, scored DMA. You probe and the log records revisions.
6. You tick every DMA sign-off item
7. You choose 2 to 4 issues, model types (cost / revenue / capex / WACC / hybrid), and build mode
8. The agent teaches the framework, then a numbered example, then you validate every critical assumption
9. Scenario models (base / stress / upside) with sourced assumptions
10. Export Excel for course / client delivery

## Security notes

- Do not publish the access code
- API keys stay server-side; never prefix them with `NEXT_PUBLIC_`
- Blob objects are stored as private JSON
- This is a private team tool, not a public chatbot
