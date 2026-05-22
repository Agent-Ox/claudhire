import { permanentRedirect } from 'next/navigation'

// Stub: hirer messaging consolidated into /messages?as=hirer per Batch 2
// modes refactor. 308 preserves bookmarks + cached references.
export default function EmployerMessagesStub() {
  permanentRedirect('/messages?as=hirer')
}
