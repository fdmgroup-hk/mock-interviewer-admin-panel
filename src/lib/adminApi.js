import { getSupabaseClient } from './supabaseClient'

const PAGE_SIZE = 20

export async function sendMagicLink(email) {
    const supabase = getSupabaseClient()
    const appBasePath = import.meta.env.BASE_URL || '/'
    const redirectTo = new URL(appBasePath, window.location.origin).toString()

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectTo,
        },
    })

    if (error) {
        throw new Error(error.message)
    }
}

export async function signOut() {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
        throw new Error(error.message)
    }
}

export async function getSession() {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
        throw new Error(error.message)
    }

    return data.session
}

export function subscribeAuthChanges(callback) {
    const supabase = getSupabaseClient()
    const {
        data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session)
    })

    return () => subscription.unsubscribe()
}

export async function validateAdminAllowlist(userId) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('admin_allowlist')
        .select('id,user_id,is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return Boolean(data?.id)
}

async function resolveUserIdByEmail(email) {
    const normalizedEmail = email?.trim()
    if (!normalizedEmail) {
        return null
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('admin_lookup_user_id_by_email', {
        p_email: normalizedEmail,
    })

    if (error) {
        throw new Error(error.message)
    }

    return data ?? null
}

function applySessionFilters(query, filters) {
    if (filters.status) {
        query = query.eq('status', filters.status)
    }

    if (filters.interviewType) {
        query = query.eq('interview_type', filters.interviewType)
    }

    if (filters.userId) {
        query = query.eq('user_id', filters.userId.trim())
    }

    if (filters.title) {
        query = query.ilike('title', `%${filters.title.trim()}%`)
    }

    if (filters.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`)
    }

    if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`)
    }

    return query
}

export async function listSessions(filters, page = 1) {
    const supabase = getSupabaseClient()
    const start = (page - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    const resolvedUserIdByEmail = await resolveUserIdByEmail(filters.email)

    if (filters.email?.trim() && !resolvedUserIdByEmail) {
        return {
            items: [],
            total: 0,
            pageSize: PAGE_SIZE,
        }
    }

    let query = supabase
        .from('interview_sessions')
        .select(
            `
      id,
      user_id,
      title,
      interview_type,
      status,
      created_at,
      reports ( id, report_type, status, provider, model, created_at, content_markdown ),
      session_questions ( id, position, question_type, question_text, source ),
      answer_summaries ( id, question_id, summary_markdown, metrics, captured_at )
    `,
            { count: 'exact' },
        )
        .order('created_at', { ascending: false })

    if (resolvedUserIdByEmail) {
        query = query.eq('user_id', resolvedUserIdByEmail)
    }

    query = applySessionFilters(query, filters)
    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) {
        throw new Error(error.message)
    }

    return {
        items: data ?? [],
        total: count ?? 0,
        pageSize: PAGE_SIZE,
    }
}

export async function exportSessions(filters) {
    const supabase = getSupabaseClient()
    const resolvedUserIdByEmail = await resolveUserIdByEmail(filters.email)

    if (filters.email?.trim() && !resolvedUserIdByEmail) {
        return []
    }

    let query = supabase
        .from('interview_sessions')
        .select('id,user_id,title,interview_type,status,created_at')
        .order('created_at', { ascending: false })
        .limit(1000)

    if (resolvedUserIdByEmail) {
        query = query.eq('user_id', resolvedUserIdByEmail)
    }

    query = applySessionFilters(query, filters)

    const { data, error } = await query

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []).map((item) => ({
        session_id: item.id,
        user_id: item.user_id,
        title: item.title,
        interview_type: item.interview_type,
        status: item.status,
        created_at: item.created_at,
    }))
}
