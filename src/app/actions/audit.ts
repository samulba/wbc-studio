'use server'

import { createClient, getOrganisationIdOrNull } from '@/lib/supabase/server'

export interface AuditLogEintrag {
  id:             string
  user_id:        string | null
  user_email:     string | null
  aktion:         string
  entitaet_typ:   string
  entitaet_id:    string | null
  entitaet_name:  string | null
  details:        Record<string, unknown> | null
  created_at:     string
}

export interface AuditLogFilter {
  q?:        string             // Suche in user_email, entitaet_name
  aktion?:   string             // exakter Match
  entitaet?: string             // exakter Match
  user_id?:  string
  von?:      string             // ISO-Datum >=
  bis?:      string             // ISO-Datum <=
  page?:     number             // 0-basiert
  perPage?:  number             // Default 25
}

export interface AuditLogResult {
  eintraege: AuditLogEintrag[]
  total:     number
  page:      number
  perPage:   number
}

export async function getAuditLog(filter: AuditLogFilter = {}): Promise<AuditLogResult> {
  const orgId = await getOrganisationIdOrNull()
  if (!orgId) return { eintraege: [], total: 0, page: 0, perPage: 25 }

  const supabase = await createClient()
  const page    = filter.page ?? 0
  const perPage = filter.perPage ?? 25
  const from    = page * perPage
  const to      = from + perPage - 1

  let q = supabase
    .from('audit_log')
    .select('id, user_id, user_email, aktion, entitaet_typ, entitaet_id, entitaet_name, details, created_at', { count: 'exact' })
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filter.aktion)   q = q.eq('aktion', filter.aktion)
  if (filter.entitaet) q = q.eq('entitaet_typ', filter.entitaet)
  if (filter.user_id)  q = q.eq('user_id', filter.user_id)
  if (filter.von)      q = q.gte('created_at', filter.von)
  if (filter.bis)      q = q.lte('created_at', filter.bis)
  if (filter.q?.trim()) {
    const t = filter.q.trim()
    q = q.or(`user_email.ilike.%${t}%,entitaet_name.ilike.%${t}%`)
  }

  const { data, count } = await q
  return {
    eintraege: (data ?? []) as AuditLogEintrag[],
    total:     count ?? 0,
    page,
    perPage,
  }
}
