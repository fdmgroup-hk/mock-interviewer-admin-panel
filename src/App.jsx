import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
    exportSessions,
    getSession,
    listSessions,
    sendMagicLink,
    signOut,
    subscribeAuthChanges,
    validateAdminAllowlist,
} from './lib/adminApi'
import { downloadCsv } from './lib/csv'
import './App.css'

const EMPTY_FILTERS = {
    status: '',
    interviewType: '',
    userId: '',
    title: '',
    dateFrom: '',
    dateTo: '',
}

function formatDate(value) {
    if (!value) {
        return '-'
    }

    return new Date(value).toLocaleString()
}

function LoadingScreen({ message }) {
    return (
        <main className="shell center-panel">
            <div className="panel card">
                <h2>{message}</h2>
            </div>
        </main>
    )
}

function LoginScreen({ onSendLink, isSending, sendError, infoMessage }) {
    const [email, setEmail] = useState('')

    const submit = async (event) => {
        event.preventDefault()
        await onSendLink(email)
    }

    return (
        <main className="shell center-panel">
            <section className="panel card auth-card">
                <p className="eyebrow">Mock Interview Admin</p>
                <h1>Sign in to review interview sessions</h1>
                <p className="copy">Only allowlisted accounts can access this admin dashboard.</p>

                <form className="auth-form" onSubmit={submit}>
                    <label htmlFor="email">Work email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="name@company.com"
                        required
                    />
                    <button type="submit" disabled={isSending}>
                        {isSending ? 'Sending magic link...' : 'Send magic link'}
                    </button>
                </form>

                {sendError ? <p className="message error">{sendError}</p> : null}
                {infoMessage ? <p className="message info">{infoMessage}</p> : null}
            </section>
        </main>
    )
}

function UnauthorizedScreen({ onSignOut, message }) {
    return (
        <main className="shell center-panel">
            <section className="panel card auth-card">
                <p className="eyebrow">Access denied</p>
                <h1>Account is not allowlisted</h1>
                <p className="copy">{message}</p>
                <button type="button" onClick={onSignOut}>
                    Sign out
                </button>
            </section>
        </main>
    )
}

function SessionTable({ sessions, selectedId, onSelect }) {
    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Created</th>
                        <th>User ID</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Reports</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session) => (
                        <tr
                            key={session.id}
                            onClick={() => onSelect(session.id)}
                            className={selectedId === session.id ? 'selected' : ''}
                        >
                            <td>{formatDate(session.created_at)}</td>
                            <td>{session.user_id}</td>
                            <td>{session.title}</td>
                            <td>{session.interview_type}</td>
                            <td>{session.status}</td>
                            <td>{session.reports?.length ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function SessionDetails({ session }) {
    if (!session) {
        return (
            <section className="card details-card">
                <h3>Session details</h3>
                <p>Select a session row to inspect reports, questions, and summaries.</p>
            </section>
        )
    }

    return (
        <section className="card details-card">
            <h3>{session.title}</h3>
            <p>
                <strong>User:</strong> {session.user_id}
            </p>
            <p>
                <strong>Interview type:</strong> {session.interview_type}
            </p>
            <p>
                <strong>Status:</strong> {session.status}
            </p>

            <h4>Questions ({session.session_questions?.length ?? 0})</h4>
            <ul className="detail-list">
                {(session.session_questions ?? []).map((question) => (
                    <li key={question.id}>
                        <span className="badge">#{question.position}</span> [{question.question_type}] {question.question_text}
                    </li>
                ))}
            </ul>

            <h4>Summaries ({session.answer_summaries?.length ?? 0})</h4>
            <ul className="detail-list">
                {(session.answer_summaries ?? []).map((summary) => (
                    <li key={summary.id}>
                        <p>{summary.summary_markdown || '(No summary markdown)'}</p>
                        <small>Captured: {formatDate(summary.captured_at)}</small>
                    </li>
                ))}
            </ul>

            <h4>Reports ({session.reports?.length ?? 0})</h4>
            <ul className="detail-list">
                {(session.reports ?? []).map((report) => (
                    <li key={report.id}>
                        <p>
                            <strong>{report.report_type}</strong> | {report.provider}/{report.model} | {report.status}
                        </p>
                        <pre>{report.content_markdown || '(No markdown content)'}</pre>
                    </li>
                ))}
            </ul>
        </section>
    )
}

function DashboardScreen({ user, onSignOut }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [page, setPage] = useState(1)
    const [sessions, setSessions] = useState([])
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(20)
    const [selectedId, setSelectedId] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [exportState, setExportState] = useState('')

    useEffect(() => {
        let mounted = true

        const run = async () => {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const data = await listSessions(filters, page)
                if (!mounted) {
                    return
                }

                setSessions(data.items)
                setTotal(data.total)
                setPageSize(data.pageSize)
                if (data.items.length > 0 && !data.items.some((item) => item.id === selectedId)) {
                    setSelectedId(data.items[0].id)
                }
            } catch (error) {
                if (mounted) {
                    setErrorMessage(error.message)
                }
            } finally {
                if (mounted) {
                    setIsLoading(false)
                }
            }
        }

        run()

        return () => {
            mounted = false
        }
    }, [filters, page, selectedId])

    const selectedSession = useMemo(
        () => sessions.find((session) => session.id === selectedId),
        [sessions, selectedId],
    )

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    const updateFilter = (name, value) => {
        setPage(1)
        setFilters((prev) => ({ ...prev, [name]: value }))
    }

    const clearFilters = () => {
        setFilters(EMPTY_FILTERS)
        setPage(1)
    }

    const handleExport = async () => {
        setExportState('Exporting CSV...')

        try {
            const rows = await exportSessions(filters)
            downloadCsv('admin-sessions.csv', rows)
            setExportState(`Exported ${rows.length} rows`)
        } catch (error) {
            setExportState(`Export failed: ${error.message}`)
        }
    }

    return (
        <main className="shell">
            <header className="topbar">
                <div>
                    <p className="eyebrow">Mock Interview Admin</p>
                    <h1>Interview Sessions</h1>
                    <p className="copy">Signed in as {user.email}</p>
                </div>
                <button type="button" onClick={onSignOut}>Sign out</button>
            </header>

            <section className="card filters-grid">
                <label>
                    Status
                    <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                        <option value="">All</option>
                        <option value="draft">draft</option>
                        <option value="ready">ready</option>
                        <option value="error">error</option>
                    </select>
                </label>

                <label>
                    Interview Type
                    <select value={filters.interviewType} onChange={(event) => updateFilter('interviewType', event.target.value)}>
                        <option value="">All</option>
                        <option value="mixed">mixed</option>
                        <option value="technical">technical</option>
                        <option value="behavioral">behavioral</option>
                    </select>
                </label>

                <label>
                    User ID
                    <input
                        value={filters.userId}
                        onChange={(event) => updateFilter('userId', event.target.value)}
                        placeholder="auth user UUID"
                    />
                </label>

                <label>
                    Title contains
                    <input
                        value={filters.title}
                        onChange={(event) => updateFilter('title', event.target.value)}
                        placeholder="Interview Session"
                    />
                </label>

                <label>
                    Date from
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(event) => updateFilter('dateFrom', event.target.value)}
                    />
                </label>

                <label>
                    Date to
                    <input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} />
                </label>

                <div className="filter-actions">
                    <button type="button" onClick={clearFilters}>Clear filters</button>
                    <button type="button" onClick={handleExport}>Export CSV</button>
                </div>
            </section>

            {exportState ? <p className="message info">{exportState}</p> : null}
            {errorMessage ? <p className="message error">{errorMessage}</p> : null}

            <section className="split-layout">
                <section className="card table-card">
                    <div className="table-heading">
                        <h2>Sessions ({total})</h2>
                        <p>Page {page} of {totalPages}</p>
                    </div>

                    {isLoading ? <p>Loading sessions...</p> : <SessionTable sessions={sessions} selectedId={selectedId} onSelect={setSelectedId} />}

                    <div className="pager">
                        <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                            Previous
                        </button>
                        <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                            Next
                        </button>
                    </div>
                </section>

                <SessionDetails session={selectedSession} />
            </section>
        </main>
    )
}

function ProtectedRoute({ session, isAdmin, isChecking, onSignOut }) {
    if (isChecking) {
        return <LoadingScreen message="Verifying account access..." />
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    if (!isAdmin) {
        return (
            <UnauthorizedScreen
                message="Your account is authenticated but not allowlisted for admin access."
                onSignOut={onSignOut}
            />
        )
    }

    return <DashboardScreen user={session.user} onSignOut={onSignOut} />
}

export default function App() {
    const [session, setSession] = useState(null)
    const [isBooting, setIsBooting] = useState(true)
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isSendingLink, setIsSendingLink] = useState(false)
    const [infoMessage, setInfoMessage] = useState('')
    const [sendError, setSendError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        let mounted = true

        const check = async (nextSession) => {
            if (!mounted) {
                return
            }

            setSession(nextSession)

            if (!nextSession?.user?.id) {
                setIsAdmin(false)
                setIsCheckingAdmin(false)
                return
            }

            setIsCheckingAdmin(true)
            try {
                const allowed = await validateAdminAllowlist(nextSession.user.id)
                if (mounted) {
                    setIsAdmin(allowed)
                }
            } catch {
                if (mounted) {
                    setIsAdmin(false)
                }
            } finally {
                if (mounted) {
                    setIsCheckingAdmin(false)
                }
            }
        }

            ; (async () => {
                try {
                    const currentSession = await getSession()
                    await check(currentSession)
                } finally {
                    if (mounted) {
                        setIsBooting(false)
                    }
                }
            })()

        const unsubscribe = subscribeAuthChanges((nextSession) => {
            check(nextSession)
        })

        return () => {
            mounted = false
            unsubscribe()
        }
    }, [])

    const handleSendLink = async (email) => {
        setIsSendingLink(true)
        setInfoMessage('')
        setSendError('')

        try {
            await sendMagicLink(email)
            setInfoMessage('Magic link sent. Open your email inbox to continue.')
        } catch (error) {
            setSendError(error.message)
        } finally {
            setIsSendingLink(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        navigate('/login', { replace: true })
    }

    if (isBooting) {
        return <LoadingScreen message="Loading admin panel..." />
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    session ? (
                        <Navigate to="/" replace />
                    ) : (
                        <LoginScreen
                            onSendLink={handleSendLink}
                            isSending={isSendingLink}
                            infoMessage={infoMessage}
                            sendError={sendError}
                        />
                    )
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute
                        session={session}
                        isAdmin={isAdmin}
                        isChecking={isCheckingAdmin}
                        onSignOut={handleSignOut}
                    />
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
