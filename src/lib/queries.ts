import { supabase } from './supabase'

function allDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  const d = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  while (d <= e) {
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pivotByDay(rows: any[], anonKey: string, verKey: string) {
  const map: Record<string, any> = {}
  for (const r of rows) {
    const day = r.day
    if (!map[day]) map[day] = { day, anon: 0, ver: 0 }
    if (r.type === 'anonymous') map[day].anon = r[anonKey]
    else map[day].ver = r[verKey]
  }
  return map
}

export async function fetchDashboardData() {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) throw error

  console.log('RPC raw:', JSON.stringify(data, null, 2))

  const raw = data as any
  const today = getToday()
  const allDays = allDaysBetween('2026-04-21', today)
  const cohortDays = allDaysBetween('2026-04-29', today)

  const gamesMap = pivotByDay(raw.dailyGames || [], 'total', 'total')
  const gamesCompMap: Record<string, any> = {}
  for (const r of (raw.dailyGames || [])) {
    if (!gamesCompMap[r.day]) gamesCompMap[r.day] = { anonComp: 0, verComp: 0 }
    if (r.type === 'anonymous') gamesCompMap[r.day].anonComp = r.completed
    else gamesCompMap[r.day].verComp = r.completed
  }

  const dailyGames = allDays.map(day => ({
    day,
    anon: gamesMap[day]?.anon || 0,
    ver: gamesMap[day]?.ver || 0,
    anonComp: gamesCompMap[day]?.anonComp || 0,
    verComp: gamesCompMap[day]?.verComp || 0,
  }))

  const activeMap = pivotByDay(raw.dailyActive || [], 'active', 'active')
  const dailyActive = allDays.map(day => ({
    day,
    anon: activeMap[day]?.anon || 0,
    ver: activeMap[day]?.ver || 0,
  }))

  const signupMap = pivotByDay(raw.dailySignups || [], 'signups', 'signups')
  const dailySignups = allDays.map(day => ({
    day,
    anon: signupMap[day]?.anon || 0,
    ver: signupMap[day]?.ver || 0,
  }))

  const cohortAnonMap: Record<string, number> = {}
  for (const r of (raw.cohortAnon || [])) cohortAnonMap[r.day] = r.returning
  const cohortVerMap: Record<string, number> = {}
  for (const r of (raw.cohortVer || [])) cohortVerMap[r.day] = r.returning

  const cohortRetention = cohortDays.map(day => ({
    day,
    anon: cohortAnonMap[day] || 0,
    ver: cohortVerMap[day] || 0,
  }))

  const rb = raw.retentionBuckets || {}

  return {
    dailyGames,
    dailyActive,
    dailySignups,
    cohortRetention,
    retentionBuckets: {
      zero: rb.zero || 0,
      one: rb.one || 0,
      two5: rb.two5 || 0,
      six20: rb.six20 || 0,
      twenty: rb.twenty || 0,
    },
    zeroGameUsers: raw.zeroGameUsers || 0,
    topAnon: raw.topAnon || [],
    topVerified: raw.topVerified || [],
  }
}