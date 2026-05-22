import { permanentRedirect } from 'next/navigation'

// Stub: /employer/messages was the Batch 2 stub to /messages?as=hirer.
// Recreated at the old path post-Batch-3 rename to preserve pre-existing
// bookmarks. The new canonical path is /messages?as=hirer.
export default function EmployerMessagesStub() {
  permanentRedirect('/messages?as=hirer')
}
