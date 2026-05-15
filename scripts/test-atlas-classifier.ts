/**
 * CLI test harness for the Atlas classifier.
 *
 * Run: node --env-file=.env.local scripts/test-atlas-classifier.ts
 *
 * Three fixtures hardcoded per docs/v2/STEP_4_ATLAS_CLASSIFIER_SPEC.md §6.
 * Prints per-fixture results in the §6.2 format plus a match-judgment that
 * compares actual confidence/role behavior against expected behavior so a
 * human reviewer can spot miscalibration quickly. PASS/REVIEW/FAIL is
 * heuristic — Thomas reviews any non-PASS row before commit.
 */

import {
  CLASSIFIER_VERSION,
  classifyAtlasRoles,
  type AtlasClassifierInput,
} from '../src/services/atlas-classifier/index.ts';

interface Fixture {
  label: string;
  expected: string;
  input: AtlasClassifierInput;
  judge: (r: { inferred: string[]; confidence: number }) => 'PASS' | 'REVIEW' | 'FAIL';
}

const FIXTURES: Fixture[] = [
  {
    label: 'Fixture A: Anthropic SDK',
    expected: 'low confidence (<0.5), closest D3 or no-strong-match. A library, not a deployment.',
    input: {
      event_type: 'published_repo',
      title: 'Claude SDK for Python',
      description:
        '# Claude SDK for Python\n\nThe Claude SDK for Python provides access to the Claude API from Python applications. Installation: pip install anthropic. Provides an Anthropic client with messages.create for sending requests to Claude.',
      artifacts: [
        { kind: 'repo', url: 'https://github.com/anthropics/anthropic-sdk-python' },
      ],
      stack: [
        { name: 'python', category: 'language', role: 'primary' },
        { name: 'ruby', category: 'language', role: 'supporting' },
      ],
      capabilities: [],
    },
    judge: (r) => {
      // Spec expects low confidence (<0.5). A library is not implementation work.
      if (r.confidence < 0.5) return 'PASS';
      if (r.confidence < 0.7) return 'REVIEW';
      return 'FAIL';
    },
  },
  {
    label: 'Fixture B: Lovable e-commerce site',
    expected:
      'moderate confidence. Possible roles: F1 (Solo Operator) or A1 (Integration Operator). Reasoning should reflect ambiguity.',
    input: {
      event_type: 'shipped_app',
      title: 'Linea - Minimalist jewelry crafted for the modern individual',
      description:
        'E-commerce website for Linea - Minimalist jewelry crafted for the modern individual.',
      artifacts: [
        { kind: 'deployment', url: 'https://linea-jewelry.lovable.app/' },
      ],
      stack: [
        { name: 'react', category: 'framework', role: 'supporting' },
        { name: 'supabase', category: 'infra', role: 'supporting' },
      ],
      capabilities: [],
    },
    judge: (r) => {
      // Spec expects moderate confidence (0.5-0.85 range is reasonable) and
      // either F1 or A1 (or both) somewhere in the inferred list.
      const hasExpected = r.inferred.includes('F1') || r.inferred.includes('A1');
      if (hasExpected && r.confidence >= 0.4 && r.confidence < 0.9) return 'PASS';
      if (hasExpected || (r.confidence >= 0.3 && r.confidence < 0.95)) return 'REVIEW';
      return 'FAIL';
    },
  },
  {
    label: 'Fixture C: Multi-agent customer support system',
    expected:
      'high confidence (0.8+). Strong A4 (Agent Workflow Implementer). Possibly F4 (Function Agent Operator) if framed as a service. Reasoning should name LangGraph + production deployment + measurable outcome.',
    input: {
      event_type: 'shipped_workflow',
      title: 'Multi-agent customer support system shipped to production',
      description:
        'Built using LangGraph + Claude. Handles tier-1 customer queries with 87% deflection. 6-month uptime > 99.5%. Integrated with Zendesk and Linear for escalation.',
      artifacts: [
        { kind: 'deployment', url: 'https://example.com/agent-dashboard' },
        { kind: 'repo', url: 'https://github.com/example/support-agent' },
      ],
      stack: [
        { name: 'langgraph', category: 'framework', role: 'primary' },
        { name: 'claude-sonnet-4-7', category: 'model', role: 'primary' },
        { name: 'supabase', category: 'infra', role: 'supporting' },
      ],
      capabilities: ['agent-orchestration', 'customer-support', 'tool-use'],
    },
    judge: (r) => {
      // Spec expects high confidence (≥0.8) and A4 should be the strongest
      // (first) inferred role. F4 also acceptable as secondary.
      const hasA4 = r.inferred.includes('A4');
      if (hasA4 && r.confidence >= 0.8) return 'PASS';
      if (hasA4 && r.confidence >= 0.65) return 'REVIEW';
      if (r.confidence >= 0.5) return 'REVIEW';
      return 'FAIL';
    },
  },
];

async function main() {
  for (const fix of FIXTURES) {
    console.log('='.repeat(72));
    console.log(`=== ${fix.label} ===`);
    console.log('='.repeat(72));
    const result = await classifyAtlasRoles(fix.input);
    console.log(`roles: ${JSON.stringify(result.inferred)}`);
    console.log(`confidence: ${result.confidence.toFixed(2)}`);
    console.log(`reasoning: ${JSON.stringify(result.reasoning)}`);
    console.log(`classifier_version: ${result.classifier_version}`);
    console.log(`expected: ${fix.expected}`);
    const judgment = fix.judge(result);
    console.log(`match-judgment: ${judgment}`);
    console.log('');
  }
  // Calibration sanity — flag if all three confidences land at one end.
  console.log('='.repeat(72));
  console.log('Calibration check: re-run if all three confidences cluster (overconfident if all >0.8; under-asserting if all <0.5). Spec §9.');
  console.log(`Classifier version: ${CLASSIFIER_VERSION}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
