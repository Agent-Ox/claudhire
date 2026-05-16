/**
 * Public types for @shipstacked/atlas-roles.
 *
 * These mirror the Role shape produced by the canonical parser
 * (src/lib/atlas/parse.ts in the source repo) MINUS DB-only fields
 * (created_at) that are artifacts of the seeding layer and not part
 * of the taxonomy itself.
 */

export type AtlasVersion = 'v0.3' | 'v0.4';

export type Trajectory = 'resistant' | 'partial' | 'collapsible';

export type CrosswalkStatus = 'confident' | 'partial' | 'gap' | 'combined';

export interface AtlasRoleData {
  /** Stable role identifier (e.g. "A1", "B3", "C5"). */
  role_id: string;
  /** Atlas content version this role declaration belongs to. */
  atlas_version: AtlasVersion;
  /** Single-letter cluster (e.g. "A", "B", "C", "D", "E", "F", "G"). */
  cluster: string;
  /** Human-readable role name. */
  name: string;
  /** One-sentence "what they do" summary extracted from the markdown. */
  short_description: string;
  /** Automation trajectory category derived from the markdown emoji marker. */
  automation_trajectory: Trajectory | null;
  /** ISCO-08 code from the **Crosswalks.** paragraph (v0.4+). */
  isco_08_code: string | null;
  /** US BLS SOC 2018 code from the **Crosswalks.** paragraph (v0.4+). */
  soc_2018_code: string | null;
  /** O*NET code from the **Crosswalks.** paragraph (v0.4+). */
  onet_code: string | null;
  /** Crosswalk completeness assessment (v0.4+). */
  crosswalk_status: CrosswalkStatus | null;
  /** EU AI Act article references from the **EU AI Act mapping.** paragraph (v0.4+). */
  eu_ai_act_articles: string[] | null;
  /** ISO/IEC 42001 clause/control references (v0.4+). */
  iso_42001_sections: string[] | null;
}

/** Parse warning emitted by the shared parser; surfaced only at build time. */
export interface ParseWarning {
  role_id: string | null;
  version: string;
  reason: string;
  line?: number;
}
