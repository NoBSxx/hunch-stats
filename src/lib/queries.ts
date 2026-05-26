import { supabase } from './supabase'

const ARTICLE_DATE = '2026-04-21'
const SURGE_START = '2026-04-21'
const SURGE_END = '2026-04-28T23:59:59'

function toDateStr(d: string) {
  return d.slice(0, 10)
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

async function fetchAll(table: string, since: string, columns = '*') {
  const rows: any[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

export async function fetchDashboardData() {
  const [anonGames, verGames, anonUsers, verUsers] = await Promise.all([
    fetchAll('game_log_daily_anonymous', ARTICLE_DATE, 'id,user_id,created_at,completed'),
    fetchAll('game_log_daily_user_verified', ARTICLE_DATE, 'id,user_id,created_at,completed,display_name'),
    fetchAll('user_anonymous', ARTICLE_DATE, 'id,created_at'),
    fetchAll('user_verified', ARTICLE_DATE, 'id,created_at,display_name'),
  ])

  const dailyGames = buildDailyGames(anonGames, verGames)
  const dailyActive = buildDailyActive(anonGames, verGames)
  const dailySignups = buildDailySignups(anonUsers, verUsers)
  const cohortRetention = buildCohortRetention(anonGames, verGames, anonUsers, verUsers)
  const retentionBuckets = buildRetentionBuckets(anonGames, anonUsers)
  const zeroGameUsers = anonUsers.filter(
    (u: any) => !anonGames.some((g: any) => g.user_id === u.id)
  ).length
  const topAnon = buildTopAnon(anonGames, anonUsers)
  const topVerified = buildTopVerified(verGames, verUsers)

  return {
    dailyGames,
    dailyActive,
    dailySignups,
    cohortRetention,
    retentionBuckets,
    zeroGameUsers,
    topAnon,
    topVerified,
    totalAnonUsers: anonUsers.length,
    totalVerifiedUsers: verUsers.length,
  }
}

function groupByDay<T>(rows: T[], dateField = 'created_at'): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  for (const r of rows) {
    const day = toDateStr((r as any)[dateField])
    if (!map[day]) map[day] = []
    map[day].push(r)
  }
  return map
}

function allDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  const d = new Date(start)
  const e = new Date(end)
  while (d <= e) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function buildDailyGames(anonGames: any[], verGames: any[]) {
  const anonByDay = groupByDay(anonGames)
  const verByDay = groupByDay(verGames)
  const today = new Date().toISOString().slice(0, 10)
  const days = allDaysBetween(ARTICLE_DATE, today)

  return days.map(day => {
    const ag = anonByDay[day] || []
    const vg = verByDay[day] || []
    return {
      day,
      anon: ag.length,
      anonComp: ag.filter((g: any) => g.completed).length,
      ver: vg.length,
      verComp: vg.filter((g: any) => g.completed).length,
    }
  })
}

function buildDailyActive(anonGames: any[], verGames: any[]) {
  const anonByDay = groupByDay(anonGames)
  const verByDay = groupByDay(verGames)
  const today = new Date().toISOString().slice(0, 10)
  const days = allDaysBetween(ARTICLE_DATE, today)

  return days.map(day => {
    const ag = anonByDay[day] || []
    const vg = verByDay[day] || []
    return {
      day,
      anon: new Set(ag.map((g: any) => g.user_id)).size,
      ver: new Set(vg.map((g: any) => g.user_id)).size,
      anonCompleted: new Set(ag.filter((g: any) => g.completed).map((g: any) => g.user_id)).size,
      verCompleted: new Set(vg.filter((g: any) => g.completed).map((g: any) => g.user_id)).size,
    }
  })
}

function buildDailySignups(anonUsers: any[], verUsers: any[]) {
  const anonByDay = groupByDay(anonUsers)
  const verByDay = groupByDay(verUsers)
  const today = new Date().toISOString().slice(0, 10)
  const days = allDaysBetween(ARTICLE_DATE, today)

  return days.map(day => ({
    day,
    anon: (anonByDay[day] || []).length,
    ver: (verByDay[day] || []).length,
  }))
}

function buildCohortRetention(anonGames: any[], verGames: any[], anonUsers: any[], verUsers: any[]) {
  const surgeAnon = new Set(
    anonUsers.filter((u: any) => u.created_at >= SURGE_START && u.created_at <= SURGE_END).map((u: any) => u.id)
  )
  const surgeVer = new Set(
    verUsers.filter((u: any) => u.created_at >= SURGE_START && u.created_at <= SURGE_END).map((u: any) => u.id)
  )

  const postSurgeAnon = anonGames.filter((g: any) => g.created_at > SURGE_END && surgeAnon.has(g.user_id))
  const postSurgeVer = verGames.filter((g: any) => g.created_at > SURGE_END && surgeVer.has(g.user_id))

  const anonByDay = groupByDay(postSurgeAnon)
  const verByDay = groupByDay(postSurgeVer)

  const today = new Date().toISOString().slice(0, 10)
  const startDay = '2026-04-29'
  const days = allDaysBetween(startDay, today)

  return days.map(day => ({
    day,
    anon: new Set((anonByDay[day] || []).map((g: any) => g.user_id)).size,
    ver: new Set((verByDay[day] || []).map((g: any) => g.user_id)).size,
  }))
}

function buildRetentionBuckets(anonGames: any[], anonUsers: any[]) {
  const gameCounts: Record<string, number> = {}
  for (const u of anonUsers) gameCounts[u.id] = 0
  for (const g of anonGames) {
    if (gameCounts[g.user_id] !== undefined) gameCounts[g.user_id]++
  }

  const buckets = { zero: 0, one: 0, two5: 0, six20: 0, twenty: 0 }
  for (const count of Object.values(gameCounts)) {
    if (count === 0) buckets.zero++
    else if (count === 1) buckets.one++
    else if (count <= 5) buckets.two5++
    else if (count <= 20) buckets.six20++
    else buckets.twenty++
  }
  return buckets
}

function buildTopAnon(anonGames: any[], anonUsers: any[]) {
  const counts: Record<string, number> = {}
  for (const g of anonGames) {
    counts[g.user_id] = (counts[g.user_id] || 0) + 1
  }
  const userMap = new Map(anonUsers.map((u: any) => [u.id, u]))
  return Object.entries(counts)
    .filter(([, c]) => c >= 10)
    .sort((a, b) => b[1] - a[1])
    .map(([id, games]) => ({
      id: id.slice(0, 8),
      fullId: id,
      games,
      since: toDateStr(userMap.get(id)?.created_at || ''),
    }))
}

function buildTopVerified(verGames: any[], verUsers: any[]) {
  const counts: Record<string, number> = {}
  for (const g of verGames) {
    counts[g.user_id] = (counts[g.user_id] || 0) + 1
  }
  const userMap = new Map(verUsers.map((u: any) => [u.id, u]))
  return Object.entries(counts)
    .filter(([, c]) => c >= 5)
    .sort((a, b) => b[1] - a[1])
    .map(([id, games]) => ({
      id,
      name: userMap.get(id)?.display_name || id.slice(0, 8),
      games,
      since: toDateStr(userMap.get(id)?.created_at || ''),
    }))
}
