import { permanentRedirect } from 'next/navigation'

// Alias: /for-hirers → /hirers (the canonical hirer landing). Gives outreach a
// clean, descriptive, typo-proof URL (vs the /hirer singular dashboard). 308
// preserves it as a permanent alias. Mirrors the /employers → /hirers stub.
export default function ForHirersStub() {
  permanentRedirect('/hirers')
}
