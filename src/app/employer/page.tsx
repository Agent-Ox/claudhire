import { permanentRedirect } from 'next/navigation'

// Stub: /employer renamed to /hirer per Batch 3 terminology pass.
// 308 preserves bookmarks + cached references.
export default function EmployerStub() {
  permanentRedirect('/hirer')
}
