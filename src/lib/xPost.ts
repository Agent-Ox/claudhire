import { TwitterApi } from 'twitter-api-v2'

const client = new TwitterApi({
  appKey: process.env.X_SHIPSTACKED_API_KEY!,
  appSecret: process.env.X_SHIPSTACKED_API_SECRET!,
  accessToken: process.env.X_SHIPSTACKED_ACCESS_TOKEN!,
  accessSecret: process.env.X_SHIPSTACKED_ACCESS_TOKEN_SECRET!,
})

export async function postJobToX(job: {
  role_title: string
  company_name: string
  location: string
  day_rate?: string
  salary_range?: string
  job_type?: string
  id: string
}) {
  const rate = job.day_rate || job.salary_range || ''
  const type = job.job_type || 'contract'
  const rateText = rate ? ` · ${rate}` : ''

  const tweet = `We are hiring: ${job.role_title}

Company: ${job.company_name}
Location: ${job.location}
Type: ${type}${rateText}

Apply and view full listing:
shipstacked.com/jobs

#AIjobs #buildinpublic #vibecoding #ClaudeCode #hiring`

  try {
    const rwClient = client.readWrite
    const result = await rwClient.v2.tweet(tweet)
    return { success: true, id: result.data.id }
  } catch (err: any) {
    console.error('X post failed:', err?.message || err)
    return { success: false, error: err?.message }
  }
}
