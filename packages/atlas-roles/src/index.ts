/**
 * @shipstacked/atlas-roles — entry point.
 *
 * Exports the Atlas role taxonomy for v0.3 and v0.4 as immutable arrays,
 * plus a lookup helper. Data is generated at build time from the same
 * canonical markdown the live shipstacked.com/atlas pages render
 * (see README.md provenance + verify.ts equivalence proof).
 */

import { rolesV03 } from './data/roles-v0.3.js';
import { rolesV04 } from './data/roles-v0.4.js';
import type { AtlasRoleData, AtlasVersion } from './types.js';

export type { AtlasRoleData, AtlasVersion, Trajectory, CrosswalkStatus, ParseWarning } from './types.js';

/** Current default Atlas content version. Matches ATLAS_VERSION_DEFAULT in the source repo. */
export const ATLAS_VERSION_DEFAULT: AtlasVersion = 'v0.4';

/** All Atlas versions exposed by this package release. */
export const ATLAS_VERSIONS = ['v0.3', 'v0.4'] as const satisfies readonly AtlasVersion[];

/** Frozen role arrays — immutable at runtime. */
export const rolesByVersion: Readonly<Record<AtlasVersion, readonly AtlasRoleData[]>> = Object.freeze({
  'v0.3': rolesV03,
  'v0.4': rolesV04,
});

/** All roles for the default version, as a flat array. */
export const roles: readonly AtlasRoleData[] = rolesV04;

/**
 * Look up a role by id within a given Atlas version. Returns null when
 * the role does not exist in that version (no throw — caller decides).
 *
 * @example
 *   import { getAtlasRoleById } from '@shipstacked/atlas-roles';
 *   const a1 = getAtlasRoleById('A1');                // default v0.4
 *   const c5 = getAtlasRoleById('C5', 'v0.4');
 */
export function getAtlasRoleById(
  roleId: string,
  version: AtlasVersion = ATLAS_VERSION_DEFAULT,
): AtlasRoleData | null {
  const arr = rolesByVersion[version];
  if (!arr) return null;
  const upper = roleId.toUpperCase();
  return arr.find((r) => r.role_id === upper) ?? null;
}

/** Re-export the per-version arrays for direct subpath imports. */
export { rolesV03, rolesV04 };
