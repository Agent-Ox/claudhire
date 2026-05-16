/**
 * Article markup for individual Build Feed posts at /feed/[id].
 *
 * Reconciles the existing inline Article at src/app/feed/[id]/page.tsx.
 * Author is a Person reference via @id (the canonical /u/<username>) —
 * one URL keys the author's identity across this Article, the Person
 * markup on /u/[username], and the V2 receipt's author field.
 *
 * H9a guard: this builder must only be invoked AFTER the page's data
 * fetch has confirmed `profiles.published = true` for the author. The
 * page-level filter is the gate; this builder trusts its input.
 *
 * Spec: BEACON_1_DISCOVERY.md §H8, §H9a
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, articleId, orgId, personId } from './context.ts'

export interface ArticlePostInput {
  id: string
  title: string
  problem_solved: string | null
  outcome: string | null
  tools_used: string | null
  url: string | null
  created_at: string
}

export interface ArticleAuthorInput {
  username: string
  full_name: string | null
}

export interface ArticleJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['Article', 'shipstacked:BuildPost']
  '@id': string
  headline: string
  description: string
  datePublished: string
  author: { '@id': string; '@type': 'Person'; name: string; url: string }
  publisher: { '@id': string }
  url: string
  mainEntityOfPage: string
  isBasedOn?: string
  keywords?: string
}

export function buildArticleJsonLd(
  post: ArticlePostInput,
  author: ArticleAuthorInput,
): ArticleJsonLd {
  const canonical = articleId(post.id)
  const description =
    post.problem_solved?.trim() ||
    post.outcome?.trim() ||
    `${author.full_name?.trim() || author.username} shipped this on ShipStacked`

  const out: ArticleJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': ['Article', 'shipstacked:BuildPost'],
    '@id': canonical,
    headline: post.title,
    description,
    datePublished: post.created_at,
    author: {
      '@id': personId(author.username),
      '@type': 'Person',
      name: author.full_name?.trim() || author.username,
      url: personId(author.username),
    },
    publisher: { '@id': orgId() },
    url: canonical,
    mainEntityOfPage: canonical,
  }

  if (post.url && post.url.trim().length > 0) out.isBasedOn = post.url
  if (post.tools_used && post.tools_used.trim().length > 0) out.keywords = post.tools_used

  return out
}

export { CANONICAL_HOST }
