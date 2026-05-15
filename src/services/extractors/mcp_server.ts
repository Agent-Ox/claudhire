/**
 * MCP server source extractor.
 *
 * Recognized by the classifier when the URL exposes /.well-known/mcp OR
 * responds with `mcp-*` headers on the primary fetch.
 *
 * Strategy: real protocol introspection (no OG-only fallback).
 *   1. Probe `<url>/.well-known/mcp` for a JSON manifest. Some servers
 *      expose `{ name, version, tools, resources, prompts }` there.
 *   2. If no manifest, perform a JSON-RPC `initialize` request against the
 *      URL itself, followed by `tools/list`. This is the canonical HTTP
 *      transport handshake for MCP.
 *   3. Tool names harvest as capability tags (stronger signal than README
 *      keyword matching).
 *
 * Graceful degradation: any failure → minimal `MCP server (introspection
 * failed)` output rather than throwing. The user can still publish the URL
 * at L0_claimed.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 * MCP spec: https://modelcontextprotocol.io/specification
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

const USER_AGENT = 'ShipStacked-Analyzer/0.1';
const HANDSHAKE_TIMEOUT_MS = 5_000;
const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;
const MAX_TOOLS_IN_CAPABILITIES = 12;
const PROTOCOL_VERSION = '2024-11-05';

interface McpTool {
  name?: string;
  description?: string;
}

interface McpManifest {
  name?: string;
  version?: string;
  tools?: McpTool[];
  resources?: Array<{ uri?: string; name?: string }>;
  prompts?: Array<{ name?: string; description?: string }>;
}

interface JsonRpcResponse<T> {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: { code: number; message: string };
}

interface InitializeResult {
  protocolVersion?: string;
  serverInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
}

interface ToolsListResult {
  tools?: McpTool[];
}

function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function probeManifest(url: URL): Promise<McpManifest | null> {
  try {
    const well = new URL('/.well-known/mcp', url);
    const res = await fetch(well.href, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: timeoutSignal(HANDSHAKE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.toLowerCase().includes('json')) return null;
    return (await res.json()) as McpManifest;
  } catch {
    return null;
  }
}

async function jsonRpcCall<T>(
  url: URL,
  method: string,
  params: Record<string, unknown> | undefined,
  id: number
): Promise<T | null> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    ...(params !== undefined ? { params } : {}),
  });
  try {
    const res = await fetch(url.href, {
      method: 'POST',
      headers: {
        'user-agent': USER_AGENT,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body,
      signal: timeoutSignal(HANDSHAKE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.toLowerCase().includes('json')) return null;
    const data = (await res.json()) as JsonRpcResponse<T>;
    if (data.error) return null;
    return data.result ?? null;
  } catch {
    return null;
  }
}

function toolNameToCapability(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function harvestToolCapabilities(tools: McpTool[]): string[] {
  const out = new Set<string>();
  for (const t of tools) {
    if (!t.name) continue;
    const tag = toolNameToCapability(t.name);
    if (tag) out.add(tag);
    if (out.size >= MAX_TOOLS_IN_CAPABILITIES) break;
  }
  return [...out];
}

function describeMcpServer(info: {
  name: string;
  version: string | null;
  tools: McpTool[];
}): string {
  const lines: string[] = [];
  if (info.version) {
    lines.push(`**${info.name}** (version ${info.version})`);
  } else {
    lines.push(`**${info.name}**`);
  }
  if (info.tools.length === 0) {
    lines.push('');
    lines.push('No tools advertised.');
  } else {
    lines.push('');
    lines.push(`Exposes ${info.tools.length} tool${info.tools.length === 1 ? '' : 's'}:`);
    for (const t of info.tools.slice(0, 20)) {
      if (!t.name) continue;
      const desc = t.description ? ` — ${t.description.replace(/\s+/g, ' ').slice(0, 200)}` : '';
      lines.push(`- \`${t.name}\`${desc}`);
    }
    if (info.tools.length > 20) {
      lines.push(`- … and ${info.tools.length - 20} more`);
    }
  }
  return lines.join('\n').slice(0, MAX_DESCRIPTION);
}

export async function extractMcpServer(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url } = input;

  // Path 1: well-known manifest.
  const manifest = await probeManifest(url);
  let serverName: string | null = manifest?.name ?? null;
  let serverVersion: string | null = manifest?.version ?? null;
  let tools: McpTool[] = manifest?.tools ?? [];

  // Path 2: live JSON-RPC handshake against the URL.
  if (!serverName) {
    const init = await jsonRpcCall<InitializeResult>(url, 'initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'ShipStacked-Analyzer', version: '0.1' },
    }, 1);
    if (init?.serverInfo?.name) {
      serverName = init.serverInfo.name;
      serverVersion = init.serverInfo.version ?? null;
      const toolsList = await jsonRpcCall<ToolsListResult>(url, 'tools/list', undefined, 2);
      if (toolsList?.tools) tools = toolsList.tools;
    }
  }

  const introspectionFailed = !serverName;
  const displayName = serverName ?? 'MCP server';
  const title_draft = introspectionFailed
    ? `MCP server (introspection failed) — ${url.hostname}`.slice(0, MAX_TITLE)
    : `${displayName} MCP server`.slice(0, MAX_TITLE);

  const description_draft = introspectionFailed
    ? `Could not complete MCP handshake at ${url.href}. The URL was flagged as an MCP server by the classifier but did not respond to /.well-known/mcp or a JSON-RPC initialize call within ${HANDSHAKE_TIMEOUT_MS / 1000}s. Publish anyway and edit details below.`
    : describeMcpServer({ name: displayName, version: serverVersion, tools });

  const artifacts: Artifact[] = [
    {
      kind: 'url',
      url: url.href,
      ...(title_draft ? { title: title_draft } : {}),
      fetched_at: new Date().toISOString(),
    },
  ];

  // Stack: mcp is the defining tool. Add anthropic-sdk if the manifest /
  // serverInfo strongly hints at it (commonly server names like "anthropic-*"
  // or version strings containing fastmcp / mcp-typescript-sdk markers).
  const stack: StackElement[] = [{ name: 'mcp', category: 'tool', role: 'primary' }];
  const fingerprint = `${serverName ?? ''} ${serverVersion ?? ''}`.toLowerCase();
  if (/anthropic|claude/.test(fingerprint)) {
    stack.push({ name: 'anthropic-sdk', category: 'framework', role: 'supporting' });
  }

  const capabilities = harvestToolCapabilities(tools);

  return {
    title_draft,
    description_draft,
    artifacts: artifacts.slice(0, MAX_ARTIFACTS),
    stack,
    outcomes_suggestions: [],
    capabilities,
  };
}
