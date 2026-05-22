import { permanentRedirect } from 'next/navigation'

// Stub: /employers renamed to /hirers per Batch 3 terminology pass.
// 308 preserves bookmarks + cached references.
export default function EmployersStub() {
  permanentRedirect('/hirers')
}
