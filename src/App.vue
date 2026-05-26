<template>
  <div class="dashboard" v-if="loaded">
    <div class="header">
      <h1>Hunch</h1>
      <span class="sub">Player Analytics</span>
      <span class="pill">Live</span>
      <button class="refresh-btn" @click="refresh" :disabled="loading">{{ loading ? 'Loading…' : '↻ Refresh' }}</button>
    </div>

    <div class="tab-bar">
      <button v-for="t in tabs" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </div>

    <template v-if="tab === 'overview'">
      <div class="kpi-row">
        <div class="kpi accent-blue">
          <div class="label">Games Today</div>
          <div class="value">{{ kpi.gamesToday }}</div>
          <div class="delta" :class="kpi.gamesDelta >= 0 ? 'up' : 'down'">
            {{ kpi.gamesDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(kpi.gamesDelta) }} vs yesterday
          </div>
        </div>
        <div class="kpi accent-green">
          <div class="label">Active Players</div>
          <div class="value">{{ kpi.activeToday }}</div>
          <div class="mini">{{ kpi.activeAnonToday }} anon · {{ kpi.activeVerToday }} verified</div>
        </div>
        <div class="kpi accent-amber">
          <div class="label">Completion Rate</div>
          <div class="value">{{ kpi.completionToday }}%</div>
          <div class="mini">{{ kpi.completedToday }}/{{ kpi.gamesToday }}</div>
        </div>
        <div class="kpi accent-purple">
          <div class="label">7-Day Avg Games</div>
          <div class="value">{{ kpi.avg7Games }}</div>
          <div class="mini">{{ kpi.avg7Anon }} anon · {{ kpi.avg7Ver }} verified</div>
        </div>
        <div class="kpi accent-cyan">
          <div class="label">New Signups Today</div>
          <div class="value">{{ kpi.signupsToday }}</div>
          <div class="mini">{{ kpi.signupsAnonToday }} anon · {{ kpi.signupsVerToday }} verified</div>
        </div>
        <div class="kpi accent-rose">
          <div class="label">Cohort Still Active</div>
          <div class="value">{{ kpi.cohortToday }}</div>
          <div class="mini">from Apr 21–28 surge</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--accent)"></span>Daily Games Played</div>
          <div class="chart-wrap tall"><canvas ref="chartDailyGames"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--green)"></span>Daily Active Players</div>
          <div class="chart-wrap tall"><canvas ref="chartActivePlayers"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--amber)"></span>Completion Rate</div>
          <div class="chart-wrap"><canvas ref="chartCompletion"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--cyan)"></span>New Signups Per Day</div>
          <div class="chart-wrap"><canvas ref="chartSignups"></canvas></div>
        </div>
      </div>
    </template>

    <template v-if="tab === 'engagement'">
      <div class="kpi-row">
        <div class="kpi accent-blue">
          <div class="label">Total Games</div>
          <div class="value">{{ eng.totalGames }}</div>
        </div>
        <div class="kpi accent-green">
          <div class="label">Total Completed</div>
          <div class="value">{{ eng.totalCompleted }}</div>
        </div>
        <div class="kpi accent-amber">
          <div class="label">Overall Completion</div>
          <div class="value">{{ eng.overallCompletion }}%</div>
        </div>
        <div class="kpi accent-purple">
          <div class="label">Anon Game Share</div>
          <div class="value">{{ eng.anonShare }}%</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px">
        <div class="card-title"><span class="dot" style="background: var(--accent)"></span>Games by Type — Stacked</div>
        <div class="chart-wrap tall"><canvas ref="chartStacked"></canvas></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--amber)"></span>Completed vs Incomplete — Anonymous</div>
          <div class="chart-wrap"><canvas ref="chartCompAnon"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--green)"></span>Completed vs Incomplete — Verified</div>
          <div class="chart-wrap"><canvas ref="chartCompVer"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Games Per Player (7-Day Avg)</div>
        <div v-for="s in eng.sparklines" :key="s.label" class="sparkline-row">
          <span class="spark-label">{{ s.label }}</span>
          <div class="spark-bar-track"><div class="spark-bar-fill" :style="{ width: s.pct + '%', background: s.color }"></div></div>
          <span class="spark-val" :style="{ color: s.color }">{{ s.val }}</span>
        </div>
      </div>
    </template>

    <template v-if="tab === 'retention'">
      <div class="kpi-row">
        <div class="kpi accent-green">
          <div class="label">Surge Cohort Size</div>
          <div class="value">{{ ret.cohortSize }}</div>
          <div class="mini">users created Apr 21–28</div>
        </div>
        <div class="kpi accent-blue">
          <div class="label">Still Playing</div>
          <div class="value">{{ kpi.cohortToday }}</div>
          <div class="delta" :class="ret.cohortPct > 5 ? 'up' : 'down'">{{ ret.cohortPct }}% of cohort</div>
        </div>
        <div class="kpi accent-rose">
          <div class="label">Zero-Game (Bots)</div>
          <div class="value">{{ data.zeroGameUsers }}</div>
        </div>
        <div class="kpi accent-purple">
          <div class="label">Power Users (20+)</div>
          <div class="value">{{ ret.buckets.twenty }}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px">
        <div class="card-title"><span class="dot" style="background: var(--purple)"></span>Retention Funnel</div>
        <div class="retention-bar">
          <div v-for="b in ret.funnelViz" :key="b.label" :style="{ width: b.pct + '%', background: b.color }" :title="b.label + ': ' + b.count">
            {{ b.count }}
          </div>
        </div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px">
          <span v-for="b in ret.funnelViz" :key="'l-' + b.label" style="font-size: 11px; display: flex; align-items: center; gap: 5px">
            <span :style="{ width: '10px', height: '10px', borderRadius: '2px', background: b.color, display: 'inline-block' }"></span>
            <span style="color: var(--text-dim)">{{ b.label }}</span>
          </span>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--cyan)"></span>Cohort Return Rate</div>
          <div class="chart-wrap tall"><canvas ref="chartCohort"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--accent)"></span>Retention Buckets</div>
          <div class="chart-wrap tall"><canvas ref="chartDoughnut"></canvas></div>
        </div>
      </div>
    </template>

    <template v-if="tab === 'players'">
      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--green)"></span>Top Verified Players</div>
          <div class="chart-wrap tall"><canvas ref="chartTopVer"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="dot" style="background: var(--accent)"></span>Top Anonymous Players</div>
          <div class="chart-wrap tall"><canvas ref="chartTopAnon"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Verified Leaderboard</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Player</th><th>Games</th><th>Since</th></tr></thead>
              <tbody>
                <tr v-for="p in data.topVerified" :key="p.id"><td>{{ p.name }}</td><td>{{ p.games }}</td><td>{{ p.since }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Anonymous Power Users (10+ games)</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Games</th><th>Since</th></tr></thead>
              <tbody>
                <tr v-for="p in data.topAnon" :key="p.fullId"><td>{{ p.id }}</td><td>{{ p.games }}</td><td>{{ p.since }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>

  <div v-else class="loading-screen">
    <div class="loading-spinner"></div>
    <p>{{ loadError || 'Fetching data from Supabase…' }}</p>
    <button v-if="loadError" class="refresh-btn" @click="refresh">Retry</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, type Ref } from 'vue'
import { Chart, registerables } from 'chart.js'
import { fetchDashboardData } from './lib/queries'

Chart.register(...registerables)

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'retention', label: 'Retention' },
  { id: 'players', label: 'Top Players' },
]
const tab = ref('overview')
const loaded = ref(false)
const loading = ref(false)
const loadError = ref('')
const data: Ref<any> = ref({})
const charts: Record<string, Chart> = {}

const chartDailyGames = ref<HTMLCanvasElement>()
const chartActivePlayers = ref<HTMLCanvasElement>()
const chartCompletion = ref<HTMLCanvasElement>()
const chartSignups = ref<HTMLCanvasElement>()
const chartStacked = ref<HTMLCanvasElement>()
const chartCompAnon = ref<HTMLCanvasElement>()
const chartCompVer = ref<HTMLCanvasElement>()
const chartCohort = ref<HTMLCanvasElement>()
const chartDoughnut = ref<HTMLCanvasElement>()
const chartTopVer = ref<HTMLCanvasElement>()
const chartTopAnon = ref<HTMLCanvasElement>()

const chartOpts: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#8892a8', font: { family: 'DM Sans', size: 11 }, boxWidth: 12, padding: 14 } },
    tooltip: { backgroundColor: '#1a1e28', titleColor: '#e8ecf4', bodyColor: '#8892a8', borderColor: '#2a3040', borderWidth: 1, cornerRadius: 8, padding: 10, bodyFont: { family: 'JetBrains Mono', size: 12 }, titleFont: { family: 'DM Sans', size: 12, weight: 'bold' } },
  },
  scales: {
    x: { grid: { color: '#1a1e28' }, ticks: { color: '#5c6478', font: { family: 'JetBrains Mono', size: 10 }, maxRotation: 45 } },
    y: { grid: { color: '#1a1e28' }, ticks: { color: '#5c6478', font: { family: 'JetBrains Mono', size: 10 } }, beginAtZero: true },
  },
}

function fmt(d: string) { return d.slice(5) }
function last(arr: any[]) { return arr[arr.length - 1] }
function lastN(arr: any[], n: number) { return arr.slice(-n) }
function avg(arr: number[]) { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0 }

const kpi = computed(() => {
  if (!data.value.dailyGames) return {}
  const dg = data.value.dailyGames
  const da = data.value.dailyActive
  const ds = data.value.dailySignups
  const cr = data.value.cohortRetention
  const t = last(dg)
  const y = dg[dg.length - 2] || t
  const tA = last(da)
  const tS = last(ds)
  const tC = last(cr)
  const l7 = lastN(dg, 7)
  return {
    gamesToday: t.anon + t.ver,
    gamesDelta: (t.anon + t.ver) - (y.anon + y.ver),
    completedToday: t.anonComp + t.verComp,
    completionToday: (t.anon + t.ver) ? Math.round((t.anonComp + t.verComp) / (t.anon + t.ver) * 100) : 0,
    activeToday: tA.anon + tA.ver,
    activeAnonToday: tA.anon,
    activeVerToday: tA.ver,
    signupsToday: tS.anon + tS.ver,
    signupsAnonToday: tS.anon,
    signupsVerToday: tS.ver,
    cohortToday: tC ? tC.anon + tC.ver : 0,
    avg7Games: avg(l7.map((d: any) => d.anon + d.ver)),
    avg7Anon: avg(l7.map((d: any) => d.anon)),
    avg7Ver: avg(l7.map((d: any) => d.ver)),
  }
})

const eng = computed(() => {
  if (!data.value.dailyGames) return {}
  const dg = data.value.dailyGames
  const da = data.value.dailyActive
  const totalGames = dg.reduce((s: number, d: any) => s + d.anon + d.ver, 0)
  const totalCompleted = dg.reduce((s: number, d: any) => s + d.anonComp + d.verComp, 0)
  const totalAnon = dg.reduce((s: number, d: any) => s + d.anon, 0)
  const l7g = lastN(dg, 7)
  const l7a = lastN(da, 7)
  const avgAG = l7g.reduce((s: number, d: any) => s + d.anon, 0) / 7
  const avgAP = l7a.reduce((s: number, d: any) => s + d.anon, 0) / 7
  const avgVG = l7g.reduce((s: number, d: any) => s + d.ver, 0) / 7
  const avgVP = l7a.reduce((s: number, d: any) => s + d.ver, 0) / 7
  const aGPP = avgAP > 0 ? avgAG / avgAP : 0
  const vGPP = avgVP > 0 ? avgVG / avgVP : 0
  const cGPP = (avgAP + avgVP) > 0 ? (avgAG + avgVG) / (avgAP + avgVP) : 0
  const mx = Math.max(aGPP, vGPP, cGPP, 1)
  return {
    totalGames,
    totalCompleted,
    overallCompletion: totalGames ? Math.round(totalCompleted / totalGames * 100) : 0,
    anonShare: totalGames ? Math.round(totalAnon / totalGames * 100) : 0,
    sparklines: [
      { label: 'Anonymous', val: aGPP.toFixed(1), pct: aGPP / mx * 100, color: 'var(--accent)' },
      { label: 'Verified', val: vGPP.toFixed(1), pct: vGPP / mx * 100, color: 'var(--green)' },
      { label: 'Combined', val: cGPP.toFixed(1), pct: cGPP / mx * 100, color: 'var(--purple)' },
    ],
  }
})

const ret = computed(() => {
  if (!data.value.retentionBuckets) return {}
  const b = data.value.retentionBuckets
  const total = b.zero + b.one + b.two5 + b.six20 + b.twenty
  return {
    buckets: b,
    cohortSize: total,
    cohortPct: total ? Math.round((kpi.value.cohortToday || 0) / total * 100) : 0,
    funnelViz: [
      { label: 'Zero games (bots)', count: b.zero, pct: b.zero / total * 100, color: '#5c6478' },
      { label: 'One & done', count: b.one, pct: b.one / total * 100, color: 'var(--rose)' },
      { label: '2–5 games', count: b.two5, pct: b.two5 / total * 100, color: 'var(--amber)' },
      { label: '6–20 games', count: b.six20, pct: b.six20 / total * 100, color: 'var(--accent)' },
      { label: '20+ games', count: b.twenty, pct: b.twenty / total * 100, color: 'var(--green)' },
    ],
  }
})

function destroyCharts() {
  Object.values(charts).forEach(c => c?.destroy())
  Object.keys(charts).forEach(k => delete charts[k])
}

function makeChart(canvas: HTMLCanvasElement | undefined, key: string, config: any) {
  if (!canvas) return
  charts[key] = new Chart(canvas, config)
}

function buildOverview() {
  const dg = data.value.dailyGames
  const da = data.value.dailyActive
  const ds = data.value.dailySignups
  const labels = dg.map((d: any) => fmt(d.day))

  makeChart(chartDailyGames.value, 'dg', {
    type: 'bar', data: { labels, datasets: [
      { label: 'Anonymous', data: dg.map((d: any) => d.anon), backgroundColor: 'rgba(108,156,255,.6)', borderRadius: 3, barPercentage: .7 },
      { label: 'Verified', data: dg.map((d: any) => d.ver), backgroundColor: 'rgba(74,222,128,.6)', borderRadius: 3, barPercentage: .7 },
    ] }, options: { ...chartOpts, scales: { x: { ...chartOpts.scales.x, stacked: true }, y: { ...chartOpts.scales.y, stacked: true } } },
  })

  makeChart(chartActivePlayers.value, 'ap', {
    type: 'line', data: { labels, datasets: [
      { label: 'Anonymous', data: da.map((d: any) => d.anon), borderColor: '#6c9cff', backgroundColor: 'rgba(108,156,255,.08)', fill: true, tension: .3, pointRadius: 1.5, borderWidth: 2 },
      { label: 'Verified', data: da.map((d: any) => d.ver), borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,.08)', fill: true, tension: .3, pointRadius: 1.5, borderWidth: 2 },
    ] }, options: chartOpts,
  })

  makeChart(chartCompletion.value, 'comp', {
    type: 'line', data: { labels, datasets: [
      { label: 'Anon %', data: dg.map((d: any) => d.anon ? Math.round(d.anonComp / d.anon * 100) : null), borderColor: '#6c9cff', tension: .3, pointRadius: 1.5, borderWidth: 2, spanGaps: true },
      { label: 'Verified %', data: dg.map((d: any) => d.ver ? Math.round(d.verComp / d.ver * 100) : null), borderColor: '#4ade80', tension: .3, pointRadius: 1.5, borderWidth: 2, spanGaps: true },
    ] }, options: { ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 50, max: 100, ticks: { ...chartOpts.scales.y.ticks, callback: (v: number) => v + '%' } } } },
  })

  makeChart(chartSignups.value, 'su', {
    type: 'bar', data: { labels: ds.map((d: any) => fmt(d.day)), datasets: [
      { label: 'Anonymous', data: ds.map((d: any) => d.anon), backgroundColor: 'rgba(108,156,255,.5)', borderRadius: 2 },
      { label: 'Verified', data: ds.map((d: any) => d.ver), backgroundColor: 'rgba(74,222,128,.5)', borderRadius: 2 },
    ] }, options: { ...chartOpts, scales: { x: { ...chartOpts.scales.x, stacked: true }, y: { ...chartOpts.scales.y, stacked: true } } },
  })
}

function buildEngagement() {
  const dg = data.value.dailyGames
  const labels = dg.map((d: any) => fmt(d.day))

  makeChart(chartStacked.value, 'stk', {
    type: 'line', data: { labels, datasets: [
      { label: 'Anonymous', data: dg.map((d: any) => d.anon), borderColor: '#6c9cff', backgroundColor: 'rgba(108,156,255,.15)', fill: true, tension: .3, pointRadius: 0, borderWidth: 2 },
      { label: 'Verified', data: dg.map((d: any) => d.ver), borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,.15)', fill: true, tension: .3, pointRadius: 0, borderWidth: 2 },
    ] }, options: { ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, stacked: true } } },
  })

  makeChart(chartCompAnon.value, 'ca', {
    type: 'bar', data: { labels, datasets: [
      { label: 'Completed', data: dg.map((d: any) => d.anonComp), backgroundColor: 'rgba(74,222,128,.5)', borderRadius: 2 },
      { label: 'Incomplete', data: dg.map((d: any) => d.anon - d.anonComp), backgroundColor: 'rgba(248,113,113,.4)', borderRadius: 2 },
    ] }, options: { ...chartOpts, scales: { x: { ...chartOpts.scales.x, stacked: true }, y: { ...chartOpts.scales.y, stacked: true } } },
  })

  makeChart(chartCompVer.value, 'cv', {
    type: 'bar', data: { labels, datasets: [
      { label: 'Completed', data: dg.map((d: any) => d.verComp), backgroundColor: 'rgba(74,222,128,.5)', borderRadius: 2 },
      { label: 'Incomplete', data: dg.map((d: any) => d.ver - d.verComp), backgroundColor: 'rgba(248,113,113,.4)', borderRadius: 2 },
    ] }, options: { ...chartOpts, scales: { x: { ...chartOpts.scales.x, stacked: true }, y: { ...chartOpts.scales.y, stacked: true } } },
  })
}

function buildRetention() {
  const cr = data.value.cohortRetention
  const labels = cr.map((d: any) => fmt(d.day))
  const b = data.value.retentionBuckets

  makeChart(chartCohort.value, 'coh', {
    type: 'line', data: { labels, datasets: [
      { label: 'Anon returning', data: cr.map((d: any) => d.anon), borderColor: '#6c9cff', backgroundColor: 'rgba(108,156,255,.1)', fill: true, tension: .3, pointRadius: 2, borderWidth: 2 },
      { label: 'Verified returning', data: cr.map((d: any) => d.ver), borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,.1)', fill: true, tension: .3, pointRadius: 2, borderWidth: 2 },
      { label: 'Total', data: cr.map((d: any) => d.anon + d.ver), borderColor: '#a78bfa', borderDash: [4, 4], tension: .3, pointRadius: 0, borderWidth: 1.5 },
    ] }, options: chartOpts,
  })

  makeChart(chartDoughnut.value, 'dnt', {
    type: 'doughnut', data: {
      labels: ['Zero games', 'One & done', '2–5 games', '6–20 games', '20+ games'],
      datasets: [{ data: [b.zero, b.one, b.two5, b.six20, b.twenty], backgroundColor: ['#3a3f4e', '#f87171', '#fbbf24', '#6c9cff', '#4ade80'], borderWidth: 0, hoverOffset: 8 }],
    }, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' as const, labels: { color: '#8892a8', font: { family: 'DM Sans', size: 11 }, padding: 12, boxWidth: 12 } }, tooltip: chartOpts.plugins.tooltip } },
  })
}

function buildPlayers() {
  const tv = data.value.topVerified.slice(0, 10)
  const ta = data.value.topAnon.slice(0, 10)

  makeChart(chartTopVer.value, 'tv', {
    type: 'bar', data: { labels: tv.map((p: any) => p.name), datasets: [{ data: tv.map((p: any) => p.games), backgroundColor: 'rgba(74,222,128,.55)', borderRadius: 4 }] },
    options: { ...chartOpts, indexAxis: 'y' as const, plugins: { ...chartOpts.plugins, legend: { display: false } }, scales: { x: { ...chartOpts.scales.x }, y: { ...chartOpts.scales.y, grid: { display: false }, ticks: { color: '#e8ecf4', font: { family: 'DM Sans', size: 12 } } } } },
  })

  makeChart(chartTopAnon.value, 'ta', {
    type: 'bar', data: { labels: ta.map((p: any) => p.id), datasets: [{ data: ta.map((p: any) => p.games), backgroundColor: 'rgba(108,156,255,.55)', borderRadius: 4 }] },
    options: { ...chartOpts, indexAxis: 'y' as const, plugins: { ...chartOpts.plugins, legend: { display: false } }, scales: { x: { ...chartOpts.scales.x }, y: { ...chartOpts.scales.y, grid: { display: false }, ticks: { color: '#e8ecf4', font: { family: 'JetBrains Mono', size: 10 } } } } },
  })
}

function renderTab() {
  destroyCharts()
  nextTick(() => {
    if (tab.value === 'overview') buildOverview()
    else if (tab.value === 'engagement') buildEngagement()
    else if (tab.value === 'retention') buildRetention()
    else if (tab.value === 'players') buildPlayers()
  })
}

async function refresh() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await fetchDashboardData()
    loaded.value = true
    nextTick(renderTab)
  } catch (e: any) {
    loadError.value = e.message || 'Failed to fetch data'
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(tab, renderTab)
onMounted(refresh)
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
:root {
  --bg: #0a0c10; --surface: #12151c; --surface-2: #1a1e28; --surface-3: #222836;
  --border: #2a3040; --border-light: #343c50;
  --text: #e8ecf4; --text-dim: #8892a8; --text-muted: #5c6478;
  --accent: #6c9cff; --accent-dim: rgba(108,156,255,.12);
  --green: #4ade80; --green-dim: rgba(74,222,128,.12);
  --amber: #fbbf24; --amber-dim: rgba(251,191,36,.12);
  --rose: #f87171; --rose-dim: rgba(248,113,113,.12);
  --purple: #a78bfa; --purple-dim: rgba(167,139,250,.12);
  --cyan: #22d3ee; --cyan-dim: rgba(34,211,238,.12);
  --radius: 10px; --radius-lg: 14px;
}
html { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased }
body { min-height: 100vh }

.loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; color: var(--text-dim) }
.loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

.dashboard { max-width: 1400px; margin: 0 auto; padding: 32px 24px 64px }
.header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 36px; border-bottom: 1px solid var(--border); padding-bottom: 20px; flex-wrap: wrap }
.header h1 { font-size: 28px; font-weight: 700; letter-spacing: -.5px }
.header .sub { color: var(--text-dim); font-size: 14px }
.header .pill { background: var(--accent-dim); color: var(--accent); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: .5px; text-transform: uppercase }
.refresh-btn { margin-left: auto; background: var(--surface-3); border: 1px solid var(--border); color: var(--text-dim); font-family: inherit; font-size: 12px; padding: 6px 14px; border-radius: 6px; cursor: pointer; transition: all .2s }
.refresh-btn:hover { color: var(--text); border-color: var(--border-light) }
.refresh-btn:disabled { opacity: .5; cursor: default }

.tab-bar { display: flex; gap: 4px; margin-bottom: 28px; background: var(--surface); border-radius: var(--radius); padding: 4px; width: fit-content }
.tab-bar button { background: none; border: none; color: var(--text-dim); font-family: inherit; font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 8px; cursor: pointer; transition: all .2s }
.tab-bar button:hover { color: var(--text) }
.tab-bar button.active { background: var(--surface-3); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.3) }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px }
.kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px 22px }
.kpi .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .8px; color: var(--text-muted); margin-bottom: 8px }
.kpi .value { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 600; line-height: 1 }
.kpi .delta { font-size: 12px; font-weight: 500; margin-top: 6px }
.kpi .delta.up { color: var(--green) } .kpi .delta.down { color: var(--rose) }
.kpi .mini { font-size: 11px; color: var(--text-dim); margin-top: 4px }
.kpi.accent-blue .value { color: var(--accent) }
.kpi.accent-green .value { color: var(--green) }
.kpi.accent-amber .value { color: var(--amber) }
.kpi.accent-purple .value { color: var(--purple) }
.kpi.accent-cyan .value { color: var(--cyan) }
.kpi.accent-rose .value { color: var(--rose) }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px }
@media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr } }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 22px; overflow: hidden }
.card .card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; color: var(--text-dim); margin-bottom: 16px; display: flex; align-items: center; gap: 8px }
.card .card-title .dot { width: 8px; height: 8px; border-radius: 50% }

.chart-wrap { position: relative; height: 260px }
.chart-wrap.tall { height: 340px }

.table-wrap { overflow-x: auto }
table { width: 100%; border-collapse: collapse; font-size: 13px }
thead th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; padding: 8px 12px; border-bottom: 1px solid var(--border) }
tbody td { padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--text-dim); font-family: 'JetBrains Mono', monospace; font-size: 12px }
tbody tr:hover td { background: var(--surface-2); color: var(--text) }
tbody td:first-child { color: var(--text) }

.retention-bar { display: flex; height: 28px; border-radius: 6px; overflow: hidden; margin-bottom: 6px }
.retention-bar div { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace }

.sparkline-row { display: flex; align-items: center; gap: 12px; padding: 6px 0 }
.spark-label { font-size: 12px; color: var(--text-dim); width: 90px; flex-shrink: 0 }
.spark-val { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; width: 40px; text-align: right }
.spark-bar-track { flex: 1; height: 8px; background: var(--surface-3); border-radius: 4px; overflow: hidden }
.spark-bar-fill { height: 100%; border-radius: 4px; transition: width .4s ease }
</style>
