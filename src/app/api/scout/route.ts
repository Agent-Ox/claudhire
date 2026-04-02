import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const supabase = await createServerSupabaseClient()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*, skills(*), projects(*)')
      .eq('published', true)
      .order('created_at', { ascending: false })

    const profileContext = profiles?.map(p => {
      const skills = p.skills?.map((s: any) => `${s.category}: ${s.name}`).join(', ') || 'none listed'
      const projects = p.projects?.map((pr: any) =>
        `Project: ${pr.title}. What they built: ${pr.description}. How they used Claude: ${pr.prompt_approach}. Outcome: ${pr.outcome}`
      ).join(' | ') || 'none listed'

      return `---
NAME: ${p.full_name}
ROLE: ${p.role || 'not specified'}
LOCATION: ${p.location || 'not specified'}
AVAILABILITY: ${p.availability || 'not specified'}
VERIFIED: ${p.verified ? 'yes' : 'no'}
BIO: ${p.bio || 'none'}
ABOUT: ${p.about || 'none'}
SKILLS: ${skills}
PROJECTS: ${projects}
PROFILE URL: claudhire.com/u/${p.username}
---`
    }).join('\n') || 'No profiles available yet.'

    // Detect if this is a builder asking
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || ''
    const isBuilderQuery = lastMsg.includes('hiring') || lastMsg.includes('job') || lastMsg.includes('employer') || lastMsg.includes('my skill') || lastMsg.includes('who is looking') || lastMsg.includes('who\'s looking') || lastMsg.includes('find me work') || lastMsg.includes('opportunity')

    const systemPrompt = `You are Scout, the AI talent concierge for ClaudHire — the hiring platform for Claude-native builders.

You help employers find the right Claude builders quickly and conversationally. You have access to every builder profile on the platform.

Here are all current builder profiles:

${profileContext}

YOUR JOB:
You serve two types of users — employers and builders.

FOR EMPLOYERS: When they describe what they need, surface the best matching builder profiles with a clear explanation of why each is a fit. Be specific — reference actual projects, skills, location, availability. Give 2-4 matches maximum. Always include the profile URL.

FOR BUILDERS: When they ask who is hiring or looking for their skills, describe the kinds of roles and employers on the platform that match their background. Be specific and encouraging. Point them to the jobs board at claudhire.com/jobs and suggest they browse company profiles.

ALWAYS:
- Be concise and useful — this is a tool, not a chatbot
- Never make up information that is not in the profiles above
- Answer general questions about how ClaudHire works

TONE: Confident, sharp, helpful. Like a great recruiter who knows the talent pool deeply.`

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    })

  } catch (err: any) {
    console.error('Scout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
