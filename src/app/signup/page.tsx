import { permanentRedirect } from 'next/navigation'

// Stub: /signup consolidated into /join 4-card router per Batch 4 D5=(a).
// 308 preserves bookmarks + cached references; /join handles auth + identity
// selection in a single flow.
export default function SignupStub() {
  permanentRedirect('/join')
}
