const fs = require('fs')
const path = 'src/app/company/[slug]/page.tsx'
let content = fs.readFileSync(path, 'utf8')

// Add createClient import after existing imports
content = content.replace(
  `import { createServerSupabaseClient } from '@/lib/supabase-server'`,
  `import { createServerSupabaseClient } from '@/lib/supabase-server'\nimport { createClient } from '@supabase/supabase-js'`
)

// Replace the applications query to use admin client
content = content.replace(
  `  let appliedJobIds: string[] = []
  if (isBuilder && resolvedUser) {
    const { data: applications } = await supabase
      .from('applications')
      .select('job_id')
      .eq('builder_email', resolvedUser.email)
    appliedJobIds = applications?.map((a: any) => a.job_id) || []
  }`,
  `  let appliedJobIds: string[] = []
  if (isBuilder && resolvedUser) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: applications } = await admin
      .from('applications')
      .select('job_id')
      .eq('builder_email', resolvedUser.email)
    appliedJobIds = applications?.map((a: any) => a.job_id) || []
  }`
)

fs.writeFileSync(path, content)
console.log('Written:', fs.statSync(path).size, 'bytes')

// Verify
const verify = fs.readFileSync(path, 'utf8')
console.log('Has admin client:', verify.includes('createClient(') && verify.includes('SUPABASE_SERVICE_ROLE_KEY'))
console.log('Has createClient import:', verify.includes("import { createClient } from '@supabase/supabase-js'"))
