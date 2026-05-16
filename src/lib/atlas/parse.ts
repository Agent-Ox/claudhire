/**
 * Atlas markdown parser — extracted from scripts/seed-atlas-roles.ts so
 * BOTH the seed script (which writes to the atlas_roles DB) AND the
 * @shipstacked/atlas-roles package's build script (which generates the
 * published JSON snapshots) consume IDENTICAL parser logic on IDENTICAL
 * markdown. This is the one-source mechanism per BEACON_4_DISCOVERY.md
 * §C — the package and the live site provably cannot disagree because
 * they both derive from this single parser.
 *
 * Pure module: zero imports. Takes a markdown string in, returns a
 * Role[] out. No filesystem, no DB, no network — entirely deterministic.
 *
 * Markdown role-declaration patterns:
 *   - H3 headings of form `### {RoleId}. {Name} {emoji}?`
 *   - Inline-bolded declarations of form `**{RoleId}. {Name} {emoji}.**`
 *     (Part III C-cluster sub-cluster roles use this pattern.)
 *
 * For v0.4 only: parses **Crosswalks.** and **EU AI Act mapping.** paragraphs
 * within each role's content block.
 *
 * Spec: docs/v2/TIER_3_BEACON_4_ATLAS_PACKAGE_SPEC.md
 * Discovery: docs/audit/BEACON_4_DISCOVERY.md §C (extraction is behavior-
 * preserving; H10 byte-diff proof verifies this).
 */

export type Trajectory = 'resistant' | 'partial' | 'collapsible';
export type CrosswalkStatus = 'confident' | 'partial' | 'gap' | 'combined';

export interface Role {
  role_id: string;
  atlas_version: 'v0.3' | 'v0.4';
  cluster: string;
  name: string;
  short_description: string;
  automation_trajectory: Trajectory | null;
  isco_08_code: string | null;
  soc_2018_code: string | null;
  onet_code: string | null;
  crosswalk_status: CrosswalkStatus | null;
  eu_ai_act_articles: string[] | null;
  iso_42001_sections: string[] | null;
}

export interface ParseWarning {
  role_id: string | null;
  version: string;
  reason: string;
  line?: number;
}

const EMOJI_TO_TRAJECTORY: Record<string, Trajectory> = {
  '🔴': 'resistant',
  '🟡': 'partial',
  '🟢': 'collapsible',
};

const STRIP_PARENS_NOTE = /\s*\*?\([^)]*(?:NEW|renamed)[^)]*\)\*?\s*$/i;

function detectTrajectory(line: string): Trajectory | null {
  for (const [emoji, t] of Object.entries(EMOJI_TO_TRAJECTORY)) {
    if (line.includes(emoji)) return t;
  }
  return null;
}

function cleanName(raw: string): string {
  return raw
    .replace(/[🔴🟡🟢]/g, '')
    .replace(STRIP_PARENS_NOTE, '')
    .trim();
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^([^.]+?\.)(?:\s|$)/);
  if (m) return m[1].trim();
  return trimmed.slice(0, 240);
}

function extractShortDescription(buffer: string): string {
  const what = buffer.match(/\*\*What they do\.\*\*\s*([^\n]+)/);
  if (what) return firstSentence(what[1]);
  // Fallback: first non-empty content line of the buffer
  const firstLine = buffer.split('\n').find((l) => l.trim().length > 0);
  return firstLine ? firstSentence(firstLine) : '';
}

function extractCrosswalk(
  buffer: string
): Pick<Role, 'isco_08_code' | 'soc_2018_code' | 'onet_code' | 'crosswalk_status'> {
  const para = buffer.match(/\*\*Crosswalks\.\*\*\s*([^\n]+)/);
  if (!para) {
    return {
      isco_08_code: null,
      soc_2018_code: null,
      onet_code: null,
      crosswalk_status: null,
    };
  }
  const text = para[1];

  const statusMatch = text.match(/crosswalk:\s*(confident|partial|gap|combined)\b/i);
  const status = (statusMatch?.[1].toLowerCase() ?? null) as CrosswalkStatus | null;

  // If overall is "gap", spec says: leave code columns NULL.
  if (status === 'gap') {
    return {
      isco_08_code: null,
      soc_2018_code: null,
      onet_code: null,
      crosswalk_status: 'gap',
    };
  }

  const isco = text.match(/ISCO-08:\s*([0-9]{3,4})/i);
  const soc = text.match(/SOC\s*2018:\s*([0-9]{2}-[0-9]{4})/i);
  const onet = text.match(/O\*NET:\s*([0-9]{2}-[0-9]{4}(?:\.[0-9]{2})?)/i);

  return {
    isco_08_code: isco?.[1] ?? null,
    soc_2018_code: soc?.[1] ?? null,
    onet_code: onet?.[1] ?? null,
    crosswalk_status: status,
  };
}

function extractEuAiAct(
  buffer: string
): Pick<Role, 'eu_ai_act_articles' | 'iso_42001_sections'> {
  const para = buffer.match(/\*\*EU AI Act mapping\.\*\*\s*([^\n]+)/);
  if (!para) {
    return { eu_ai_act_articles: null, iso_42001_sections: null };
  }
  const text = para[1];

  const articles: string[] = [];
  const articleRe = /Article\s+(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(text)) !== null) articles.push(m[1]);

  // Annex III categories — append as `Annex III` markers (one entry, no dupes).
  if (/Annex\s+III/i.test(text) && !articles.includes('Annex III')) {
    articles.push('Annex III');
  }

  const iso: string[] = [];
  const clauseRe = /Clause\s+(\d+)/g;
  while ((m = clauseRe.exec(text)) !== null) iso.push(`Clause ${m[1]}`);
  const controlRe = /\bA\.[0-9]+(?:\.[0-9]+)+/g;
  while ((m = controlRe.exec(text)) !== null) iso.push(m[0]);

  return {
    eu_ai_act_articles: articles.length > 0 ? articles : null,
    iso_42001_sections: iso.length > 0 ? iso : null,
  };
}

export function parseAtlas(
  md: string,
  version: 'v0.3' | 'v0.4',
  warnings: ParseWarning[]
): Role[] {
  const lines = md.split('\n');
  const roles: Role[] = [];

  let current: { role_id: string; cluster: string; name: string; traj: Trajectory | null } | null =
    null;
  let buffer = '';
  let currentStartLine = 0;

  // H3 role declaration: `### A1. AI Integration Operator 🟡` (allow optional `*(NEW)*` suffix)
  const H3_ROLE = /^### ([A-G])(\d+)\.\s+(.+)$/;
  // Inline-bold role declaration (Part III): `**C5. AI Incident Responder 🔴.** rest...`
  const INLINE_ROLE = /^\*\*([A-G])(\d+)\.\s+(.+?)\s*\.\*\*\s*(.*)$/;
  // Any heading line — terminates the current role's buffer.
  const ANY_HEADING = /^#{1,3}\s/;

  function flush(end: 'next-role' | 'heading' | 'eof') {
    if (!current) return;
    if (!buffer.trim()) {
      warnings.push({
        role_id: current.role_id,
        version,
        reason: `empty content buffer (flushed by ${end})`,
      });
    }
    const short = extractShortDescription(buffer);
    if (!short) {
      warnings.push({
        role_id: current.role_id,
        version,
        reason: 'could not extract short_description',
      });
    }
    const role: Role = {
      role_id: current.role_id,
      atlas_version: version,
      cluster: current.cluster,
      name: current.name,
      short_description: short || `(no description parsed for ${current.role_id})`,
      automation_trajectory: current.traj,
      ...(version === 'v0.4'
        ? extractCrosswalk(buffer)
        : { isco_08_code: null, soc_2018_code: null, onet_code: null, crosswalk_status: null }),
      ...(version === 'v0.4'
        ? extractEuAiAct(buffer)
        : { eu_ai_act_articles: null, iso_42001_sections: null }),
    };
    roles.push(role);
    current = null;
    buffer = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h3 = line.match(H3_ROLE);
    if (h3) {
      flush('next-role');
      const cluster = h3[1];
      const num = h3[2];
      current = {
        role_id: `${cluster}${num}`,
        cluster,
        name: cleanName(h3[3]),
        traj: detectTrajectory(h3[3]),
      };
      currentStartLine = i + 1;
      continue;
    }
    const inline = line.match(INLINE_ROLE);
    if (inline) {
      flush('next-role');
      const cluster = inline[1];
      const num = inline[2];
      const nameRaw = inline[3];
      const rest = inline[4];
      current = {
        role_id: `${cluster}${num}`,
        cluster,
        name: cleanName(nameRaw),
        traj: detectTrajectory(nameRaw),
      };
      currentStartLine = i + 1;
      // Synthesize a "What they do." paragraph from the post-bold remainder
      // so the same short-description extractor works for inline roles.
      buffer = `**What they do.** ${rest}\n`;
      continue;
    }
    if (ANY_HEADING.test(line)) {
      // Section/sub-section boundary: terminate the current role's buffer
      // so content from a new section can't be misattributed.
      flush('heading');
      continue;
    }
    if (current) {
      buffer += line + '\n';
    }
  }
  flush('eof');

  return roles;
}
