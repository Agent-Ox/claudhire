// AUTO-GENERATED — do not edit. Regenerate via packages/atlas-roles/scripts/build.ts.
// Source: src/content/atlas-v04.md
// Parser: src/lib/atlas/parse.ts
// Atlas version: v0.4

import type { AtlasRoleData } from '../types.js';

export const rolesV04: readonly AtlasRoleData[] = Object.freeze(
[
  {
    "role_id": "A1",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "AI Integration Operator",
    "short_description": "Take an AI capability and integrate it into the operating reality of a specific company.",
    "automation_trajectory": "partial",
    "isco_08_code": "2519",
    "soc_2018_code": "15-1299",
    "onet_code": "15-1299.08",
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "A2",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "Forward Deployed Engineer (FDE — AI flavor)",
    "short_description": "Embed inside a customer company — physically or via deep, sustained engagement — and build production AI systems alongside the customer's team.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "A3",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "AI Deployment Triage Specialist",
    "short_description": "Called in when an AI deployment has failed, partially failed, or is producing unintended consequences.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "A4",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "Agent Workflow Implementer",
    "short_description": "Take a designed agent workflow and build it to production.",
    "automation_trajectory": "partial",
    "isco_08_code": "2512",
    "soc_2018_code": "15-1252",
    "onet_code": "15-1252.00",
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "A5",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "Agent System Integrator",
    "short_description": "Build, package, deploy, and successfully *transfer* an agent or agent system to a customer such that the customer can own and operate it after delivery.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "A6",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "Deployment Strategist",
    "short_description": "The non-engineering counterpart to A2 (FDE) and A5 (Agent System Integrator).",
    "automation_trajectory": "resistant",
    "isco_08_code": "1219",
    "soc_2018_code": "13-1111",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "A7",
    "atlas_version": "v0.4",
    "cluster": "A",
    "name": "Partner / Channel Solutions Architect",
    "short_description": "Bridge between an AI lab/vendor and the partner ecosystem that ultimately delivers AI to end customers.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2434",
    "soc_2018_code": "41-9031",
    "onet_code": "41-9031.00",
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "B1",
    "atlas_version": "v0.4",
    "cluster": "B",
    "name": "AI Operations Engineer",
    "short_description": "SRE, but for AI systems.",
    "automation_trajectory": "collapsible",
    "isco_08_code": "2522",
    "soc_2018_code": "15-1241",
    "onet_code": "15-1244.00",
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "B2",
    "atlas_version": "v0.4",
    "cluster": "B",
    "name": "Agent Reliability Engineer",
    "short_description": "Specialist version of B1 focused on the unique reliability challenges of agentic systems specifically: multi-step failure cascades, tool-call errors, prompt injection in production, agent loops, cost-per-task variance, infinite retries, MCP server failures, OAuth drift, model fallback strategies.",
    "automation_trajectory": "collapsible",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "B3",
    "atlas_version": "v0.4",
    "cluster": "B",
    "name": "AI Cost & Capacity Operator",
    "short_description": "Specialist focused on the economics of running AI in production.",
    "automation_trajectory": "collapsible",
    "isco_08_code": "2421",
    "soc_2018_code": "13-2099",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "B4",
    "atlas_version": "v0.4",
    "cluster": "B",
    "name": "AI Inference & Model Serving Reliability Engineer",
    "short_description": "Distinct from B1, B2, B3.",
    "automation_trajectory": "partial",
    "isco_08_code": "2523",
    "soc_2018_code": "15-1241",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "C1",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "AI Audit & Conformity Lead",
    "short_description": "Make AI systems defensible — to auditors, regulators, boards, and customers.",
    "automation_trajectory": "partial",
    "isco_08_code": "2412",
    "soc_2018_code": "13-1041",
    "onet_code": "13-1041.00",
    "crosswalk_status": "partial",
    "eu_ai_act_articles": [
      "9",
      "10",
      "11",
      "17",
      "43",
      "Annex III"
    ],
    "iso_42001_sections": [
      "Clause 6",
      "Clause 8",
      "A.6.2.6",
      "A.6.2.8"
    ]
  },
  {
    "role_id": "C2",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "AI Risk & Policy Analyst",
    "short_description": "Define what AI can and cannot be used for inside an organization.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2422",
    "soc_2018_code": "13-1041",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": [
      "4",
      "5",
      "50"
    ],
    "iso_42001_sections": [
      "Clause 5",
      "A.3.2",
      "A.4.2"
    ]
  },
  {
    "role_id": "C3",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "Model & Vendor Governance Manager",
    "short_description": "Manage the ongoing relationship between an organization and its AI vendors.",
    "automation_trajectory": "collapsible",
    "isco_08_code": "1213",
    "soc_2018_code": "13-1023",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": [
      "25",
      "28",
      "29",
      "50"
    ],
    "iso_42001_sections": [
      "A.10.2",
      "A.10.3"
    ]
  },
  {
    "role_id": "C4",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "AI Agent Steward",
    "short_description": "Monitor deployed agents for ethical, behavioral, and operational compliance.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": [
      "14",
      "26",
      "72"
    ],
    "iso_42001_sections": [
      "A.8.2",
      "A.9.2"
    ]
  },
  {
    "role_id": "D1",
    "atlas_version": "v0.4",
    "cluster": "D",
    "name": "AI Workflow Designer",
    "short_description": "Redesign business processes so AI can reliably assist, automate, or augment them.",
    "automation_trajectory": "partial",
    "isco_08_code": "2421",
    "soc_2018_code": "13-1199",
    "onet_code": "13-1199.00",
    "crosswalk_status": null,
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "D2",
    "atlas_version": "v0.4",
    "cluster": "D",
    "name": "Agent System Architect",
    "short_description": "Design multi-agent systems at the architectural level.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2511",
    "soc_2018_code": "15-1299",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "D3",
    "atlas_version": "v0.4",
    "cluster": "D",
    "name": "Prompt and Context Engineer",
    "short_description": "Design and maintain the context layer for AI systems — what information the model sees, in what order, structured how.",
    "automation_trajectory": "collapsible",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "D4",
    "atlas_version": "v0.4",
    "cluster": "D",
    "name": "Human-AI Handoff Designer",
    "short_description": "Design the moments where AI hands off to humans and vice versa.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "D5",
    "atlas_version": "v0.4",
    "cluster": "D",
    "name": "AI Evaluations Engineer",
    "short_description": "Design eval suites that measure model and agent quality, safety, and reliability before and after deployment.",
    "automation_trajectory": "partial",
    "isco_08_code": "2120",
    "soc_2018_code": "15-2031",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "E1",
    "atlas_version": "v0.4",
    "cluster": "E",
    "name": "AI Implementation Lead",
    "short_description": "Run AI rollouts inside an organization the way someone used to run cloud migrations.",
    "automation_trajectory": "resistant",
    "isco_08_code": "1330",
    "soc_2018_code": "11-3021",
    "onet_code": null,
    "crosswalk_status": null,
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "E2",
    "atlas_version": "v0.4",
    "cluster": "E",
    "name": "AI Enablement Trainer",
    "short_description": "Build the internal training, playbooks, prompt libraries, usage standards, and \"how to work with AI\" capability inside an organization.",
    "automation_trajectory": "collapsible",
    "isco_08_code": "2424",
    "soc_2018_code": "13-1151",
    "onet_code": "13-1151.00",
    "crosswalk_status": null,
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "E3",
    "atlas_version": "v0.4",
    "cluster": "E",
    "name": "AI Translator",
    "short_description": "Sit between business stakeholders and technical AI teams, translating in both directions.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "E4",
    "atlas_version": "v0.4",
    "cluster": "E",
    "name": "Fractional Head of AI",
    "short_description": "Senior AI leadership, on a fractional basis (typically 8-32 hours per week, $5-20K+/month).",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "F1",
    "atlas_version": "v0.4",
    "cluster": "F",
    "name": "The Solo Agent Operator",
    "short_description": "**What they are.** One human, one curated agent fleet, several customers. The dominant emerging pattern.",
    "automation_trajectory": null,
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "F2",
    "atlas_version": "v0.4",
    "cluster": "F",
    "name": "The Boutique Agent Operator",
    "short_description": "**What they are.** 2-5 humans running multiple specialized agent fleets for multiple customers. Small-agency pattern adapted for the agent era.",
    "automation_trajectory": null,
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "F3",
    "atlas_version": "v0.4",
    "cluster": "F",
    "name": "The Vertical Agent Operator",
    "short_description": "**What they are.** Operator (solo or boutique) specialized in one industry, running fleets tuned to that industry's specific data, workflows, regulatory environment.",
    "automation_trajectory": null,
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "F4",
    "atlas_version": "v0.4",
    "cluster": "F",
    "name": "The Function Agent Operator",
    "short_description": "**What they are.** Operator specialized in one cross-industry function (sales operations, customer support, research, recruiting, financial analysis, content production).",
    "automation_trajectory": null,
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "F5",
    "atlas_version": "v0.4",
    "cluster": "F",
    "name": "The Integration Agent Operator",
    "short_description": "**What they are.** Operator running agents that integrate other people's tools and data on behalf of customers. The plumber pattern. Maintains the connective tissue between customer's existing systems and the AI capabilities they want.",
    "automation_trajectory": null,
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "C6",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "AI Red Team Lead",
    "short_description": "Adversarial testing of AI systems.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2529",
    "soc_2018_code": "15-1212",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": [
      "9",
      "15",
      "55"
    ],
    "iso_42001_sections": [
      "A.6.2.5",
      "A.6.2.7"
    ]
  },
  {
    "role_id": "C5",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "AI Incident Responder",
    "short_description": "Specialist who handles AI incidents *after* they happen.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2529",
    "soc_2018_code": "15-1212",
    "onet_code": null,
    "crosswalk_status": null,
    "eu_ai_act_articles": [
      "73",
      "79"
    ],
    "iso_42001_sections": [
      "A.8.4",
      "A.9.3"
    ]
  },
  {
    "role_id": "C8",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "AI Procurement & Vendor Risk Assessor",
    "short_description": "Pre-purchase risk assessment of AI vendors and AI-enabled SaaS products.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": "13-1023",
    "onet_code": null,
    "crosswalk_status": null,
    "eu_ai_act_articles": [
      "25",
      "26",
      "28"
    ],
    "iso_42001_sections": [
      "A.10.2",
      "A.10.4"
    ]
  },
  {
    "role_id": "C7",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "Data Provenance & Training-Data Compliance Officer",
    "short_description": "Track what data was used to train, fine-tune, or RAG-feed a model.",
    "automation_trajectory": "partial",
    "isco_08_code": "2611",
    "soc_2018_code": "13-1041",
    "onet_code": null,
    "crosswalk_status": "partial",
    "eu_ai_act_articles": [
      "10",
      "53",
      "60"
    ],
    "iso_42001_sections": [
      "A.7.2",
      "A.7.3"
    ]
  },
  {
    "role_id": "C9",
    "atlas_version": "v0.4",
    "cluster": "C",
    "name": "Vulnerable User Protection Lead",
    "short_description": "Specialist focused on AI systems' interactions with minors, healthcare patients, vulnerable populations.",
    "automation_trajectory": "resistant",
    "isco_08_code": null,
    "soc_2018_code": null,
    "onet_code": null,
    "crosswalk_status": "gap",
    "eu_ai_act_articles": [
      "5",
      "9",
      "Annex III"
    ],
    "iso_42001_sections": [
      "A.6.2.6"
    ]
  },
  {
    "role_id": "G1",
    "atlas_version": "v0.4",
    "cluster": "G",
    "name": "AI-Native Legal Practitioner",
    "short_description": "Practice law as an attorney while running an integrated AI stack across research, drafting, review, and client communication.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2611",
    "soc_2018_code": "23-1011",
    "onet_code": "23-1011.00",
    "crosswalk_status": "confident",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "G2",
    "atlas_version": "v0.4",
    "cluster": "G",
    "name": "AI-Native Medical Practitioner",
    "short_description": "Practice medicine as a licensed physician while running an integrated AI stack across documentation, diagnostic support, patient communication, and clinical workflow.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2212",
    "soc_2018_code": "29-1228",
    "onet_code": "29-1228.00",
    "crosswalk_status": "confident",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "G3",
    "atlas_version": "v0.4",
    "cluster": "G",
    "name": "AI-Native Accounting / Finance Practitioner",
    "short_description": "Practice accounting, tax, or financial advisory as a credentialed practitioner (CPA, EA, CFA, CFP) while running an integrated AI stack across audit, bookkeeping, tax preparation, financial analysis, and client advisory work.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2411",
    "soc_2018_code": "13-2011",
    "onet_code": null,
    "crosswalk_status": "confident",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "G4",
    "atlas_version": "v0.4",
    "cluster": "G",
    "name": "AI-Native Architecture / Design Practitioner",
    "short_description": "Practice architecture, interior design, urban planning, or engineering design as a credentialed practitioner (licensed architect, P.E., RID, AICP) while running an integrated AI stack across schematic design, drawing production, code analys",
    "automation_trajectory": "resistant",
    "isco_08_code": "2161",
    "soc_2018_code": "17-1011",
    "onet_code": null,
    "crosswalk_status": "confident",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "G5",
    "atlas_version": "v0.4",
    "cluster": "G",
    "name": "AI-Native Financial Advisor / Wealth Practitioner",
    "short_description": "Practice wealth management, financial planning, or investment advisory as a credentialed practitioner (CFP, CPWA, CIMA, registered investment advisor) while running an integrated AI stack across client communication, portfolio analysis, financial planning, tax-aware investing, and behavioral finance work.",
    "automation_trajectory": "resistant",
    "isco_08_code": "2412",
    "soc_2018_code": "13-2052",
    "onet_code": null,
    "crosswalk_status": "confident",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  },
  {
    "role_id": "G6",
    "atlas_version": "v0.4",
    "cluster": "G",
    "name": "AI-Native Education Practitioner",
    "short_description": "Practice teaching, course design, academic advising, or educational leadership as a credentialed educator (state-certified teacher, professor, learning designer, school administrator) while running an integrated AI stack across lesson planning, assessment, feedback, content production, and student communication.",
    "automation_trajectory": "partial",
    "isco_08_code": "2330",
    "soc_2018_code": "25-2031",
    "onet_code": null,
    "crosswalk_status": "confident",
    "eu_ai_act_articles": null,
    "iso_42001_sections": null
  }
]
);
