# THE SHIPSTACKED ATLAS OF THE AGENTIC ECONOMY

### v0.4 — A practitioner's map of the labor market that didn't have a name yesterday

By Thomas Oxlee
Founder, shipstacked.com
Currently embedded as the AI integration operator at a regulated EU business under AI Act exposure

shipstacked.com/atlas

---

## Foreword

CVs were invented in the 15th century. The job title as we know it — a stable, searchable, salary-banded category — is a 20th-century artifact, built for an industrial economy where roles changed on a timescale of decades. Most of the infrastructure we use to find work and find workers — LinkedIn taxonomies, ATS keyword filters, ISCO codes, recruiter Boolean strings, the standard CV format — assumes that what you did last year predicts what you can do this year, and that the role you're hired into has been done before.

That assumption broke in the last 18 to 24 months. It didn't bend. It broke.

We are now in a labor market where the most valuable people are doing work that did not exist as a recognizable role two years ago. The companies that need them often cannot describe what they need; they describe symptoms. *Our Claude integration is bleeding budget. Our agent broke and we don't know why. Our automation half-works and is making a mess of our daily operations. We hired a consultant for €50,000 and now we have a sophisticated system that nobody can operate.* The people who can solve these problems exist. They are not on LinkedIn under the right title. Many of them are not on LinkedIn at all.

On May 4, 2026, Anthropic, Blackstone, Hellman & Friedman, and Goldman Sachs announced a $1.5 billion venture whose stated purpose is to solve "one of the most significant bottlenecks to enterprise AI adoption — the scarcity of engineers who can implement frontier AI systems at speed." OpenAI announced a near-identical $4 billion venture with TPG and Bain the same day. On May 11, 2026, OpenAI formally launched The OpenAI Deployment Company and simultaneously acquired Tomoro — a 150-person UK consultancy — to staff it, because the labor cannot be hired through normal channels at the scale required. ManpowerGroup's 2026 survey of 39,000 employers across 41 countries found that AI Model & Application Development is now the single hardest-to-fill skill in the world, for the first time in the survey's history. Bain estimates half of 1.3 million US AI jobs may go unfilled by 2027. Forrester says 75% of organizations attempting to build AI agents in-house will fail. RAND data shows 80% of AI projects fail to deliver business value. MIT reports 95% of GenAI pilots never reach production.

The labor market has not produced a coordinated response to this because it cannot see the work clearly enough to coordinate. The roles are not named. The supply is not classified. The demand is described in symptoms.

This Atlas is an attempt to name what's happening. It is written by a practitioner — someone currently doing this work at an operating company, an EU regulated business navigating its first agentic deployment under AI Act exposure — not by an analyst observing it from the outside. It is intentionally early. It will be wrong in places. The point is not to be the final word. The point is to put down a stake while the labor market is still legible enough to map, and to invite practitioners to push back.

The Atlas comes in seven parts because the labor surface of the agentic economy has at least seven structurally distinct populations, and forcing them into one taxonomy obscures what's actually happening on the ground.

**Part I — The Workforce.** Twenty-four specialist roles, organized into five clusters, that describe employed labor inside companies adopting AI. Each role gets an automation trajectory: how much of this work will collapse to one-human-plus-agents in the next eighteen months, and how much remains irreducibly human.

**Part II — The Operators.** A new economic unit that does not fit into employment at all. The solo or small-team practitioner who runs a portfolio of agents and rents the output to customers. Five operator types, each described as a *business shape*, not a job title.

**Part III — The Compliance Layer.** The roles emerging at the intersection of AI deployment and regulatory exposure. Restructured into three sub-clusters reflecting how frontier labs actually organize this work: Research-flavored, Operations-flavored, External-partnership-flavored. v0.4 adds explicit EU AI Act Annex III and ISO 42001 mappings per role.

**Part IV — Alignment & Interpretability Research.** A separate research-flavored population, connected to the Anthropic Fellows / MATS / Redwood / ARC pipelines, distinct from the compliance work in Part III. Different career path, different supply pool, different demand pool. v0.4 adds specific program structures and selection criteria.

**Part V — Model Training & RLHF.** The Mercor / Scale AI / Surge AI population. Three tiers. Already a $1B+ market dominated by Mercor; described here for completeness, as it is part of the agentic-economy labor surface even where shipstacked does not directly compete.

**Part VI — Industry Vertical AI Specialists.** Domain practitioners who learned AI, rather than AI practitioners who learned a domain. Healthcare, legal, financial services, defense, manufacturing. Distinct supply pool, distinct compensation curves, increasingly the largest segment of AI hiring globally. v0.4 adds named companies per vertical.

**Part VII — The Practitioner Layer (NEW in v0.4).** The newest and most underpriced labor surface. Domain practitioners who have deeply integrated AI into their primary professional work — lawyers using AI to practice law, doctors using AI to practice medicine, accountants using AI to do accounting. Distinct from Part VI: Part VI is AI-first with domain knowledge; Part VII is domain-first with AI as multiplier. Pool: ~1.5–3M globally. Highest-LTV customer because *other practitioners in the same domain want to hire them*.

A few principles that shape what follows:

- **Roles are described by what people do, not what they're called.** If you do this work, this Atlas is about you.
- **Demand and supply signals are observable.** Where the demand surfaces and where the supply lives.
- **The categories are practitioner-defined, not analyst-defined.** Boundaries are blurry on purpose, because the work is blurry.
- **Automation trajectory is honest.** Several roles described as full-time positions today will be one human plus an agent fleet in eighteen months. Said so by role.
- **The frontier labs are the leading indicator.** Most of the structural specialization in this Atlas was first observed in actual hiring at Anthropic, OpenAI, Palantir, Cursor, Databricks, Cohere. What's at the labs now is at customers in 12-24 months.
- **Crosswalks are provided where confident, flagged where not.** v0.4 adds ISCO-08, SOC 2018, and O*NET codes per role where a confident mapping exists. Where no clean mapping exists, the gap is named explicitly — that gap is one of the reasons this Atlas needs to exist.
- **This is v0.4.** Pull requests welcome.

What follows is the full taxonomy.

---

# PART I — THE WORKFORCE

## The five clusters

**Cluster A — Implementation & Deployment.** The Applied AI super-cluster. Forward-deployed work, integration work, deployment work, transferable delivery work, deployment strategy, partner channel work. Most successful deployments at frontier labs use *paired* roles, not solo specialists. Headcount stable or growing across most of the cluster.

**Cluster B — Reliability & Operations.** The people who keep AI systems running once they're deployed. Substantial automation collapse expected in this cluster within 18 months — the work itself is increasingly agent-amenable.

**Cluster C — Governance, Risk & Compliance.** Summary here; expanded fully in Part III. The buyer is increasingly distinct from the rest of the Workforce, which is why the cluster has its own part.

**Cluster D — Design & Architecture.** The people who decide what AI systems should *do*. Includes the eval-design specialism that frontier labs treat as central infrastructure but that customers are only beginning to recognize.

**Cluster E — Translation & Enablement.** The bridge between technical capability and organizational reality. Implementation leadership, training, fractional executive coverage.

## Notation

🔴 **Resistant** — Irreducibly human. Agents support but cannot replace the core function in the foreseeable horizon. Headcount stable or growing.

🟡 **Partial** — Team size collapses. What was a 3-5 person function becomes 1-2 humans plus an agent fleet within 18 months. Headcount contracts; core role survives.

🟢 **Collapsible** — Within 12-18 months, this is one human supervising agents. The role survives but the headcount per company drops dramatically.

**Crosswalk notation (NEW in v0.4).** Where confident mappings exist, each role is tagged with:

- **ISCO-08** — International Standard Classification of Occupations (used for visa applications, EU AI Act conformity assessments, international government contracts)
- **SOC 2018** — US Standard Occupational Classification (federal contracts, US visa categories, BLS data alignment)
- **O*NET** — Occupational Information Network code (most-granular US-specific taxonomy)

Where no confident mapping exists, the role is tagged `crosswalk: gap` — these gaps are themselves a finding. The agentic-economy labor market has outrun official taxonomies. The Atlas exists in part to fill that gap.

## Specialization axes

Three axes apply across most of Cluster A and parts of D and E. v0.3 made them explicit; v0.4 retains them:

**Axis 1: Pre-sales vs. Post-sales.** Anthropic's Applied AI Architect (pre-sales technical advisor) is structurally different from Anthropic's Solutions Architect (post-sales delivery). Different supply pools, different career paths, different compensation curves.

**Axis 2: Customer Segment.** Enterprise / Federal-Government / Mid-Market / Startups / Industries-Vertical / Partners-Channel. The work differs materially by segment.

**Axis 3: Engagement Model.** Advisory / Forward-Deployed / Paired-with-Deployment-Strategist / Partner-Channel / Embedded-Long-Term.

These are not separate roles. They are dimensions along which the same role specializes. The Atlas notes them per role where they're load-bearing.

---

## CLUSTER A — Implementation & Deployment

### A1. AI Integration Operator 🟡

**What they do.** Take an AI capability and integrate it into the operating reality of a specific company. Wire AI into existing workflows, existing tools, existing data, existing human processes. The work is roughly 30% engineering, 30% operations, 40% organizational translation. Not the same as a software engineer; not the same as a forward-deployed engineer at a frontier lab; closer to a fractional CTO with AI specialism.

**What good looks like.** Sits with a department head, understands the existing workflow in ninety minutes, identifies where AI provides leverage and where it introduces unacceptable risk, ships a working integration in days, not quarters. Obsessive about understanding the *business* before touching the technology. Knows that 80% of AI integration failures are workflow problems, not model problems. Carries a portfolio of integrations described specifically — what shipped, what broke, how it was fixed.

**Demand signals.** Mid-market companies that have bought AI tooling but cannot operationalize it. Job posts titled "AI Implementation Specialist," "AI Deployment Engineer," "AI Solutions Engineer" with the actual work being integration. PE portfolio companies under operating-partner pressure to deploy AI quickly. Any company that has done a 6-month AI pilot and now wants someone to "just make it work."

**Supply signals.** Engineers who have shipped multiple AI integrations across different SaaS products and can describe each one specifically. People who write public technical posts about *connecting* things — Stripe + Claude, Supabase + Anthropic SDK, n8n + custom MCP servers. Solo builders who have shipped a working AI-augmented internal tool at a non-tech company. Polyglot — comfortable across at least three or four different tech stacks.

**Common failure when the wrong person is hired.** Companies hire a "Senior Software Engineer" or "Solutions Architect" and end up with someone who can build clean abstractions but cannot navigate organizational politics, won't go talk to the operations manager, and ships a technically excellent system that nobody uses. Or hire a consultant who delivers a slide deck and leaves before the integration is operational.

**Automation trajectory.** Partial collapse. A 3-5 person integration team becomes 1-2 humans plus an agent fleet within 18 months — the agent fleet handles connector building, configuration, log analysis, and routine integration testing. The human work that remains: organizational translation, executive judgment, navigating workflow politics.

**Specialization.** Most commonly post-sales, mid-market, embedded-long-term. Less commonly pre-sales (where A2 or A6 fits better).

**Crosswalks.** ISCO-08: 2519 (Software and applications developers and analysts, not elsewhere classified) — partial fit; ISCO has no AI-specific code. SOC 2018: 15-1299 (Computer Occupations, All Other) — gap. O*NET: 15-1299.08 (Computer Systems Engineers/Architects) — partial fit. `crosswalk: partial — no AI-integration-specific code exists in any major taxonomy`.

**Adjacent roles.** A2 (Forward Deployed Engineer, more senior, more technical). A5 (Agent System Integrator, transferable-delivery focus). A6 (Deployment Strategist, the strategy-flavored counterpart).

---

### A2. Forward Deployed Engineer (FDE — AI flavor) 🔴

**What they do.** Embed inside a customer company — physically or via deep, sustained engagement — and build production AI systems alongside the customer's team. The role originated at Palantir in the early 2010s, where they were called "Deltas" and where, until 2016, Palantir had more FDEs than software engineers. Revived at scale in 2025-2026 as the dominant pattern for enterprise AI deployment. Indeed reports 800-1000% growth in postings between January and September 2025.

**What good looks like.** Bilingual: deeply technical AND able to operate in a customer's executive room without translation. Reads the customer's quarterly reports before the kickoff meeting. Makes architectural decisions a less senior engineer would defer to product. Ships into production within weeks, not months. Handles pre-sales scoping, post-sales implementation, integration, evaluation, monitoring, and ongoing iteration — sometimes simultaneously. From Palantir's own description: *"FDEs responsibilities look similar to those of a startup CTO: you'll work in small teams and own end-to-end execution of high-stakes projects."*

**Demand signals.** Direct: Anthropic ("Forward Deployed Engineer, Applied AI"), OpenAI (Forward Deployed Software Engineer plus vertical specializations: Life Sciences FDE, Semiconductor FDE, Government FDE), Palantir (the original FDSE role), Salesforce (committed to hiring 1,000 FDEs), Databricks ("AI Engineers, FDE"), Cohere, Ramp, Rippling, Intercom. The Anthropic/Blackstone $1.5B venture is fundamentally an FDE-deployment vehicle. The OpenAI Deployment Company (launched May 11 2026, $10B) acquired Tomoro to gain 150 FDEs from day one. EY launched a UK & Ireland FDE practice in April 2026. Indirect: mid-market companies in healthcare, financial services, legal, manufacturing, retail with a board mandate to deploy AI.

**Supply signals.** Ex-Palantir is the gold standard. Ex-frontier-lab applied AI teams. Senior engineers from AI-native startups (Cursor, Anysphere, Anthropic, OpenAI, Linear, Vercel) open to embedded work. Strong technical writing as a signal — FDEs have to communicate constantly with non-technical executives. People with public case studies of "I went into Company X and shipped Y in eight weeks."

**Common failure when the wrong person is hired.** Companies hire a senior backend engineer who is brilliant but cannot read an exec room. The customer relationship deteriorates within a quarter. Or they hire a former management consultant who can read the room but cannot ship code. Either way, the deployment stalls.

**Automation trajectory.** Resistant. The reading-the-room work, the exec-decision work, the shipping-under-political-pressure work is irreducibly human at this horizon. Agents augment FDEs (research, code generation, documentation) but cannot replace them.

**Specialization.** Vertical specialization is the dominant emerging pattern. OpenAI's vertical FDE org (Life Sciences, Semiconductor, Government) signals where customers are heading. Each vertical has its own scarcity profile and compensation band — Defense and Healthcare command the highest premiums.

**Compensation reality (2026).** Levels.fyi data: average FDE TC $238K, range $205-486K, Staff clearing $630K+. Palantir / OpenAI / Anthropic FDE: $350-550K mid-to-senior TC. UK FDE: £138K average, range £108-186K, top £253K+. Palantir's London FDE function sits in the £155-195K base band at senior levels with significant equity. New York has surpassed San Francisco as the FDE hub (35% vs 11% of postings).

**Crosswalks.** ISCO-08: 2511 (Systems analysts) — partial. SOC 2018: 15-1252 (Software Developers) — partial; SOC has no embedded-customer-engineer code. O*NET: 15-1252.00 (Software Developers) — partial. `crosswalk: gap — FDE is a role pattern, not an occupation; official taxonomies have not absorbed it`.

**Adjacent roles.** A1 (junior version). A6 (Deployment Strategist — the FDE's structural counterpart in the paired model). D2 (Agent System Architect, designs what FDE then builds).

---

### A3. AI Deployment Triage Specialist 🔴

**What they do.** Called in when an AI deployment has failed, partially failed, or is producing unintended consequences. Fixed window, usually 30-90 days, to either rescue or shut down responsibly. Post-failure work, structurally distinct from greenfield deployment. Diagnose what went wrong, stop the bleeding, identify whether the system is salvageable, restore to operation or document the lessons and decommission cleanly.

**What good looks like.** Starts with the operational impact, not the technical architecture. Asks "what's broken in your daily operations because of this system" before "what does the architecture look like." Has done this multiple times. Unflustered by political situations where someone is going to be embarrassed by the diagnosis. Writes clear post-mortems.

**Demand signals.** Companies that publicly announced an AI pilot 6-12 months ago and have gone quiet. Earnings calls where AI initiatives are being de-emphasized after being heavily promoted. Internal job postings for "AI Recovery Lead" or "Senior AI Engineer to assess existing systems." MIT's 95%-of-GenAI-pilots-fail finding and Pluralsight's 65%-of-organizations-have-abandoned-AI-projects finding make this a structural growth role. Pertama Partners 2026 data: 42% of companies abandoned AI initiatives in 2025; failed projects cost average $4.2M-$8.4M depending on failure mode.

**Supply signals.** Senior engineers and architects who have been through one or more AI deployment failures, learned from them, and can articulate the failure pattern. Often the people who *built* the failed system in the first place at a previous company. Public writing about "what went wrong with X" is a strong signal. Background in incident response, SRE, or post-mortem discipline transfers strongly.

**Common failure when the wrong person is hired.** A company brings in a generalist consultant who delivers a strategy deck. Or they bring in the original vendor of the failed system, who has motivated reasoning to keep it running. Or they bring in someone who tries to rebuild from scratch when triage was the right move.

**Automation trajectory.** Resistant. Crisis management, organizational diagnosis, "stopping the bleeding" require human judgment under uncertainty in politically loaded contexts.

**Crosswalks.** `crosswalk: gap`. Closest adjacencies: ISCO-08 2511 (Systems analysts), SOC 2018 13-1199 (Business Operations Specialists, All Other). No incident-response-for-AI-deployments code exists.

**Adjacent roles.** B1 (AI Operations Engineer, ongoing reliability vs. acute crisis). C5 (AI Incident Responder, when failure produces regulatory or reputational consequences).

---

### A4. Agent Workflow Implementer 🟡

**What they do.** Take a designed agent workflow and build it to production. Live in CrewAI, LangGraph, AutoGen, Mastra, the Vercel AI SDK, n8n with AI nodes. Handle the messy parts: state management, retry logic, error handling, tool authorization, observability hooks, cost monitoring. Make agentic systems run reliably under load.

**What good looks like.** Has shipped at least three production agent systems and can describe specifically how each one fails and how they instrumented for it. Paranoid about agent loops, infinite retries, cost spikes, and prompt drift. Writes defensive code. Builds in kill-switches by default.

**Demand signals.** Companies whose AI roadmap has moved from "single LLM call" to "multi-step agent." Postings asking for LangGraph, AutoGen, or CrewAI experience specifically. Vendor partnerships announcing "agentic" features. Any SaaS company under pressure to ship "agent mode." Gartner: 1,445% surge in enterprise inquiries about multi-agent orchestration in 2025.

**Supply signals.** GitHub contributions to agent frameworks. Public projects deploying agents in production. Show HN posts about specific agent architectures. Discord and forum activity in CrewAI, LangGraph, Mastra communities.

**Common failure when the wrong person is hired.** Backend engineer who has read the LangGraph docs and ships an agent that loops infinitely on edge cases or burns through API credits in a weekend. Or prompt engineer who can write good prompts but cannot reason about distributed system reliability.

**Automation trajectory.** Partial. A team of 3-4 implementers becomes 1-2 plus an agent fleet within 18 months. Routine implementation (boilerplate, tests, simple integrations) collapses to agents. Architecture decisions, edge-case debugging, and reliability instrumentation remain human.

**Crosswalks.** ISCO-08: 2512 (Software developers) — partial. SOC 2018: 15-1252 (Software Developers) — partial. O*NET: 15-1252.00 — partial. `crosswalk: partial — agent-specific specialization not yet absorbed by taxonomies`.

**Adjacent roles.** B2 (Agent Reliability Engineer, maintains in production). D2 (Agent System Architect, designs the multi-agent structure).

---

### A5. Agent System Integrator 🔴

**What they do.** Build, package, deploy, and successfully *transfer* an agent or agent system to a customer such that the customer can own and operate it after delivery. The deliverable is a working system, integrated into the customer's actual environment, with the customer's team trained, with documentation, evaluations, monitoring, and a clean handoff. The customer ends up with an asset they own, not a dependency on the integrator. This role exists specifically because every other delivery mode in the market — consultant, FDE, operator, vendor — leaves the customer somewhere short of full ownership of a working system.

**What good looks like.** Has shipped at least three working agent systems into customer environments where, six months later, the customer is still using the system without the integrator's involvement. This is the only signal that matters; most "AI deployments" cannot pass this test. Builds for transfer from day one. Documentation, evaluations, monitoring hooks, runbooks, training materials produced *during* the build, not as an afterthought. Has opinions about scope. Refuses to deliver a system the customer cannot operate, even if the customer is willing to pay. Right-sizes the deliverable. Trains the customer's team during the build, not at the end.

**Demand signals.** Companies burned by previous AI engagements where the consultant left and the system stopped working. SMBs and mid-market companies that explicitly want to *own* a working AI capability internally without permanently renting it. PE portfolio companies whose operating partner wants AI deployed at portfolio scale but needs each company to be operationally self-sufficient. The MSP market growing from $406B (2025) to $846B (2029) at 20.1% CAGR is the broader category; A5 specialists are the AI-specific entrants.

**Supply signals.** Practitioners with consulting backgrounds combined with engineering depth. Often founder-flavored — they have shipped products and know what "operable by someone who isn't me" actually requires. Public artifacts demonstrating clean handoffs: documentation, runbooks, training materials, evaluation frameworks built for previous deliveries.

**Common failure when the wrong person is hired.** A consultant who delivers strategy and a partial build, then leaves; the customer cannot operate what was delivered. Or a vendor whose generic product doesn't fit. Or an FDE who stays embedded and never transfers ownership.

**Automation trajectory.** Resistant. The transfer-of-ownership work — training the customer's team, building the operability layer, making judgment calls about what to include — is irreducibly human.

**Crosswalks.** `crosswalk: gap`. No transfer-of-ownership-engineering code exists. Closest: ISCO-08 2519, SOC 2018 15-1299.

**Adjacent roles.** A1 (less ownership-focused). A2 (sustained embedded vs. transfer-and-leave). F-cluster operators (retain the fleet rather than transfer it).

---

### A6. Deployment Strategist 🔴

**What they do.** The non-engineering counterpart to A2 (FDE) and A5 (Agent System Integrator). Pioneered at Palantir, where the role is called "Echo" internally and where every customer engagement is paired: one Deployment Strategist + one or two FDEs. Salesforce uses the same model — explicit "pods" of one Deployment Strategist plus two FDEs locked onto a single customer for ~3 months. The Deployment Strategist scopes what gets built, wins stakeholder alignment, defines success criteria, and ensures the customer organization absorbs the work. Translates operational reality into technical scope, and translates technical output into operational decisions.

**What good looks like.** Generalist problem-solver who operates in environments where the problem is still forming and the client doesn't yet have language for what is wrong. Can impose structure without oversimplifying reality. Turns incomplete signals into a direction someone with real stakes is willing to follow. Sits with customer analysts to understand critical questions and locate biggest pain points. Identifies relevant datasets through deep engagement with workflows. Tailors workflows to the unique requirements of different user groups. Builds and delivers demos. Scopes potential engagements in new industries.

**Demand signals.** Direct: Palantir (the original DS role, called "Echo"), Salesforce (Deployment Strategist as part of their FDE pods), Anthropic (similar function in Applied AI Architect roles), OpenAI (similar function in Forward Deployed pre-sales; the Tomoro acquisition explicitly brought "Forward Deployed Engineers and Deployment Specialists" to the OpenAI Deployment Company). Indirect: any organization deploying AI at scale that has noticed FDEs alone don't close the customer-organizational-absorption gap. The Anthropic/Blackstone venture will need this role at high volume across PE portfolio deployments.

**Supply signals.** Ex-Palantir Deployment Strategist or "Echo." Strategy consultants from McKinsey/Bain/BCG who have moved into operating roles and learned data fluency. Former product managers from data-heavy environments. People with public writing that demonstrates ability to scope ambiguous problems. Track record of sitting in a room with both a CFO and an ML engineer in the same hour.

**Common failure when the wrong person is hired.** A traditional management consultant who can scope but cannot understand the technical constraints, leading to scope that the engineering team cannot deliver. Or a project manager who can manage scope but cannot win executive trust. Or an engineer promoted into the role who can talk technology but cannot scope the customer's actual operational problem.

**Automation trajectory.** Resistant. The role is fundamentally about reading rooms and scoping ambiguous problems. Both are at the far end of irreducibly-human work.

**Compensation reality.** Palantir: $110-170K base. Senior DS at scale-flavored ventures: $150-220K. Less than FDE because the technical depth is lower; the role is irreplaceable in the paired model.

**Crosswalks.** ISCO-08: 1219 (Business services and administration managers, not elsewhere classified) — partial. SOC 2018: 13-1111 (Management Analysts) — partial. `crosswalk: partial — paired-with-FDE pattern is structural, not occupational`.

**Adjacent roles.** A2 (FDE — the structural pair). A5 (Agent System Integrator — DS scope work feeds A5's transferable delivery). E1 (AI Implementation Lead — broader program-management flavor).

---

### A7. Partner / Channel Solutions Architect 🔴

**What they do.** Bridge between an AI lab/vendor and the partner ecosystem that ultimately delivers AI to end customers. Cultivate technical relationships with cloud partners (AWS, GCP, Azure) and non-cloud partners including Global System Integrators (GSIs) and Regional System Integrators (RSIs). Strengthen relationships with key partners to accelerate indirect revenue. Embed with partner technical teams to support troubleshooting and evangelize their company in the partner's developer community.

**What good looks like.** Strategic technical thought partner to the partnerships team. Deep understanding of partner landscape. Drives key strategic programs with partners. Validates and gathers feedback on products as they relate to use through partners, delivers feedback to relevant internal teams.

**Demand signals.** Direct: Anthropic (Partner Solutions Architect role), OpenAI (similar role in Applied AI; The OpenAI Deployment Company has Bain & Company, Capgemini, McKinsey & Company as explicit consulting and integration partners), every AI-native company at scale. Indirect: as the Anthropic/Blackstone venture and OpenAI/Bain venture scale, partner-channel architecture roles expand at every consultancy and integrator that joins the channel.

**Supply signals.** Ex-Solutions Architect at AWS, GCP, Azure. Ex-Partner Engineer at major SaaS companies. People with public presence in partner technical communities (re:Invent, Google Cloud Next, partner conferences).

**Common failure when the wrong person is hired.** Sales-heavy people who can manage relationships but cannot win technical credibility with partner engineers. Or technical people who cannot navigate the political dimensions of partnership.

**Automation trajectory.** Resistant. Partnership work is fundamentally human.

**Crosswalks.** ISCO-08: 2434 (Information and communications technology sales professionals) — partial. SOC 2018: 41-9031 (Sales Engineers) — partial. O*NET: 41-9031.00 — partial. `crosswalk: partial — AI-specific partner-channel work not yet specialized in taxonomies`.

**Adjacent roles.** E1 (AI Implementation Lead — program-management flavor). A6 (Deployment Strategist — strategy flavor). E4 (Fractional Head of AI — when partnership work is fractional).

---

## CLUSTER B — Reliability & Operations

### B1. AI Operations Engineer 🟢

**What they do.** SRE, but for AI systems. Monitor model and agent behavior in production, detect drift, manage cost, track latency, instrument observability, set up alerting, handle incidents when AI systems misbehave. The on-call function for AI features. Increasingly distinct from traditional SRE because AI failure modes — hallucination, drift, cost explosions, tool-misuse, prompt-injection, jailbreaks — are unfamiliar to people coming from traditional infrastructure.

**What good looks like.** Has built dashboards for at least one production AI system. Has responded to a real production incident involving model behavior, not just infrastructure. Knows what "drift" actually looks like in their domain and how to detect it before users do. Has opinions about evals and uses them as production telemetry.

**Demand signals.** Any company running AI in production at non-trivial scale. Job posts for "AI Reliability Engineer," "AIOps Engineer," "ML Platform Engineer with LLM focus." Particularly hot at companies that have hit a public AI incident — once that happens, they realize they need this role permanently.

**Supply signals.** Background in SRE, DevOps, or infrastructure who have moved into AI. Contributors to evaluation tooling (Langfuse, PromptLayer, Helicone, Phoenix, Arize). People who have written publicly about AI incident response or production AI monitoring.

**Common failure when the wrong person is hired.** Traditional SREs who treat AI systems like deterministic infrastructure. Or ML engineers who can train models but have never operated one in production.

**Automation trajectory.** Collapsible. Within 12-18 months, one human supervises an agent fleet that does the routine monitoring, alert triage, dashboard creation, and incident-runbook execution.

**Crosswalks.** ISCO-08: 2522 (Systems administrators) — partial. SOC 2018: 15-1241 (Computer Network Architects) — gap. O*NET: 15-1244.00 (Network and Computer Systems Administrators) — partial. `crosswalk: partial — AI-specific SRE work is structurally distinct from traditional SRE but taxonomies have not absorbed the distinction`.

**Adjacent roles.** A4 (Agent Workflow Implementer, builds; B1 operates). B2 (Agent Reliability Engineer, agent-specialist version). B4 (Inference Reliability, infrastructure-layer version).

---

### B2. Agent Reliability Engineer 🟢

**What they do.** Specialist version of B1 focused on the unique reliability challenges of agentic systems specifically: multi-step failure cascades, tool-call errors, prompt injection in production, agent loops, cost-per-task variance, infinite retries, MCP server failures, OAuth drift, model fallback strategies.

**What good looks like.** Can describe the three most common ways an agent fails in production and how they would instrument for each. Has run a multi-agent system in production and can talk about specific failure incidents. Deeply skeptical of agent demos and asks specifically about edge cases.

**Demand signals.** Companies running multi-step agentic workflows in production, particularly customer-facing. Postings explicitly mentioning agent reliability or agent observability. Tooling vendors (Datadog, Helicone, Langfuse, Arize) hiring practitioners.

**Supply signals.** Public writing about agent failure modes. Contributors to evaluation frameworks. People who have given talks about "what we learned running X agent in production."

**Common failure when the wrong person is hired.** Traditional ML reliability engineers who don't understand the agent-specific failure surface. Or agent enthusiasts who can build but have not yet operated.

**Automation trajectory.** Collapsible. Self-monitoring agent fleets are already shipping. One human supervises a meta-monitoring agent layer within 12-18 months.

**Crosswalks.** `crosswalk: gap`. No agent-specific reliability code exists in any official taxonomy.

**Adjacent roles.** B1 (broader AI Ops). A4 (the implementation side). C5 (when reliability failures cross into regulatory or reputational territory).

---

### B3. AI Cost & Capacity Operator 🟢

**What they do.** Specialist focused on the economics of running AI in production. Token cost optimization, model routing (small model first, large model fallback), batch vs. real-time decisions, caching strategies, capacity planning, vendor negotiation. Part FinOps, part platform engineering, part vendor management.

**What good looks like.** Has reduced an AI bill by 40-70% at a previous company without degrading user experience. Has opinions about which models to use for which tasks based on cost-quality tradeoffs. Builds automated routing layers. Negotiates with vendors and knows the actual unit economics.

**Demand signals.** Any company whose AI bill has crossed $50K/month. Job posts for "AI FinOps," "AI Cost Engineer," "ML Infrastructure Optimization." Forrester: 25% of 2026 enterprise AI spend being deferred to 2027 because of ROI pressure.

**Supply signals.** FinOps practitioners who have moved into AI. Engineers who have written public posts about cost optimization at specific companies.

**Automation trajectory.** Collapsible. Cost optimization is fundamentally pattern-matching across usage data; agent fleets do this well. One human + cost-optimization fleet replaces a 3-4 person team within 18 months.

**Crosswalks.** ISCO-08: 2421 (Management and organization analysts) — partial. SOC 2018: 13-2099 (Financial Specialists, All Other) — partial. `crosswalk: partial — FinOps-for-AI not yet specialized in taxonomies`.

---

### B4. AI Inference & Model Serving Reliability Engineer 🟡

**What they do.** Distinct from B1, B2, B3. Works at the layer between the model and the application — inference latency, throughput, multi-region deployment, model serving infrastructure, GPU fleet utilization, multi-cloud cost normalization. The role exists at every hyperscaler (AWS, Azure, GCP), every AI infra startup (Modal, Replicate, Together AI, Anyscale, Crusoe), every frontier lab, and increasingly at enterprises running their own GPU fleets.

**What good looks like.** Has built and operated production inference infrastructure at meaningful scale. Has opinions about model serving frameworks (vLLM, TGI, TensorRT, etc.). Builds observability for accelerator fleets. Optimizes compute efficiency at the hardware level.

**Demand signals.** Direct: Anthropic ("Staff + Sr. Software Engineer, AI Reliability"; "Software Engineer, Cloud Inference"; "Software Engineer, Cloud Inference Launch Engineering"; "Software Engineer, Inference Deployment"; "build and operate production data pipelines and observability systems for Anthropic's accelerator fleet"). OpenAI, Google, Meta all hire for this. Hyperscalers, AI infra startups (Modal, Together AI, Anyscale), Crusoe.

**Supply signals.** ML infrastructure engineers from frontier labs or AI-native companies. Backgrounds in distributed systems with ML specialization. Public contributions to inference frameworks.

**Common failure when the wrong person is hired.** Generic ML engineers without infrastructure depth. Or distributed systems engineers without ML model knowledge.

**Automation trajectory.** Partial. Some automation of routine ops, but the architectural and capacity-planning judgment work remains human at this horizon.

**Compensation reality.** $200-400K+ TC at frontier labs and hyperscalers, with significant equity at AI-native infrastructure startups.

**Crosswalks.** ISCO-08: 2523 (Computer network professionals) — partial. SOC 2018: 15-1241 (Computer Network Architects) — partial. `crosswalk: partial`.

**Adjacent roles.** B1 (application-layer reliability). B3 (cost-focused). D2 (architectural overlap).

---

## CLUSTER C — Governance, Risk & Compliance (Summary)

*Cluster C overlaps significantly with Part III (the Compliance Layer) below. The roles described here are the ones that overlap most with general AI workforce concerns. Deeper compliance-specific roles are described in Part III, with explicit EU AI Act Annex III and ISO 42001 mappings added in v0.4.*

### C1. AI Audit & Conformity Lead 🟡

**What they do.** Make AI systems defensible — to auditors, regulators, boards, and customers. Build the documentation, audit trails, evaluation records, model cards, data lineage, and human-in-the-loop guarantees required for compliance with EU AI Act, NYC Local Law 144, Colorado AI Act, emerging US state laws, SOC 2 controls for AI, and customer-driven AI risk assessments.

**What good looks like.** Has shipped at least one conformity assessment under a real regulatory framework. Can read EU AI Act Annex III and tell you in 60 seconds whether a given system is high-risk. Builds governance into the engineering process from day one rather than retrofitting it.

**EU AI Act mapping.** Article 9 (Risk Management System), Article 10 (Data and Data Governance), Article 11 (Technical Documentation), Article 17 (Quality Management System), Article 43 (Conformity Assessment), Annex III categories 1-8. ISO 42001 Clause 6 (Planning), Clause 8 (Operation), Annex A controls A.6.2.6 (AI system impact assessment), A.6.2.8 (AI system release verification).

**Automation trajectory.** Partial. Documentation, audit-trail generation, and compliance reporting collapse to agents. Signed-name attestation, regulatory-judgment calls, and cross-functional negotiation work remain human.

**Crosswalks.** ISCO-08: 2412 (Financial and investment advisers) — gap; the role is compliance-flavored, not finance. SOC 2018: 13-1041 (Compliance Officers) — partial. O*NET: 13-1041.00 (Compliance Officers) — partial. `crosswalk: partial — AI Act-specific compliance work is structurally new`.

### C2. AI Risk & Policy Analyst 🔴

**What they do.** Define what AI can and cannot be used for inside an organization. Write the AI policies, define data use boundaries, set approval workflows. WRITER survey: 67% of executives report data breaches from unapproved AI tools.

**EU AI Act mapping.** Article 4 (AI literacy), Article 5 (Prohibited AI practices), Article 50 (Transparency obligations for providers and deployers). ISO 42001 Clause 5 (Leadership), Annex A controls A.3.2 (AI policy), A.4.2 (AI roles and responsibilities).

**Automation trajectory.** Resistant. Policy is fundamentally a human-decision artifact under ambiguity.

**Crosswalks.** ISCO-08: 2422 (Policy administration professionals) — partial. SOC 2018: 13-1041 (Compliance Officers) — partial. `crosswalk: partial`.

### C3. Model & Vendor Governance Manager 🟢

**What they do.** Manage the ongoing relationship between an organization and its AI vendors. Track which models are in use, monitor vendor terms changes, negotiate enterprise agreements, manage data processing agreements.

**EU AI Act mapping.** Article 25 (Responsibilities along the AI value chain), Article 28 (Obligations of importers), Article 29 (Obligations of distributors), Article 50. ISO 42001 Annex A controls A.10.2 (Supplier relationships), A.10.3 (Supplier AI system requirements).

**Automation trajectory.** Collapsible. Vendor monitoring, contract change tracking, comparison benchmarking are agent-suited tasks.

**Crosswalks.** ISCO-08: 1213 (Policy and planning managers) — partial. SOC 2018: 13-1023 (Purchasing Agents) — partial. `crosswalk: partial`.

### C4. AI Agent Steward 🔴

**What they do.** Monitor deployed agents for ethical, behavioral, and operational compliance. Distinct from B1/B2 because the focus is on *behavior*, not *reliability*. Reviews agent logs, investigates flagged behaviors, manages incident response when agents do something problematic.

**EU AI Act mapping.** Article 14 (Human oversight), Article 26 (Obligations of deployers), Article 72 (Post-market monitoring). ISO 42001 Annex A controls A.8.2 (AI system operation and monitoring), A.9.2 (Performance evaluation).

**Automation trajectory.** Resistant. The human who oversees agent behavior cannot themselves be an agent (trust regression).

**Crosswalks.** `crosswalk: gap`. No agent-stewardship code exists in any taxonomy.

*(For C5-C9 and Part III sub-cluster roles, see Part III.)*

---

## CLUSTER D — Design & Architecture

### D1. AI Workflow Designer 🟡

**What they do.** Redesign business processes so AI can reliably assist, automate, or augment them. Not an agent designer — they don't build the agent. They design the *work* the agent does: intake forms, ticketing templates, handoff protocols, approval steps, exception flows. Reduce ambiguity in workflows so AI outputs are easier to validate and use.

**What good looks like.** Has shipped at least three workflow redesigns where AI was integrated successfully. Starts by mapping the existing workflow in detail, including the informal parts. Understands that 60-80% of AI failure is workflow ambiguity, not model capability.

**Demand signals.** Operations-heavy companies deploying AI. Postings for "AI Workflow Lead," "Process Designer with AI focus." Often hidden inside broader operations or transformation roles. Particularly hot at insurance, healthcare, financial services, professional services.

**Supply signals.** Operations professionals who have learned AI. Six Sigma / Lean practitioners moving into AI integration. Process designers from BPO who picked up AI fluency.

**Automation trajectory.** Partial. Workflow mapping and documentation collapse to agents. Redesign judgment, especially for politically loaded cross-functional processes, remains human.

**Crosswalks.** ISCO-08: 2421 (Management and organization analysts) — partial. SOC 2018: 13-1199 (Business Operations Specialists, All Other) — partial. O*NET: 13-1199.00 — partial.

---

### D2. Agent System Architect 🔴

**What they do.** Design multi-agent systems at the architectural level. Decide which tasks should be agents vs. functions, design tool-call boundaries, architect handoff protocols between agents, design memory and state management at the system level.

**What good looks like.** Has architected at least one multi-agent system that ran in production. Can articulate trade-offs in agent system design (single big agent vs. multiple specialized agents, dynamic vs. static tool sets, memory vs. retrieval). Writes architectural decision records.

**Demand signals.** Companies moving from single-agent to multi-agent systems. Postings for "Agent Architect," "Multi-Agent System Designer," "Senior AI Engineer (Architecture)."

**Supply signals.** Software architects who have moved into AI. Researchers who have shipped production. Conference speakers on multi-agent systems. GitHub maintainers of agent frameworks.

**Automation trajectory.** Resistant. Architectural judgment under uncertainty across multiple stakeholders is the kind of work that gets harder, not easier, with more agents in the loop.

**Crosswalks.** ISCO-08: 2511 (Systems analysts) — partial. SOC 2018: 15-1299.08 (Computer Systems Engineers/Architects) — partial. `crosswalk: partial`.

---

### D3. Prompt and Context Engineer 🟢

**What they do.** Design and maintain the context layer for AI systems — what information the model sees, in what order, structured how. Includes RAG architecture, prompt engineering at the systems level, document chunking strategies, retrieval ranking, context window management, agent skills systems (SKILL.md, sub-agent context patterns), and the bridging-layer between model capability and product experience. Anthropic explicitly hires for this as "Prompt Engineer, Agent Prompts & Evals" and "Prompt and Context Engineers."

**What good looks like.** Has measurably improved an AI system's quality by improving its context layer rather than its model or prompt. Runs experiments. Builds evaluation harnesses that detect context-quality regressions. Has a structured methodology for context design. From Anthropic's own JD: bridges *"the gap between model capabilities and real product experience, working with product teams to build consistent, safe, and beneficial user experiences across all product surfaces."*

**Demand signals.** Direct: Anthropic, OpenAI, every frontier lab and AI-native scaleup. Indirect: any company whose AI quality has plateaued and they've already tried bigger models. Companies adopting RAG at production scale. Postings for "Context Engineer," "Senior Prompt Engineer," "RAG Engineer." Demand grew 135.8% in recent quarters per Coursera salary data; projected CAGR 32.8% through 2030.

**Supply signals.** Public writing about specific RAG implementations and what they learned. Contributors to retrieval libraries. People who have shipped multiple measurable context improvements at named companies.

**Compensation reality.** $100-250K typical, top performers at OpenAI and Anthropic exceed $300K.

**Automation trajectory.** Collapsible. Context experimentation, chunking optimization, retrieval ranking, eval harness running are largely agent-runnable. Human designs methodology; agents execute experiments.

**Crosswalks.** `crosswalk: gap`. No prompt/context engineering code in any official taxonomy yet. This is the single clearest example of the agentic-economy labor market outrunning official classification.

---

### D4. Human-AI Handoff Designer 🔴

**What they do.** Design the moments where AI hands off to humans and vice versa. Where does the agent escalate? What does the human see? What information needs to be preserved? How does the human's decision feed back into the agent? Most production AI systems are not fully autonomous — they are human-AI hybrid systems, and handoff design determines whether the hybrid works.

**What good looks like.** Has shipped at least two production human-AI workflows where the handoff design measurably improved outcomes. Understands both UX and AI behavior. Designs for the human's cognitive load, not just the agent's capability.

**Demand signals.** Customer support orgs deploying AI. Healthcare and legal contexts where humans must remain in the loop. Postings for "AI UX Designer," "Human-AI Interaction Designer."

**Supply signals.** UX designers who have moved into AI. Conversation designers from chatbot era who have leveled up.

**Automation trajectory.** Resistant. Designing for human cognitive load requires humans who understand humans.

**Crosswalks.** ISCO-08: 2166 (Graphic and multimedia designers) — partial. SOC 2018: 27-1024 (Graphic Designers) — gap; the role is interaction-design, not graphic. O*NET: 27-1014.00 (Special Effects Artists and Animators) — gap. `crosswalk: gap`.

---

### D5. AI Evaluations Engineer 🟡

**What they do.** Design eval suites that measure model and agent quality, safety, and reliability before and after deployment. Build evaluation harnesses, run statistical analyses on eval results, identify gaps in eval coverage, productionize evals into model-training and deployment pipelines. The role bridges research methodology and production engineering. From Anthropic's own description of the equivalent role: *"How do we measure whether a model is safe? How do we create evaluations that reflect real-world usage rather than synthetic benchmarks? How do we know our graders are accurate?"*

**What good looks like.** Has built at least one eval suite that influenced a real shipping decision. Understands statistical methodology (Anthropic's published "A statistical approach to model evaluations" paper is foundational). Can decompose an eval failure into model issue vs. eval design issue. Productionizes evals as monitoring telemetry, not one-off measurements.

**Demand signals.** Direct: Anthropic ("Research Engineer, Model Evaluations"; "Applied Safety Research Engineer, Safeguards"), OpenAI, Google DeepMind, every frontier lab. The UK AI Security Institute (AISI) uses Anthropic's open-source Petri tool to evaluate models for sabotage propensity. Indirect: any company shipping AI to production at scale; increasingly any company maturing its AI governance.

**Supply signals.** Public contributions to evaluation tooling (Inspect, Petri, Scout). Authored papers on eval methodology. Contributors to eval frameworks (LangSmith, Braintrust, Phoenix, Promptfoo). Statistics or experimental-design background plus engineering.

**Common failure when the wrong person is hired.** Generic ML engineers without eval-design depth, who produce "vibe-based evals" (OpenAI's term for the anti-pattern). Or statisticians without engineering depth, who can design but cannot productionize.

**Automation trajectory.** Partial. Eval execution and routine grading collapse to agents (Anthropic is already running Automated Alignment Researchers as a research project). Eval methodology design remains human at this horizon.

**Crosswalks.** ISCO-08: 2120 (Mathematicians, actuaries and statisticians) — partial. SOC 2018: 15-2031 (Operations Research Analysts) — partial. `crosswalk: partial — eval-engineering blends statistics, ML, and software engineering in a way taxonomies have not captured`.

**Adjacent roles.** D3 (Prompt and Context Engineer — overlap on production iteration). C-Research roles in Part III (overlap on safety evals). Alignment Researcher in Part IV (overlap on research-flavored eval work).

---

## CLUSTER E — Translation & Enablement

### E1. AI Implementation Lead 🔴

**What they do.** Run AI rollouts inside an organization the way someone used to run cloud migrations. Coordinate stakeholders, define success metrics, manage vendor selection, sequence the rollout, ensure AI integrates cleanly with existing tech and process. Distinct from A1/A2 because they don't build — they orchestrate.

**What good looks like.** Has run a major technology rollout to completion (not necessarily AI). Bilingual between business and technical. Makes hard prioritization calls. Understands AI adoption is 80% organizational change and 20% technology.

**Demand signals.** Mid-market and enterprise companies whose AI strategy has moved beyond pilots. Postings for "AI Program Manager," "AI Implementation Lead," "Director of AI Adoption."

**Supply signals.** Program managers who have run major technology initiatives. Often coming from cloud migration, ERP rollout, or digital transformation work.

**Automation trajectory.** Resistant. Orchestrating organizational change is human work.

**Crosswalks.** ISCO-08: 1330 (Information and communications technology service managers) — partial. SOC 2018: 11-3021 (Computer and Information Systems Managers) — partial.

---

### E2. AI Enablement Trainer 🟢

**What they do.** Build the internal training, playbooks, prompt libraries, usage standards, and "how to work with AI" capability inside an organization. The bottleneck for most enterprises adopting AI is not access — it is effective use.

**What good looks like.** Has trained at least 100 people on AI tools and can describe what worked and what didn't. Builds artifacts that scale rather than relying on 1:1 enablement. Has a methodology for measuring AI fluency, not just AI awareness.

**Demand signals.** Companies that have rolled out AI tools (Copilot, ChatGPT Enterprise, Claude for Enterprise, Glean, Notion AI) and discovered usage is low or inconsistent. Postings for "AI Enablement Lead," "AI Adoption Manager," "Director of AI Training." Particularly hot at companies with $1M+ AI tooling budget but no productivity gain to show. Cognizant Skillspring (April 2026 launch) directly addresses this market.

**Supply signals.** L&D professionals who have moved into AI. Internal evangelists who have led AI rollouts at named companies.

**Automation trajectory.** Collapsible. Training material generation, playbook drafting, Q&A delivery can be largely agent-driven.

**Crosswalks.** ISCO-08: 2424 (Training and staff development professionals) — partial. SOC 2018: 13-1151 (Training and Development Specialists) — partial. O*NET: 13-1151.00 — partial.

---

### E3. AI Translator 🔴

**What they do.** Sit between business stakeholders and technical AI teams, translating in both directions. Distinct from product management because the translation problem is denser and more frequent.

**What good looks like.** Has shipped projects where their translation was the reason the project succeeded. Understands both technical and business sides at depth. Adjustable in altitude — can talk to a CFO and an ML engineer in the same hour.

**Demand signals.** Mid-market and enterprise companies running multiple parallel AI initiatives. Postings for "AI Product Manager (the new flavor)," "AI Solutions Lead."

**Supply signals.** Product managers who have shipped AI features at scale. Strategy consultants who have moved into operating roles.

**Automation trajectory.** Resistant. The translation problem is the human's reason for being.

**Crosswalks.** ISCO-08: 1213 (Policy and planning managers) — partial. SOC 2018: 11-2021 (Marketing Managers) — gap. `crosswalk: gap — translation-as-job has no standard occupational code`.

---

### E4. Fractional Head of AI 🔴

**What they do.** Senior AI leadership, on a fractional basis (typically 8-32 hours per week, $5-20K+/month). Sets AI strategy, sequences initiatives, hires and manages AI teams, reports to board on AI progress. Increasingly common at companies that need senior AI leadership but cannot justify a full-time hire.

**What good looks like.** Has led an AI function at a real company before. Senior enough to be in board conversations and trusted enough to make hiring decisions. Honest about what AI can and cannot do at the company's stage. KORE1 reports the typical engagement runs 3-4 weeks scoping-to-signed, with the role often converting to interim Chief AI Officer if AI budget exceeds $1M annually.

**Demand signals.** Companies that have outgrown "the CTO does AI on the side." Companies whose AI budget is starting to require senior oversight. PE portfolio companies whose operating partner is pushing AI adoption.

**Supply signals.** Former heads of AI at named companies who are now consulting. Senior practitioners with public writing and speaking presence. Alumni of frontier labs or AI-native startups who have moved to fractional work.

**Automation trajectory.** Resistant. Board-room presence cannot be agentized.

**Crosswalks.** ISCO-08: 1112 (Senior government officials) — gap. SOC 2018: 11-1021 (General and Operations Managers) — partial. `crosswalk: gap — fractional executive work is a structural pattern that taxonomies have not absorbed`.

---

## Mechanisms (NEW in v0.4)

Three structural patterns shape how the Part I labor market is actually supplied. Each deserves its own naming.

### Mechanism M1: Acquisition-as-talent-supply

The most consequential acquisition pattern of 2026 is not technology acquisition. It is talent-supply acquisition. Tomoro was the first public example: a 150-person UK consultancy, acquired by OpenAI on May 11, 2026, specifically to staff The OpenAI Deployment Company with Forward Deployed Engineers and Deployment Specialists from day one. The acquisition was not for technology. It was for *labor with Cluster A specialization that cannot be hired through normal channels at the speed required*.

Predictions, stated explicitly so they can be tested:

- **Anthropic acquires a UK or EU consultancy** for the Blackstone venture, within 6-12 months of this Atlas. Likely targets: a 50-200 person AI-specialist consultancy with strong EU AI Act exposure.
- **Google DeepMind acquires** a similar consultancy, likely UK-based given DeepMind's London center of gravity.
- **Mistral acquires** a European Cluster A consultancy, probably French- or German-headquartered, to staff sovereign EU AI deployments.
- **Microsoft expands acqui-hire pace** for Cluster A talent through subsidiaries (Nuance pattern, applied to AI deployment specialists).

Implication for the labor market: senior Cluster A practitioners at small consultancies have a new exit path that did not exist 12 months ago. Compensation at the acquisition-target tier compresses upward as labs bid for talent at acquisition prices, not hiring prices.

### Mechanism M2: The Three-Layer Venture Structure

The Anthropic/Blackstone and OpenAI/TPG/Bain ventures share an explicit three-layer staffing structure:

- **Layer 1 — Frontier lab.** Anthropic or OpenAI proper. The intelligence layer.
- **Layer 2 — Direct-employed FDEs.** Tomoro-flavored. Engineers directly on lab payroll, embedded long-term in customer environments. The deployment layer.
- **Layer 3 — Big-3 consulting channel.** Bain & Company, Capgemini, McKinsey & Company are explicit named partners for The OpenAI Deployment Company. They provide industry-specific specialization, scale, and existing customer relationships.

This is not the consulting industry's first encounter with technology channels — but it is the first time the channel structure has been designed *into* the venture from day one, rather than evolving organically. The implication for Cluster A supply: practitioners at Big-3 firms with AI specialization become highly recruitable in 2026-2027, and Capgemini-tier integrators rapidly expand their AI practice headcount to feed the channel.

### Mechanism M3: "Hiding in plain sight"

Many practitioners doing genuine A1, A2, A4, A6, or D3 work are classified by their employer and by LinkedIn as something generic — "Senior Engineer," "Solutions Consultant," "Tech Lead," "Technical Account Manager," "Senior Product Manager." LinkedIn's taxonomy literally cannot see them. ATS systems filter them out. Recruiters cannot find them with Boolean searches.

This is the single biggest structural mismatch between supply and demand in the agentic-economy labor market. The supply exists. The demand exists. The matching infrastructure is broken because the taxonomy is broken.

shipstacked.com/claim is the structural mechanism by which these practitioners self-classify into the routable supply pool. The Atlas reframes their identity. Claiming an Atlas role moves the practitioner from invisible to addressable.

This is also why the Atlas matters as infrastructure, not just as content. Once Atlas role IDs are referenced by other systems — recruiter agents, HR platforms, government taxonomies — practitioners who claim them become discoverable across the entire labor market, not just inside shipstacked.

---

## Conditional analysis: If OpenAI Frontier wins (NEW in v0.4)

OpenAI's emerging "Frontier" framing — a superapp-style intelligence layer that customer companies configure rather than integrate against — would, if it wins, reshape several Part I roles materially. Said honestly because the labor implications are real:

- **A1 (AI Integration Operator)** shifts from custom integration to configuration and governance of Frontier inside the customer. Headcount per company drops further. Skill profile shifts toward configuration management and policy authoring. Resistant-to-collapse rating downgrades from 🟡 to 🟢.
- **D3 (Prompt and Context Engineer)** shifts toward configuring agent behavior within the Frontier framework rather than building the framework. Skill profile shifts toward systems-thinking within constraints. Demand for raw prompt engineering compresses; demand for in-Frontier policy authoring grows.
- **B-cluster (Reliability & Operations)** shifts from operating customer-specific AI infrastructure to monitoring at the Frontier governance layer. Headcount compression accelerates. B1, B2, B3 collapse trajectory shortens from 18 months to 9-12.
- **D5 (AI Evaluations Engineer)** *gains* importance because customers need lab-independent evaluation methodology. Trust-but-verify becomes the dominant pattern when one intelligence layer governs many company deployments.

This is conditional analysis, not prediction. Frontier may not win. A multi-lab world in which Anthropic, OpenAI, Google, and Mistral all maintain distinct intelligence layers means the integration work in A1 remains structurally important. The point is to name what the labor market looks like under both scenarios.

---

# PART II — THE OPERATORS

## A note before this map

What follows is not a list of jobs. It is a description of a new economic unit that emerged in the last 18 months and does not fit cleanly into any prior category of work. The operator is not an employee. Not a freelancer. Not a consultant. Not an agency. Not a SaaS founder. Not a fractional executive. They share traits with each but are none of them.

Three things became simultaneously possible in 2025-2026 that had never been possible together before: a single human can curate, evaluate, and supervise a portfolio of agents reliable enough to produce real customer-facing output; the cost of running that portfolio is structurally trivial ($300-500/month for a serious stack vs. $80-120K/month for an equivalent team); the market for agent-produced output is real and paying.

Real examples already operating at scale: Pieter Levels at $3M+ ARR solo. Danny Postma at $300K/month with HeadshotPro. Sarah Chen at $420K in 8 months as solo AI design agency. Maor Shlomo's Base44 sold to Wix for $80M in 6 months. Anthropic's Amodei: 70-80% probability of first one-person billion-dollar company in 2026. NVIDIA internally: 100 AI agents per human (7.5M agents serving 75K humans). Jensen Huang at GTC 2026: *"In the future, the IT department of every company is going to be the HR department of AI agents."*

But — and this is critical — the operator pattern is also visible at scaleup level. **Cursor (Anysphere) at $2B ARR with ~50 employees** is the operator pattern at scaleup scale. **Midjourney at $500M revenue with ~107 employees** is the operator pattern at scaleup scale. The pattern isn't just solo. The pattern is *small humans + many agents*, at every size of company.

What follows is the first attempt to name the five operator types I see operating in the field today.

## The five operator types

### F1. The Solo Agent Operator

**What they are.** One human, one curated agent fleet, several customers. The dominant emerging pattern.

**Real examples.** Pieter Levels (Nomad List, RemoteOK, PhotoAI, $3M+ ARR). Danny Postma (HeadshotPro, $300K/month). Sarah Chen (AI design agency, $420K in 8 months). Hundreds of others operating quietly under traditional framing.

**What good looks like.** A small portfolio of customers (3-15 typical) each paying recurring fees ($1-15K/month). Fleet is tuned — evals running, failure modes known, human-in-the-loop checkpoints where it matters. Obsessive about output quality because reputation is the product. Publishes (writing, build-in-public, demo videos) because that's how they're discovered.

**Demand signals.** SMBs and mid-market companies who want specific output but cannot afford an in-house team and don't trust generic SaaS to deliver it. Founders who need leverage but cannot or will not raise capital to hire. Marketing-heavy businesses where output volume matters more than deep relationship.

**Operator signals (recognizing a real one).** Charges recurring fees, not hourly. Revenue not bounded by hours. Portfolio of customers, not a single client. Publishes artifacts demonstrating they understand the unit. Has stories of failures and recoveries.

**Pricing.** $1-3K/month narrow output; $3-8K/month substantial operational coverage; $8-25K/month embedded operators.

**Crosswalks.** `crosswalk: gap`. The operator is a structurally new economic unit. No official code exists; none of ISCO-08, SOC 2018, or O*NET has a "runs portfolio of AI agents for recurring fees" classification.

**Adjacent units.** F2 next size up. F3-F5 specialized variants.

---

### F2. The Boutique Agent Operator

**What they are.** 2-5 humans running multiple specialized agent fleets for multiple customers. Small-agency pattern adapted for the agent era.

**Real examples emerging in 2026.** Bug0 (described publicly: "Outcome-as-a-Service" with two tiers — Studio for self-serve AI test generation, Managed for full FDE pod that owns customer QA). Multiple boutique operators in legal-tech, healthcare-ops, financial research.

**What good looks like.** Systematized the parts of fleet operation that can be (evals, monitoring, customer onboarding, billing) and kept human-decision in the parts that can't (fleet design, customer relationship, judgment on quality). Scales by adding fleets, not headcount. Specialized — generalist boutiques struggle.

**Pricing.** $5-25K/month typical, premium engagements $50K+/month for substantial multi-fleet coverage.

**Crosswalks.** `crosswalk: gap`.

---

### F3. The Vertical Agent Operator

**What they are.** Operator (solo or boutique) specialized in one industry, running fleets tuned to that industry's specific data, workflows, regulatory environment.

**Real examples emerging.** Legal (document review, contract drafting), real estate (BatchData and Cotality MCP integrators), healthcare (intake fleets, scheduling fleets), accounting (Mercury MCP integrators adapted by solo CPAs).

**What good looks like.** Speaks the industry's language fluently. Has shipped fleets that handle the industry's specific edge cases. Customer references within the industry. Understands the regulatory environment for that industry specifically.

**Pricing.** Often higher than F1/F2; $10-50K/month typical for substantive vertical engagements.

**Crosswalks.** `crosswalk: gap`.

---

### F4. The Function Agent Operator

**What they are.** Operator specialized in one cross-industry function (sales operations, customer support, research, recruiting, financial analysis, content production).

**Real examples.** Sales-ops fleet operators serving B2B SaaS. Support fleet operators serving e-commerce. Research fleet operators serving PE firms.

**What good looks like.** Has shipped fleets for the same function across multiple industries. Has clear methodology refined across customers. Has position on canonical metrics for the function.

**Pricing.** Similar to F3. Outcome-based pricing emerges in F4 because metrics are clear (per-deal, per-ticket, per-research-output).

**Crosswalks.** `crosswalk: gap`.

---

### F5. The Integration Agent Operator

**What they are.** Operator running agents that integrate other people's tools and data on behalf of customers. The plumber pattern. Maintains the connective tissue between customer's existing systems and the AI capabilities they want.

**What good looks like.** Has shipped reliable integration layers for at least three customers. Opinions about MCP, OAuth, observability, vendor reliability. Has evals and monitoring for integration quality, not just output quality.

**Demand signals.** Companies whose AI projects are stalling because the integration layer is fragile. Companies with multiple AI vendors who need someone to manage the combined surface.

**Pricing.** Recurring monthly fees ($3-15K typical), often per-integrated-system or per-active-fleet pricing.

**Crosswalks.** `crosswalk: gap`.

---

## The Founding Engineer at AI-native company — a polymath archetype

A note worth flagging: at AI-native companies under 50 people (Cursor, Midjourney, Anysphere, early-stage everywhere), the Atlas roles aren't separate hires. They're aspects of one polymath role. The founding engineer ships features, embeds with strategic customers (FDE work), tunes prompts (D3), runs evals (D5), manages production reliability (B-cluster). Cursor's culture description: "ship-fast, eng-driven, product-impact, flat hierarchy, many-hats." The Atlas describes the specializations but recognizes that early-stage AI-native companies don't separate them.

This affects shipstacked's matching engine: the unit-of-supply varies dramatically by company stage. SMB / mid-market customers want specialists. AI-native scaleups under 50 people want polymaths.

---

## How operators relate to companies — the engagement model

Customers do not *hire* operators. The verb is wrong. They *engage* them.

- Operator retains the fleet. Customer rents the output.
- Pricing is recurring, not project-based.
- Scope is defined by output, not hours.
- Trust is at the founder/operator level.
- Termination is graceful, not catastrophic.

This engagement model does not fit cleanly into existing procurement, legal, or HR frameworks at most companies. That mismatch is one of the friction points slowing operator adoption at large enterprises and one of the reasons SMBs and mid-market companies are adopting operators faster.

---

# PART III — THE COMPLIANCE LAYER

## Why compliance gets its own part

The buyer is different (Chief Compliance Officers, General Counsels, Chief Risk Officers, Heads of Trust & Safety). The calendar is concrete (EU AI Act August 2 2026, NYC LL144, Colorado AI Act, sector-specific frameworks). The unit economics make this the highest-margin part of the agentic-economy labor surface — fines run to 7% of global revenue under EU AI Act.

v0.4 adds explicit EU AI Act Annex III and ISO 42001 mappings per role in this Part. The mappings are practitioner-derived; the AI Act is new enough that authoritative cross-references do not yet exist in any official source. These mappings will be refined as enforcement establishes precedent.

## Three sub-clusters

The Atlas restructures the compliance layer into three sub-clusters reflecting how frontier labs actually organize this work. Anthropic alone has at least nine distinct safety/policy specialisms across these three areas.

### Sub-cluster C-Research (Frontier Red Team flavor)

Research-flavored, future-risks-focused. Lives inside Policy organizations at frontier labs. Anticipates 6-18 month risks. Publishes. Shapes regulation.

**C2. AI Risk & Policy Analyst** — *(also in Cluster C summary)*. Define AI policy at the org level.

**C6. AI Red Team Lead 🔴.** Adversarial testing of AI systems. Splits at frontier labs into multiple sub-specialties:

- *Frontier Red Team (Autonomy)* — Anthropic specifically: build and eval model organisms of autonomous systems and develop defensive agents.
- *Frontier Red Team (Cyber)* — anticipating "expert-level, even superhuman" AI capabilities in cybersecurity domains.
- *Frontier Red Team (Emerging Risks)* — societal-scale risks, novel risks emerging from agents interfacing with the external world.

**EU AI Act mapping.** Article 9 (Risk Management System), Article 15 (Accuracy, robustness and cybersecurity), Article 55 (Obligations for providers of general-purpose AI models with systemic risk). ISO 42001 Annex A controls A.6.2.5 (AI system threat modeling), A.6.2.7 (AI system testing).

**Demand signals.** Anthropic Frontier Red Team across multiple sub-orgs (Autonomy, Cyber, Emerging Risks). OpenAI, Google, Meta equivalents. UK AI Security Institute (AISI). US AI Safety Institute. Increasingly at non-AI-lab companies that deploy AI at scale.

**Supply signals.** Public CTF participation in AI-specific challenges. Contributions to adversarial-AI research. Practitioners with backgrounds at frontier labs or security-conscious AI-native companies. Track record in offensive security research, vulnerability research, exploit development. Research or professional experience applying LLMs to security problems.

**Crosswalks.** ISCO-08: 2529 (Database and network professionals not elsewhere classified) — partial. SOC 2018: 15-1212 (Information Security Analysts) — partial. `crosswalk: partial — AI-specific red team work is structurally distinct`.

### Sub-cluster C-Operations (Safeguards flavor)

Operations-flavored, current-product-protection. Handles deployed-system risks in real time. Lives inside product or trust-and-safety organizations.

**C5. AI Incident Responder 🔴.** Specialist who handles AI incidents *after* they happen. Prompt injection in production. Data exfiltration via agent. Hallucination causing real-world harm. Agent making unauthorized commitments. Closer to security incident response than reliability engineering.

**EU AI Act mapping.** Article 73 (Reporting of serious incidents), Article 79 (Procedure dealing with AI systems presenting a risk). ISO 42001 Annex A controls A.8.4 (AI system incident management), A.9.3 (Internal audit).

**Demand signals.** Direct: Anthropic (Incident Manager, Detection & Response team, "leading incident response efforts and driving systemic improvements post-incident"). Companies running customer-facing AI at scale. Companies in regulated industries where AI incidents trigger regulatory disclosure.

**Supply signals.** Security incident response practitioners who have moved into AI. People who have publicly written about specific AI incidents.

**Crosswalks.** ISCO-08: 2529 — partial. SOC 2018: 15-1212 — partial.

**C8. AI Procurement & Vendor Risk Assessor 🔴.** Pre-purchase risk assessment of AI vendors and AI-enabled SaaS products. Distinct from C3 (ongoing relationship) — C8 is the *intake* role.

**EU AI Act mapping.** Article 25 (Responsibilities along the AI value chain), Article 26 (Obligations of deployers), Article 28 (Obligations of importers). ISO 42001 Annex A controls A.10.2 (Supplier relationships), A.10.4 (Customer requirements).

**What good looks like.** AI-specific vendor assessment framework that goes beyond generic SaaS procurement. Can read a model card and identify gaps. Negotiates AI-specific terms (training-data use, output ownership, model-update notification, incident disclosure obligations).

**Crosswalks.** SOC 2018: 13-1023 (Purchasing Agents) — partial.

**Anthropic Safeguards Red Team (sub-specialty).** Distinct from Frontier Red Team — focuses on current product abuse: coordinated account manipulation, payment fraud, novel exploitation of product features. Anthropic posts: "Red Team Engineer, Safeguards" and "Staff Red Team Specialist, Safeguards."

### Sub-cluster C-External (Trust & Safety flavor)

Partnership-driven, expert-coordination-flavored. Works with external subject-matter experts on policy-specific risks.

**C7. Data Provenance & Training-Data Compliance Officer 🟡.** Track what data was used to train, fine-tune, or RAG-feed a model. Manage copyright and licensing exposure. Handle data subject access requests for AI systems. Manage right-to-be-forgotten in models.

**EU AI Act mapping.** Article 10 (Data and data governance), Article 53 (Obligations for providers of general-purpose AI models — training data summary), Article 60 (Real-world testing data). ISO 42001 Annex A controls A.7.2 (Data quality for AI systems), A.7.3 (Data provenance for AI systems).

**What good looks like.** Can produce a complete data lineage trace for any production AI system on demand. Understands the IP exposure of training-data choices. Has opinions about which licensing frameworks (CC, OpenRail, custom commercial) work for which use cases.

**Crosswalks.** ISCO-08: 2611 (Lawyers) — partial; the role blends legal and engineering. SOC 2018: 13-1041 (Compliance Officers) — partial. `crosswalk: partial`.

**C9. Vulnerable User Protection Lead 🔴.** Specialist focused on AI systems' interactions with minors, healthcare patients, vulnerable populations. The legal exposure here is enormous — children's safety frameworks, patient-protection regulation, accessibility law, all apply to AI systems and most companies have not adapted their AI deployments.

**EU AI Act mapping.** Article 5 (Prohibited AI practices — exploitation of vulnerabilities), Article 9 (Risk management), Annex III categories 1 (biometric), 5 (essential private services), 8 (administration of justice). ISO 42001 Annex A controls A.6.2.6 (AI system impact assessment).

**Demand signals.** Any company whose AI-powered products touch minors, healthcare patients, or vulnerable populations. EdTech, healthtech, fintech consumer products, AI-powered customer service touching vulnerable callers.

**Crosswalks.** `crosswalk: gap`. The role does not exist in official taxonomies.

**Policy Vulnerability Testing (PVT) Coordinator.** Anthropic's own framing for the role that coordinates external subject-matter experts (Thorn for child safety, Institute for Strategic Dialogue on election integrity, Global Project Against Hate and Extremism on radicalization). This is a distinct role: policy expert who orchestrates external testing partnerships.

**EU AI Act mapping.** Article 9 (Risk management), Article 56 (Codes of practice — general-purpose AI providers must contribute to policy development).

---

# PART IV — ALIGNMENT & INTERPRETABILITY RESEARCH

## Why this gets its own part

Alignment and interpretability research is a distinct labor market. Different career path than compliance. Different supply pool (academic ML researchers, philosophy/cognitive-science backgrounds, safety engineering). Different demand pool (frontier labs primarily, AI safety institutes, governments, well-funded safety nonprofits). Different funding mechanisms ($200M+ in safety grants flowing through dedicated programs in 2026 per Granted AI's data).

Anthropic alone has dedicated teams for: Alignment, Interpretability, Societal Impacts, Frontier Red Team. Their published research output is substantial: Petri 3.0 (open-source alignment auditing tool, used by UK AISI), Automated Alignment Researchers, alignment audits, alignment faking research, scalable oversight, mechanistic interpretability.

## The roles

### Alignment Researcher

**What they do.** Research the question of how to ensure AI systems pursue goals compatible with human values. Reward specification, scalable oversight, RLHF, AI control, model organisms of misalignment. Anthropic's Alignment team works "to understand the risks of AI models and develop ways to ensure that future ones remain helpful, honest, and harmless."

**Demand signals.** Anthropic, OpenAI, Google DeepMind, Redwood Research, ARC, MIRI. Anthropic Fellows Program (May and July 2026 cohorts) is the leading pipeline — over 80% of fellows produce publishable research, over 40% subsequently join Anthropic full-time.

**Supply signals.** Academic ML researchers with safety focus. PhDs in AI safety, alignment, or related fields. Alumni of MATS (ML Alignment Theory Scholars), Redwood Research Residency, ARC research positions, Anthropic Fellows. Public output (papers, alignment forum posts, GitHub contributions to alignment tools).

**Crosswalks.** ISCO-08: 2113 (Chemists) — gap; closest research code. SOC 2018: 19-1029 (Biological Scientists, All Other) — gap. O*NET: 19-1029.04 (Biologists) — gap. `crosswalk: gap — alignment research has no occupational code in any major taxonomy. This is a serious gap for visa applications and government contracts; the labor market has produced a research discipline faster than the classifiers can track it`.

### Interpretability Researcher

**What they do.** Discover and understand how large language models work internally. Mechanistic interpretability — circuits, superposition, feature visualization. Build attribution graphs that partially reveal the steps a model took internally to decide on a particular output. Anthropic: *"AI models like Claude talk in words but think in numbers."*

**Demand signals.** Anthropic Interpretability team. Google DeepMind Interpretability. Redwood Research. EleutherAI. AI Safety Institutes (UK AISI, US AISI, others emerging). Academic labs at top CS programs.

**Supply signals.** Public research output (papers, interpretability tools on GitHub). Backgrounds in neuroscience, math, theoretical CS, physics. Often academic before industry.

**Crosswalks.** `crosswalk: gap`.

### Model Behavior Researcher

**What they do.** Study how models behave in the wild. Why do they hallucinate? Why do they fake alignment? Why do they engage in reward hacking? Anthropic's Societal Impacts team explores how AI is used in the real world.

**Demand signals.** Frontier labs. AI safety nonprofits. Government safety institutes.

**Crosswalks.** `crosswalk: gap`.

### Safety Evaluation Researcher

**What they do.** Designs evaluations specifically for safety properties (vs. capabilities). Anthropic's "Applied Safety Research Engineer, Safeguards" role: *"How do we measure whether a model is safe? How do we create evaluations that reflect real-world usage rather than synthetic benchmarks?"*

Adjacent to D5 (AI Evaluations Engineer) but research-flavored rather than production-flavored.

**Crosswalks.** `crosswalk: gap`.

## Talent Development Models (EXPANDED in v0.4)

The supply pool for Part IV is largely created through structured programs. Discovery of these roles happens through the programs themselves, not through traditional hiring channels. v0.4 expands the description of each.

### Anthropic Fellows Program

4-month structured program, $15K/month stipend, mentor-led, project-based, public-output-focused. May and July 2026 cohorts open. Research areas: scalable oversight, adversarial robustness and AI control, model organisms of misalignment, mechanistic interpretability, AI security, model welfare. Operates in US, UK, Canada.

**Selection signal.** Strong technical background (typically ML or theoretical CS), demonstrated interest in alignment via public output (forum posts, papers, alignment-tool contributions), willingness to publish work openly. Fellows are paired with mentors from the Anthropic Alignment team for the duration.

**Outcome statistics.** Over 80% of fellows produce publishable research during the program. Over 40% subsequently join Anthropic full-time. The program functions as both research output and talent pipeline.

### MATS (ML Alignment Theory Scholars)

Selective program pairing scholars with established alignment researchers for multi-month mentored projects. Run independently of frontier labs but feeds into them. Alumni at Anthropic, DeepMind, Redwood Research.

**Selection signal.** Strong background in ML or theoretical foundations. Application is competitive and requires demonstrated interest in alignment theory specifically. Program structure: ~12 weeks of intensive mentored research, scholars produce concrete outputs.

### Redwood Research Residency

Hands-on residency focused on empirical alignment research. Distinct from MATS in being more empirical and more hands-on. Smaller cohort, deeper engagement.

**Selection signal.** Engineering depth combined with research orientation. Track record of shipping empirical work, not just theoretical contributions.

### ARC research positions

Theoretical alignment research focus. Aligned Research Center; runs theoretical research that informs other labs' practical work.

**Selection signal.** Mathematical depth, theoretical CS background, alignment-specific research interest.

The Atlas notes these because the discovery layer for Part IV roles is fundamentally different from the rest of the Atlas — it runs through structured fellowship programs more than through traditional hiring. shipstacked's matching engine cannot route Part IV practitioners the same way it routes Part I; the supply enters the labor market through different mechanisms.

---

# PART V — MODEL TRAINING & RLHF

## Why this gets its own part

The model training and RLHF labor market is a distinct population that the rest of the Atlas does not capture cleanly. It's not employed work (most is contract). It's not operator work (the worker doesn't run an agent fleet — they train one). It's not freelance work in the traditional sense (the structure is more durable).

Already a $1B+ market dominated by Mercor ($1B annualized revenue in February 2026, paying $1.5M+ daily to a 300K+ contractor network). Scale AI built a $14B business on this before Meta acquired them. The market is structurally distinct from the customer-facing AI deployment work that is shipstacked's primary territory.

The Atlas describes Part V for completeness. shipstacked does not currently compete in this market (Mercor is the dominant player) but the *domain-expert tier* overlaps with shipstacked's vertical-specialist supply pool.

## The three tiers

### Mass-Market RLHF Contractors

Rate-and-rank work. Follow guidelines. Score AI responses on quality. ~$25/hr typical. Scale AI / Surge AI / Labelbox / Appen / Mercor all source from this pool. Global, ~300K+ practitioners.

**Crosswalks.** ISCO-08: 4131 (Typists and word processing operators) — partial. SOC 2018: 43-9021 (Data Entry Keyers) — partial. `crosswalk: partial`.

### Domain-Expert RLHF Specialists

Domain expertise applied to AI training. Lawyers training legal AI. Doctors training medical AI. Coders training code AI. Bankers training finance AI. ~$85+/hr at Mercor. The core of Mercor's $1B revenue. Top tier of the RLHF labor market.

This tier overlaps with shipstacked's vertical-specialist supply pool, and (newly recognized in v0.4) with Part VII practitioners. A legal AI practitioner currently doing RLHF work for OpenAI could plausibly also do A1 (AI Integration Operator) work at a law firm, or operate as a G1 (AI-Native Legal Practitioner) for their own clients. The same human, three different markets.

**Crosswalks.** Varies by domain. `crosswalk: gap — the "domain expert plus RLHF" pattern has no occupational code`.

### AI Quality Auditors / Red Team Contractors

Review other trainers' work. Establish guidelines. Test AI systems for harmful outputs. Often $120K+ FTE roles or premium contract rates ($150K+ equivalent). Live inside or adjacent to Cluster C compliance work in Part III.

**Crosswalks.** ISCO-08: 2529 — partial. SOC 2018: 15-1212 — partial.

## Strategic note for shipstacked

Mercor's vulnerability moment (LiteLLM supply-chain breach March 2026, 4TB data exposure, class-action lawsuits, Meta paused work) creates a window. But entering this market requires building data-labeling infrastructure that competes with Mercor's $10B-valuation operational scale. shipstacked's better play is to focus on the *adjacent* opportunity: where domain-expert RLHF specialists are simultaneously customer-facing AI integration practitioners. That overlap is invisible to Mercor (focused on labs) and invisible to LinkedIn (no taxonomy for it).

---

# PART VI — INDUSTRY VERTICAL AI SPECIALISTS

## Why this gets its own part

Domain practitioners who learned AI, rather than AI practitioners who learned a domain. Distinct supply pool. Distinct career path. Increasingly the largest segment of AI hiring globally per multiple staffing-market data sources:

- **Healthcare AI:** 640,000 positions in 2026, fastest CAGR (36.8%), reaching $110B+ by 2030.
- **Manufacturing AI:** 620,000 positions in 2026.
- **Financial Services AI:** 470,000 positions, top compensation in finance ($300K+ specialist roles).
- **Defense / Government AI:** Cloud & Defense AI boom in DC and Seattle, security clearance premiums.

Specialist domain experts command 30-50% higher salaries than generalists. Over 75% of AI job listings specifically seek domain experts.

**Distinction from Part VII (NEW in v0.4).** Part VI is *AI-first practitioners with domain knowledge* — typically people with engineering or ML backgrounds who specialized into a vertical. Part VII is *domain-first practitioners with AI as multiplier* — typically people with primary professional credentials (MD, JD, CPA, etc.) who deeply integrated AI into their existing practice. Same vertical, different supply pool, different LTV profile, different discovery mechanism.

## The vertical-specialist roles

### Healthcare AI Engineer / Specialist

Medical imaging, genomics, clinical deployment, regulatory writing, submissions, scientific operations. OpenAI's Life Sciences FDE JD: *"workflows across discovery, clinical development, regulatory writing, submissions, or scientific operations where validation strategy, auditability, compliance constraints, and reviewer expectations shaped system design and rollout."*

**Named companies (NEW in v0.4).** Navina (clinical decision support), Tempus (clinical genomics + oncology AI), Butterfly Network (handheld ultrasound + AI), Commure (healthcare workflow + AI infrastructure), Foundation Health (primary care + AI), Federato (insurance underwriting + AI), Kalepa (insurance AI), Hippocratic AI (clinical conversational AI), Abridge (clinical documentation AI), Suki (clinical AI assistant), Nabla (clinical AI documentation), Philips, Siemens Healthineers, Epic, every major hospital system.

**Demand signals.** HIPAA-compliant AI deployments. AI integration with EHR systems. Clinical decision support. Medical imaging analysis. Surgical robotics. Pathology automation.

**Supply signals.** Practitioners with medical background plus AI fluency. MD/PhD plus engineering. Health-tech engineering experience.

**Crosswalks.** ISCO-08: 2511 (Systems analysts) cross-walked with 2212 (Specialist medical practitioners). SOC 2018: 15-1252 cross-walked with 29-1228 (Physicians, All Other). `crosswalk: combined — the role requires both an IT/engineering code and a healthcare professional code; no single code captures it`.

### Legal AI Engineer / Legal Technologist

AI-native law firms (Harvey, Cuckoo, Spellbook, others). Document automation. Contract intelligence. Legal research automation. Regulatory compliance automation.

**Named companies (NEW in v0.4).** Harvey (general-purpose legal AI), Cuckoo (litigation AI), Spellbook (contract drafting AI), EvenUp (personal injury AI), Lexion (contract AI, acquired by DocuSign), Ironclad (contract lifecycle + AI), DraftWise (contract drafting AI), Casetext (legal research AI, acquired by Thomson Reuters), Kira Systems, Luminance, Robin AI. Also: Big Law internal AI teams (every AmLaw 100 firm now has one), and AI initiatives at all four Big-4 accounting/legal hybrids.

**Demand signals.** AI-native law firms hiring directly. Big Law AI initiatives. Legal tech startups.

**Supply signals.** JD plus engineering. Practicing lawyers who have learned AI. Legal-tech engineers with domain depth.

**Crosswalks.** ISCO-08: 2511 cross-walked with 2611 (Lawyers). SOC 2018: 15-1252 cross-walked with 23-1011 (Lawyers). `crosswalk: combined`.

### Financial Services AI Engineer

Fraud detection, algorithmic trading, risk assessment, regulatory compliance, KYC/AML automation.

**Named companies (NEW in v0.4).** Federato (insurance underwriting), Kalepa (commercial insurance), Hebbia (financial research AI), Numerai (hedge fund AI), Renaissance Technologies (quant), Two Sigma, Citadel, Jane Street, Hudson River Trading, every major bulge-bracket bank's AI team. Fintech: Mercury, Ramp, Brex, Stripe Radar (fraud AI), Plaid AI. Hedge fund AI specialists at Renaissance, Two Sigma, Citadel.

**Demand signals.** JPMorgan, Goldman Sachs, every major bank. Fintech AI startups. Hedge funds (top compensation for trading-model engineers — $400K+ TC at hedge funds).

**Supply signals.** Quant background plus AI. Banking technology background plus AI fluency.

**Crosswalks.** ISCO-08: 2511 cross-walked with 2412 (Financial and investment advisers). SOC 2018: 15-1252 cross-walked with 13-2099 (Financial Specialists, All Other). `crosswalk: combined`.

### Defense / Government AI Engineer

OpenAI's Government FDE explicitly requires security clearance. Anthropic's Detection & Response. Palantir's government work. Anduril, Shield AI, Helsing.

**Named companies (NEW in v0.4).** Palantir (the original government AI deployment company), Anduril (defense AI hardware + software), Shield AI (defense AI for autonomous systems), Helsing (European defense AI), Scale AI (government work), Booz Allen Hamilton, Raytheon, Lockheed Martin internal AI teams, ManTech, CACI. Also: DARPA-funded research labs, US DoD JAIC successor organizations, UK AI Security Institute, US AI Safety Institute.

**Demand signals.** Security clearance gating. Classified-environment deployment. Government acquisition cycles.

**Supply signals.** Security clearance plus AI fluency. Veterans transitioning into AI. Ex-Palantir government FDEs.

**Compensation reality.** Defense and Healthcare command the highest premiums in vertical FDE work per KORE1 data — $155-230K offers for forward-deployed engineers, with vertical mattering significantly.

**Crosswalks.** ISCO-08: 2511 cross-walked with 0310 (Armed forces occupations) where applicable. SOC 2018: 15-1252 with security-clearance overlay. `crosswalk: combined plus clearance-overlay`.

### Manufacturing AI Engineer

Quality control automation, predictive maintenance, robotics integration, supply chain AI, factory floor deployment.

**Named companies (NEW in v0.4).** Covariant (industrial AI), Path Robotics (welding AI), Bright Machines (manufacturing AI), Flock Safety (security/manufacturing AI), Augury (predictive maintenance AI), Uptake (industrial AI). Also: Boeing, Tesla, Toyota, Siemens, Bosch, every major manufacturer's internal AI team.

**Demand signals.** Boeing, Tesla, every major manufacturer. Industry-specific AI startups.

**Supply signals.** Manufacturing engineering background plus AI. Industrial automation experience.

**Crosswalks.** ISCO-08: 2511 cross-walked with 2144 (Mechanical engineers). SOC 2018: 15-1252 cross-walked with 17-2141 (Mechanical Engineers). `crosswalk: combined`.

## Strategic implications

Vertical specialization is more concentrated than generic AI hiring. The supply pool for each vertical is structurally smaller. Compensation premiums (30-50% above generalists) reflect this scarcity. shipstacked's matching engine should treat vertical as a first-class dimension across multiple Atlas roles, not as a tag added at the end.

---

# PART VII — THE PRACTITIONER LAYER (NEW in v0.4)

## Why this gets its own part

There is a labor surface in the agentic economy that v0.3 did not name, and that no existing taxonomy sees: **domain practitioners who have deeply integrated AI into their primary professional work**.

Not AI engineers who specialized into healthcare (that's Part VI). Not lawyers who switched careers to become legal tech engineers (also Part VI). Practitioners who remained in their primary profession — practicing law, practicing medicine, practicing accounting, practicing architecture — and who, in the last 18 months, integrated AI so deeply into their daily work that their output and their leverage are now structurally different from their peers.

This is the largest and most underpriced labor surface in the Atlas. Pool: roughly 1.5–3 million globally, growing fast. Identifiable signal: an AI-integrated practitioner produces measurably more output, with measurably different quality characteristics, than a non-AI-integrated peer doing the same nominal work. They are the practitioners whose colleagues quietly come to for help with AI-related questions.

**Why they are the highest-LTV supply pool.** Because the buyer is not a company. The buyer is *another practitioner in the same domain*. A solo attorney looking to build an AI-integrated legal practice does not hire an AI engineer — they look for another attorney who has already done it. The transaction is peer-to-peer, premium-priced, and recurring. The Part VII practitioner is simultaneously the supply (their own AI-integrated practice as the deliverable) and the case study (their work product is the proof).

**Distinction from Part II Operators.** An operator runs an agent fleet for output. A Part VII practitioner runs an AI-augmented professional practice. The operator's output is a service. The practitioner's output is regulated professional work — legal advice, medical care, audited financials — for which the practitioner is personally accountable under their professional licensing body.

**Distinction from Part VI Vertical Specialists.** Part VI: engineer learns healthcare. Part VII: doctor learns AI. Different starting point, different career path, different supply pool, different discovery mechanism.

## The seven practitioner roles

### G1. AI-Native Legal Practitioner 🔴

**What they do.** Practice law as an attorney while running an integrated AI stack across research, drafting, review, and client communication. Typical stack: Harvey or equivalent for general legal AI, Spellbook for drafting, Cuckoo or EvenUp for case-type-specific work, Claude or ChatGPT Enterprise for general-purpose tasks, custom prompts and workflows for repeated matter types. The output is legal services — produced faster, with different leverage characteristics, but still subject to professional accountability and state-bar oversight.

**What good looks like.** Practicing attorney (admitted to bar, active license, malpractice insurance current) who has integrated AI into at least 30% of their daily output. Has a documented AI usage policy in their engagement letters. Has opinions about which AI tools fail at which kinds of legal work. Has at least one published case study or post describing a specific matter where AI made the difference. Often a solo or small-firm attorney; sometimes a partner at a larger firm who has championed AI internally.

**Demand signals.** Other attorneys wanting to replicate the model. Solo practitioners scaling beyond their previous hourly ceiling. Small firms hiring AI-integrated attorneys as a competitive differentiator. Corporate legal departments hiring practitioners whose AI fluency reduces external counsel spend. Increasingly: clients (especially sophisticated buyers like in-house counsel at AI companies) preferring AI-integrated outside counsel because of cost predictability.

**Supply signals.** Public case studies. Bar association AI committee membership. Conference speaking on AI in legal practice. Published writing on Substack, LinkedIn, legal industry publications about specific AI integrations. Discord and Slack presence in legal-AI practitioner communities (LegalTechHub, AI in Law).

**Common failure when the wrong person is found.** Legal tech evangelists who don't actively practice. Or attorneys who use AI sporadically but cannot describe specific integrations. Or technology people with JDs who don't carry malpractice insurance and are not the responsible attorney of record.

**Automation trajectory.** Resistant. Practicing law requires bar admission, personal accountability, and judgment under uncertainty. AI augments; it does not replace the attorney-of-record relationship.

**Compensation / engagement reality.** Varies by practice area and seniority. AI-integrated solo practitioners frequently bill at higher hourly rates than non-AI-integrated peers because their output is faster and demonstrably different. Some have moved to flat-fee or subscription pricing models that capture the productivity gain. Engagement-to-engagement compensation premiums of 30-100% over non-AI-integrated peers are common.

**Crosswalks.** ISCO-08: 2611 (Lawyers). SOC 2018: 23-1011 (Lawyers). O*NET: 23-1011.00. `crosswalk: confident — the practitioner code is correct; the AI integration is the differentiator within the role`.

**Adjacent roles.** Part VI Legal AI Engineer (engineer who specialized into law, opposite direction). F3 Vertical Agent Operator (when AI integration becomes the practitioner's primary product rather than a multiplier on legal practice).

---

### G2. AI-Native Medical Practitioner 🔴

**What they do.** Practice medicine as a licensed physician while running an integrated AI stack across documentation, diagnostic support, patient communication, and clinical workflow. Typical stack: Abridge, Nabla, or Suki for ambient documentation; Hippocratic AI or domain-specific tools for triage and patient communication; Claude or ChatGPT for general-purpose tasks within compliance boundaries; custom integrations with their EHR. The output is medical care — produced with measurably different time allocation (less time on documentation, more time on patient interaction), but still subject to medical licensing oversight and malpractice accountability.

**What good looks like.** Licensed physician (active license, board certification appropriate, malpractice insurance current) who has integrated AI into clinical workflow in a meaningful and HIPAA-compliant way. Has a documented AI usage policy. Has opinions about which clinical AI tools fail at which patient populations. Often physicians in solo or small-group practice, or hospital-employed physicians who have championed AI within their department. Sometimes specialty practitioners (radiologists, pathologists, dermatologists) for whom AI has already restructured the work most substantially.

**Demand signals.** Other physicians seeking to replicate the model. Health systems hiring AI-integrated physicians as a recruiting differentiator. Medical groups whose burnout problem is documentation-related, looking for physicians who have solved it through AI. Patients increasingly aware enough to ask about AI tooling. Locum tenens agencies offering premium rates for AI-fluent physicians.

**Supply signals.** Public case studies. Medical society AI committee membership. Conference speaking (HIMSS, RSNA for radiology, specialty society conferences). Peer-reviewed publications on AI integration in clinical practice. Active in physician-AI communities (Doximity AI groups, specialty-specific Slack/Discord).

**Common failure when the wrong person is found.** Medical informatics professionals who don't practice. Or physicians who have evaluated AI tools but not actually integrated them. Or non-physician healthcare technologists.

**Automation trajectory.** Resistant. Medical licensure is irreducibly human. AI augments documentation, diagnostic support, and patient communication. The physician-of-record relationship remains.

**Compensation / engagement reality.** AI-integrated specialists in high-acuity specialties (radiology, pathology, dermatology, emergency medicine) earn premiums of 20-50% over non-integrated peers, often through productivity gains in fee-for-service or through quality-bonus structures in value-based-care models.

**Crosswalks.** ISCO-08: 2212 (Specialist medical practitioners) or 2211 (Generalist medical practitioners). SOC 2018: 29-1228 (Physicians, All Other) or specialty-specific codes. O*NET: 29-1228.00 plus specialty. `crosswalk: confident`.

**Adjacent roles.** Part VI Healthcare AI Engineer. G6 if academic affiliation overlaps.

---

### G3. AI-Native Accounting / Finance Practitioner 🔴

**What they do.** Practice accounting, tax, or financial advisory as a credentialed practitioner (CPA, EA, CFA, CFP) while running an integrated AI stack across audit, bookkeeping, tax preparation, financial analysis, and client advisory work. Typical stack: domain-specific tools (Karbon AI, Hebbia for research, custom Claude/ChatGPT workflows for tax research and client communication), integration with practice management systems (QuickBooks, Xero, ProSeries, Drake), automation of repetitive tasks (data entry, reconciliation, document classification). The output is regulated accounting or financial advisory work, subject to AICPA, IRS, or FINRA oversight depending on the credential.

**What good looks like.** Credentialed practitioner (CPA active, CFA charterholder, CFP active, or equivalent) who has integrated AI into at least 40% of their daily output. Has documented AI usage policy in engagement letters. Has opinions about which AI tools fail at which kinds of accounting or financial work. Often solo or small-firm practitioners; sometimes partners at larger firms.

**Demand signals.** Solo practitioners scaling beyond their previous client capacity ceiling. Small CPA firms hiring AI-integrated accountants. Financial advisory practices hiring AI-integrated CFPs. Family offices and HNW advisory shops seeking practitioners whose AI fluency provides differentiated service.

**Supply signals.** State CPA society AI committee membership. AICPA AI-related publications. Conference speaking at Engage, Digital CPA, FinCon. Public case studies on tax research automation, audit data analytics, or financial planning AI integration.

**Common failure when the wrong person is found.** Accounting technology vendors who don't actively practice. Or practitioners who use AI for marketing but not for actual professional work. Or non-credentialed bookkeepers (gap in accountability).

**Automation trajectory.** Resistant. AICPA, IRS, and FINRA oversight require credentialed accountability. AI augments; the credentialed practitioner remains accountable.

**Crosswalks.** ISCO-08: 2411 (Accountants) or 2412 (Financial and investment advisers). SOC 2018: 13-2011 (Accountants and Auditors) or 13-2052 (Personal Financial Advisors). `crosswalk: confident`.

**Adjacent roles.** Part VI Financial Services AI Engineer. G5 when wealth management is primary.

---

### G4. AI-Native Architecture / Design Practitioner 🔴

**What they do.** Practice architecture, interior design, urban planning, or engineering design as a credentialed practitioner (licensed architect, P.E., RID, AICP) while running an integrated AI stack across schematic design, drawing production, code analysis, structural calculation, rendering, and client communication. Typical stack: generative design tools (Hypar, TestFit, Spacemaker, Midjourney for early-stage visualization), AI-augmented BIM (Autodesk Forma, AI plugins for Revit), code-analysis AI for jurisdiction-specific compliance, AI for client-facing renderings and walkthroughs. The output is licensed architectural or engineering work, subject to AIA, NCARB, or PE-board oversight.

**What good looks like.** Licensed practitioner (active architect, P.E., or equivalent) who has integrated AI into the design and documentation workflow meaningfully. Has documented AI usage policy and quality-control process for AI-generated output (this is becoming a professional-liability requirement). Has opinions about which AI tools fail at which building types or design problems.

**Demand signals.** Architecture and engineering firms hiring AI-integrated practitioners as a competitive differentiator. Design-build firms scaling output without proportionally scaling headcount. Public-sector clients (cities, school districts) increasingly preferring firms with AI fluency for budget and timeline predictability.

**Supply signals.** AIA AI committee membership. Conference speaking at AIA, ACADIA, AEC Hackathons. Public portfolio with AI-integrated case studies. Active in AEC-AI practitioner communities.

**Common failure when the wrong person is found.** AEC technology vendors who don't actively design. Or designers who use AI for renderings but not for actual design decision-making.

**Automation trajectory.** Resistant. Licensed architecture and engineering work requires personal stamp and accountability.

**Crosswalks.** ISCO-08: 2161 (Building architects). SOC 2018: 17-1011 (Architects, Except Naval). `crosswalk: confident`.

**Adjacent roles.** G3 when project-financing crossover. Part VI Manufacturing AI Engineer for industrial-design overlap.

---

### G5. AI-Native Financial Advisor / Wealth Practitioner 🔴

**What they do.** Practice wealth management, financial planning, or investment advisory as a credentialed practitioner (CFP, CPWA, CIMA, registered investment advisor) while running an integrated AI stack across client communication, portfolio analysis, financial planning, tax-aware investing, and behavioral finance work. Distinct from G3 — G3 is accounting-flavored, G5 is advisory-flavored. Typical stack: AI for client-facing summaries and meeting prep, AI-augmented financial planning software, AI for tax-loss-harvesting and portfolio rebalancing analysis, custom workflows for client onboarding and review. The output is fiduciary financial advice, subject to SEC, FINRA, or state RIA oversight.

**What good looks like.** Credentialed advisor (active CFP, CPWA, or equivalent; RIA in good standing) who has integrated AI into client work meaningfully without creating fiduciary or disclosure problems. Has documented AI usage policy reviewed by compliance. Has opinions about which AI tools fail at which client situations.

**Demand signals.** RIA firms hiring AI-integrated advisors. Family offices preferring AI-fluent advisors for HNW relationships. Solo advisors scaling beyond previous AUM ceilings.

**Supply signals.** CFP Board AI committee membership. Conference speaking at FinCon, Future Proof, Schwab IMPACT, Bob Veres Insider's Forum. Public writing on AI in wealth management. Active in advisor-AI communities (Kitces, XYPN slack channels).

**Crosswalks.** ISCO-08: 2412 (Financial and investment advisers). SOC 2018: 13-2052 (Personal Financial Advisors). `crosswalk: confident`.

**Adjacent roles.** G3 when accounting overlap. Part VI Financial Services AI Engineer.

---

### G6. AI-Native Education Practitioner 🟡

**What they do.** Practice teaching, course design, academic advising, or educational leadership as a credentialed educator (state-certified teacher, professor, learning designer, school administrator) while running an integrated AI stack across lesson planning, assessment, feedback, content production, and student communication. Typical stack: AI for lesson plan generation, AI-augmented assessment tools (auto-grading with rubric calibration), AI for differentiated instruction (adapting content per learner), AI for student-facing tutoring and feedback, AI for administrative work (parent communication, IEP support, report card narrative generation). The output is education — bounded by institutional policy on AI use in student-facing work, which varies wildly by jurisdiction and institution.

**What good looks like.** Active credentialed educator who has integrated AI in ways that demonstrably improve student outcomes or teacher productivity, within institutional policy boundaries. Has clear stance on AI use in student-facing work (when permitted, when not). Publishes lesson plans, prompts, or workflows that other educators adopt.

**Demand signals.** School districts hiring AI-integrated teachers as recruiting differentiator. Independent schools seeking AI-fluent faculty. EdTech companies hiring practicing educators for product development.

**Supply signals.** ISTE membership. Conference speaking at ISTE, ASU+GSV, SXSW EDU. Active in educator-AI communities (AI for Education, Magic School, MagicEdu communities).

**Automation trajectory.** Partial. Routine instructional design and content production collapse to agents. The teacher-student relationship and judgment work remain human, but the workload composition shifts substantially.

**Crosswalks.** ISCO-08: 2330 (Secondary education teachers) or 2310 (University and higher education teachers). SOC 2018: 25-2031 (Secondary School Teachers) or 25-1099 (Postsecondary Teachers). `crosswalk: confident`.

**Adjacent roles.** E2 (AI Enablement Trainer) when the practitioner shifts to corporate L&D. E3 (AI Translator) when shifts to AI advisory.

---

## Discovery mechanism for Part VII

The discovery mechanism for Part VII practitioners is structurally different from any other Part of the Atlas:

- **Not LinkedIn** — they are classified by their primary profession (Lawyer, Physician, CPA, Architect, Advisor, Teacher), not by AI work.
- **Not job boards** — they are not seeking employment; they are running practices.
- **Not Mercor or RLHF platforms** — they are not training models; they are using them.
- **Not Cluster A discovery** — they are not building AI systems for companies; they are using AI to deliver their own primary professional work.
- **Yes** — peer referral within their domain. AI-using attorneys refer other AI-using attorneys. AI-using doctors refer other AI-using doctors.
- **Yes** — professional society AI committees and AI-specific tracks at industry conferences.
- **Yes** — publication-driven discovery (Substack, professional journals, LinkedIn long-form posts).
- **Yes** — shipstacked.com/claim with a Part VII practitioner classification path.

This is why Part VII matters to shipstacked structurally: the routable supply pool exists, but the routing infrastructure does not. Other practitioners in the same domain want to find them and learn from them or hire them. No platform serves this matching today. The Atlas reframes the practitioner's identity; the platform routes them to demand.

---

# How to use this Atlas

**If you are a company hiring**, start with the symptom, not the role. Describe what is broken in your operations or what you are trying to ship. The right role, operator type, vertical specialist, compliance hire, or AI-native practitioner will reveal itself from the symptom. If you start with the title, you will hire the wrong category 50% of the time.

**If you are a practitioner**, look at the work, not the title. Read each role's "what good looks like" sections honestly. Some of you are doing two or three of these simultaneously and your title doesn't reflect any of them.

**If you are an operator**, you may not have recognized yourself in any of the Cluster A-E roles, and that is the point. Part II is for you. The unit you are running has not had a name. Use the operator type that fits and begin describing yourself accurately to customers and to peers.

**If you are an alignment or interpretability researcher**, Part IV is your map. The career path runs through Anthropic Fellows, MATS, Redwood Residency, ARC, and direct hires at frontier labs. The discovery layer for your work is fundamentally different from the rest of the Atlas.

**If you are a domain practitioner who has learned AI** (engineer-flavored), Part VI is for you. You command 30-50% higher compensation than generalists with equivalent AI fluency. Your scarcity is structural; price accordingly.

**If you are a credentialed practitioner who has deeply integrated AI** (practitioner-flavored — attorney, physician, CPA, architect, advisor, educator), Part VII is for you. You are the most underpriced supply in the agentic-economy labor market. Your peers in your domain want to find you. Claim your Atlas role.

**If you are an investor, operator, or analyst**, this Atlas is a map of the labor surface where the next generation of AI-implementation work is happening. The roles are real. The shortages are real. The pricing is structural. The companies that solve discovery and matching for these roles, operators, compliance hires, vertical specialists, and AI-native practitioners will be infrastructure for the agentic economy.

This is v0.4. It will be wrong in places. Tell me where.

Pull requests welcome at shipstacked.com/atlas.

---

**About the author**

Thomas Oxlee is the founder of shipstacked.com, the discovery and classification layer for the labor market of the agentic economy. He is currently embedded as the AI integration operator at a regulated EU business under AI Act exposure, where most of the field signal that informs this Atlas comes from. shipstacked.com matches AI-native specialists, agent operators, vertical specialists, compliance practitioners, and AI-native domain practitioners to companies and to peers that need them — without CVs, without LinkedIn taxonomies, and without the assumptions of a labor regime that broke eighteen months ago.

shipstacked.com/atlas

---

# v0.5 planned additions (next major Atlas iteration)

1. **Robotics / Cyberphysical AI roles** as a distinct addition. The labor surface for embodied AI (humanoid robotics, drones, autonomous vehicles, cyberphysical systems) is structurally distinct from software-only AI and warrants its own treatment. Anthropic's increased focus on cyberphysical safety in 2026 is a leading indicator.

2. **AI Policy / Government Affairs roles** distinct from Part III compliance. The role exists at frontier labs (Government Affairs, Public Policy) and increasingly at large customers; it is policy-shaping, not policy-compliance.

3. **AI-Native Product Designers** as distinct from D4 (Human-AI Handoff Designer). The UX work for agentic interfaces is a recognizable specialization at AI-native scaleups.

4. **Embedded ML Engineers** — edge AI, on-device inference, model compression specialists. Distinct from Part VI vertical specialists; horizontal across verticals.

5. **AI Hardware Engineers** — accelerator design, GPU systems engineering. NVIDIA, Cerebras, Groq, custom accelerator companies.

6. **Expanded compensation refresh** across all roles with current 2026 Levels.fyi data per role per geography per company.

7. **Frontier-Lab-Specific Org Maps.** Anthropic's 9+ safety specialisms documented at sub-role level. OpenAI's vertical FDE org documented per vertical. Palantir's Echo/FDE pod structure documented at delivery level. The leading-indicator detail that customer-facing taxonomies need 12-24 months from now.

8. **Sovereign AI labor patterns.** Mistral, Aleph Alpha, sovereign EU/UK/Asian labs and their distinct labor-surface characteristics relative to US frontier labs.

9. **Continued crosswalk refinement.** Identify and report the gap roles to ISCO and SOC maintainers, with the goal of seeing official codes added for the most structurally important new occupations.

10. **Atlas API.** Each role dereferenceable as JSON-LD at shipstacked.com/atlas/roles/{ID}. Other systems can cite Atlas role IDs in their own taxonomies. The Atlas becomes infrastructure.

— End of Atlas v0.4 —
