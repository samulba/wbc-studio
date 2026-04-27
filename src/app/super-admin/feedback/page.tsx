import { getAlleFeedbacks } from '@/app/actions/feedback'
import FeedbackInbox from './FeedbackInbox'
import type { FeedbackStatus, FeedbackTyp, FeedbackPrioritaet } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const STATI: FeedbackStatus[] = ['neu', 'in_arbeit', 'erledigt', 'abgelehnt', 'duplikat']
const TYPEN: FeedbackTyp[] = ['bug', 'feature', 'frage', 'lob', 'sonstiges']
const PRIOS: FeedbackPrioritaet[] = ['niedrig', 'normal', 'hoch', 'kritisch']

export default async function SuperAdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; typ?: string; prioritaet?: string; suche?: string }>
}) {
  const p = await searchParams
  const filter = {
    status:     STATI.includes(p.status as FeedbackStatus) ? (p.status as FeedbackStatus) : undefined,
    typ:        TYPEN.includes(p.typ as FeedbackTyp) ? (p.typ as FeedbackTyp) : undefined,
    prioritaet: PRIOS.includes(p.prioritaet as FeedbackPrioritaet) ? (p.prioritaet as FeedbackPrioritaet) : undefined,
    suche:      p.suche,
  }
  const feedbacks = await getAlleFeedbacks(filter)
  return <FeedbackInbox feedbacks={feedbacks} />
}
