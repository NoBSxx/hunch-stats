<template>
  <div class="dashboard" v-if="loaded">
    <div class="header">
      <div class="title-group">
        <div class="hunch-letters">
          <span v-for="l in 'HUNCH'" :key="l" class="h-letter">{{ l }}</span>
        </div>
        <span class="sub">analytics</span>
      </div>
      <button class="refresh-btn" @click="refresh" :disabled="loading">{{ loading ? '…' : '↻' }}</button>
    </div>

    <div class="tab-bar">
      <button v-for="t in tabs" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </div>

    <template v-if="tab === 'overview'">
      <div class="kpi-row">
        <div class="kpi"><div class="label">Games Today</div><div class="value blue">{{ kpi.gamesToday }}</div><div class="delta" :class="kpi.gamesDelta >= 0 ? 'up' : 'down'">{{ kpi.gamesDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(kpi.gamesDelta) }} vs yesterday</div></div>
        <div class="kpi"><div class="label">Active Players</div><div class="value green">{{ kpi.activeToday }}</div><div class="mini">{{ kpi.activeAnonToday }} anon · {{ kpi.activeVerToday }} verified</div></div>
        <div class="kpi"><div class="label">Completion</div><div class="value gold">{{ kpi.completionToday }}%</div><div class="mini">{{ kpi.completedToday }}/{{ kpi.gamesToday }}</div></div>
        <div class="kpi"><div class="label">7d Avg Games</div><div class="value purple">{{ kpi.avg7Games }}</div><div class="mini">{{ kpi.avg7Anon }} anon · {{ kpi.avg7Ver }} ver</div></div>
        <div class="kpi"><div class="label">Signups Today</div><div class="value blue">{{ kpi.signupsToday }}</div><div class="mini">{{ kpi.signupsAnonToday }} anon · {{ kpi.signupsVerToday }} ver</div></div>
        <div class="kpi"><div class="label">Cohort Active</div><div class="value green">{{ kpi.cohortToday }}</div><div class="mini">Apr 21–28 surge</div></div>
      </div>
      <div class="grid-2"><div class="card"><div class="card-title">Daily Games</div><div class="chart-wrap"><canvas ref="c1"></canvas></div></div><div class="card"><div class="card-title">Active Players</div><div class="chart-wrap"><canvas ref="c2"></canvas></div></div></div>
      <div class="grid-2"><div class="card"><div class="card-title">Completion Rate</div><div class="chart-wrap"><canvas ref="c3"></canvas></div></div><div class="card"><div class="card-title">Signups</div><div class="chart-wrap"><canvas ref="c4"></canvas></div></div></div>
    </template>

    <template v-if="tab === 'engagement'">
      <div class="kpi-row">
        <div class="kpi"><div class="label">Total Games</div><div class="value blue">{{ eng.totalGames }}</div></div>
        <div class="kpi"><div class="label">Completed</div><div class="value green">{{ eng.totalCompleted }}</div></div>
        <div class="kpi"><div class="label">Completion</div><div class="value gold">{{ eng.overallCompletion }}%</div></div>
        <div class="kpi"><div class="label">Anon Share</div><div class="value purple">{{ eng.anonShare }}%</div></div>
      </div>
      <div class="card mb"><div class="card-title">Stacked Games</div><div class="chart-wrap"><canvas ref="c5"></canvas></div></div>
      <div class="grid-2"><div class="card"><div class="card-title">Anonymous Completion</div><div class="chart-wrap"><canvas ref="c6"></canvas></div></div><div class="card"><div class="card-title">Verified Completion</div><div class="chart-wrap"><canvas ref="c7"></canvas></div></div></div>
      <div class="card">
        <div class="card-title">Games Per Player (7d)</div>
        <div v-for="s in eng.sparklines" :key="s.label" class="spark-row">
          <span class="spark-label">{{ s.label }}</span>
          <div class="spark-track"><div class="spark-fill" :style="{ width: s.pct + '%', background: s.color }"></div></div>
          <span class="spark-val" :style="{ color: s.color }">{{ s.val }}</span>
        </div>
      </div>
    </template>

    <template v-if="tab === 'retention'">
      <div class="kpi-row">
        <div class="kpi"><div class="label">Cohort Size</div><div class="value green">{{ ret.cohortSize }}</div><div class="mini">Apr 21–28</div></div>
        <div class="kpi"><div class="label">Still Playing</div><div class="value blue">{{ kpi.cohortToday }}</div><div class="delta" :class="ret.cohortPct > 5 ? 'up' : 'down'">{{ ret.cohortPct }}%</div></div>
        <div class="kpi"><div class="label">Zero-Game</div><div class="value" style="color:#ff6b6b">{{ data.zeroGameUsers }}</div><div class="mini">bots / crawlers</div></div>
        <div class="kpi"><div class="label">Power (20+)</div><div class="value purple">{{ ret.buckets.twenty }}</div></div>
      </div>
      <div class="card mb">
        <div class="card-title">Retention Funnel</div>
        <div class="funnel-bar"><div v-for="b in ret.funnelViz" :key="b.label" :style="{ width: b.pct + '%', background: b.color }">{{ b.count }}</div></div>
        <div class="funnel-legend"><span v-for="b in ret.funnelViz" :key="'l-' + b.label"><i :style="{ background: b.color }"></i>{{ b.label }}</span></div>
      </div>
      <div class="grid-2"><div class="card"><div class="card-title">Cohort Return Rate</div><div class="chart-wrap"><canvas ref="c8"></canvas></div></div><div class="card"><div class="card-title">Retention Buckets</div><div class="chart-wrap"><canvas ref="c9"></canvas></div></div></div>
    </template>

    <template v-if="tab === 'players'">
      <div class="grid-2"><div class="card"><div class="card-title">Top Verified</div><div class="chart-wrap"><canvas ref="c10"></canvas></div></div><div class="card"><div class="card-title">Top Anonymous</div><div class="chart-wrap"><canvas ref="c11"></canvas></div></div></div>
      <div class="grid-2">
        <div class="card"><div class="card-title">Verified Leaderboard</div><div class="tbl-wrap"><table><thead><tr><th>Player</th><th>Games</th><th>Since</th></tr></thead><tbody><tr v-for="p in data.topVerified" :key="p.id"><td>{{ p.name }}</td><td>{{ p.games }}</td><td>{{ p.since }}</td></tr></tbody></table></div></div>
        <div class="card"><div class="card-title">Anonymous 10+</div><div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Games</th><th>Since</th></tr></thead><tbody><tr v-for="p in data.topAnon" :key="p.fullId"><td>{{ p.id }}</td><td>{{ p.games }}</td><td>{{ p.since }}</td></tr></tbody></table></div></div>
      </div>
    </template>
  </div>

  <div v-else class="load-screen">
    <div class="spinner"></div>
    <p>{{ loadError || 'Fetching from Supabase…' }}</p>
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
  { id: 'players', label: 'Players' },
]
const tab = ref('overview')
const loaded = ref(false)
const loading = ref(false)
const loadError = ref('')
const data: Ref<any> = ref({})
const charts: Record<string, Chart> = {}

const c1 = ref<HTMLCanvasElement>()
const c2 = ref<HTMLCanvasElement>()
const c3 = ref<HTMLCanvasElement>()
const c4 = ref<HTMLCanvasElement>()
const c5 = ref<HTMLCanvasElement>()
const c6 = ref<HTMLCanvasElement>()
const c7 = ref<HTMLCanvasElement>()
const c8 = ref<HTMLCanvasElement>()
const c9 = ref<HTMLCanvasElement>()
const c10 = ref<HTMLCanvasElement>()
const c11 = ref<HTMLCanvasElement>()

const BLUE = '#0c5bec'
const GREEN = '#03c15f'
const GOLD = '#eda71c'
const PURPLE = '#5e37ba'
const SURFACE = '#221787'
const DARK = '#110e3e'

const co: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#878787', font: { family: "'GothamPro', sans-serif", size: 11 }, boxWidth: 10, padding: 10 } },
    tooltip: { backgroundColor: DARK, titleColor: '#fff', bodyColor: '#878787', borderColor: SURFACE, borderWidth: 1, cornerRadius: 6, padding: 8, bodyFont: { size: 12 }, titleFont: { size: 12, weight: 'bold' as const } },
  },
  scales: {
    x: { grid: { color: 'rgba(34,23,135,.3)' }, ticks: { color: '#878787', font: { size: 9 }, maxRotation: 50 } },
    y: { grid: { color: 'rgba(34,23,135,.3)' }, ticks: { color: '#878787', font: { size: 10 } }, beginAtZero: true },
  },
}

function fmt(d: string) { return d.slice(5) }
function last(a: any[]) { return a[a.length - 1] }
function avg(a: number[]) { return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0 }

const kpi = computed(() => {
  if (!data.value.dailyGames) return {} as any
  const dg = data.value.dailyGames
  const da = data.value.dailyActive
  const ds = data.value.dailySignups
  const cr = data.value.cohortRetention
  const t = last(dg), y = dg[dg.length - 2] || t
  const tA = last(da), tS = last(ds), tC = last(cr)
  const l7 = dg.slice(-7)
  return {
    gamesToday: t.anon + t.ver,
    gamesDelta: (t.anon + t.ver) - (y.anon + y.ver),
    completedToday: t.anonComp + t.verComp,
    completionToday: (t.anon + t.ver) ? Math.round((t.anonComp + t.verComp) / (t.anon + t.ver) * 100) : 0,
    activeToday: tA.anon + tA.ver, activeAnonToday: tA.anon, activeVerToday: tA.ver,
    signupsToday: tS.anon + tS.ver, signupsAnonToday: tS.anon, signupsVerToday: tS.ver,
    cohortToday: tC ? tC.anon + tC.ver : 0,
    avg7Games: avg(l7.map((d: any) => d.anon + d.ver)),
    avg7Anon: avg(l7.map((d: any) => d.anon)),
    avg7Ver: avg(l7.map((d: any) => d.ver)),
  }
})

const eng = computed(() => {
  if (!data.value.dailyGames) return {} as any
  const dg = data.value.dailyGames, da = data.value.dailyActive
  const totalGames = dg.reduce((s: number, d: any) => s + d.anon + d.ver, 0)
  const totalCompleted = dg.reduce((s: number, d: any) => s + d.anonComp + d.verComp, 0)
  const totalAnon = dg.reduce((s: number, d: any) => s + d.anon, 0)
  const l7g = dg.slice(-7), l7a = da.slice(-7)
  const aG = l7g.reduce((s: number, d: any) => s + d.anon, 0) / 7
  const aP = l7a.reduce((s: number, d: any) => s + d.anon, 0) / 7
  const vG = l7g.reduce((s: number, d: any) => s + d.ver, 0) / 7
  const vP = l7a.reduce((s: number, d: any) => s + d.ver, 0) / 7
  const aR = aP > 0 ? aG / aP : 0, vR = vP > 0 ? vG / vP : 0, cR = (aP + vP) > 0 ? (aG + vG) / (aP + vP) : 0
  const mx = Math.max(aR, vR, cR, 1)
  return {
    totalGames, totalCompleted,
    overallCompletion: totalGames ? Math.round(totalCompleted / totalGames * 100) : 0,
    anonShare: totalGames ? Math.round(totalAnon / totalGames * 100) : 0,
    sparklines: [
      { label: 'Anonymous', val: aR.toFixed(1), pct: aR / mx * 100, color: BLUE },
      { label: 'Verified', val: vR.toFixed(1), pct: vR / mx * 100, color: GREEN },
      { label: 'Combined', val: cR.toFixed(1), pct: cR / mx * 100, color: PURPLE },
    ],
  }
})

const ret = computed(() => {
  if (!data.value.retentionBuckets) return {} as any
  const b = data.value.retentionBuckets
  const total = b.zero + b.one + b.two5 + b.six20 + b.twenty
  return {
    buckets: b, cohortSize: total,
    cohortPct: total ? Math.round((kpi.value.cohortToday || 0) / total * 100) : 0,
    funnelViz: [
      { label: 'Zero (bots)', count: b.zero, pct: b.zero / total * 100, color: '#454545' },
      { label: 'One & done', count: b.one, pct: b.one / total * 100, color: '#ff6b6b' },
      { label: '2–5', count: b.two5, pct: b.two5 / total * 100, color: GOLD },
      { label: '6–20', count: b.six20, pct: b.six20 / total * 100, color: BLUE },
      { label: '20+', count: b.twenty, pct: b.twenty / total * 100, color: GREEN },
    ],
  }
})

function kill() { Object.values(charts).forEach(c => c?.destroy()); Object.keys(charts).forEach(k => delete charts[k]) }

function mk(el: HTMLCanvasElement | undefined, key: string, cfg: any) { if (el) charts[key] = new Chart(el, cfg) }

function buildOverview() {
  const dg = data.value.dailyGames, da = data.value.dailyActive, ds = data.value.dailySignups
  const labels = dg.map((d: any) => fmt(d.day))
  mk(c1.value, 'c1', { type: 'bar', data: { labels, datasets: [
    { label: 'Anon', data: dg.map((d: any) => d.anon), backgroundColor: BLUE + '99', borderRadius: 2, barPercentage: .7 },
    { label: 'Verified', data: dg.map((d: any) => d.ver), backgroundColor: GREEN + '99', borderRadius: 2, barPercentage: .7 },
  ] }, options: { ...co, scales: { x: { ...co.scales.x, stacked: true }, y: { ...co.scales.y, stacked: true } } } })
  mk(c2.value, 'c2', { type: 'line', data: { labels, datasets: [
    { label: 'Anon', data: da.map((d: any) => d.anon), borderColor: BLUE, backgroundColor: BLUE + '15', fill: true, tension: .3, pointRadius: 1, borderWidth: 2 },
    { label: 'Verified', data: da.map((d: any) => d.ver), borderColor: GREEN, backgroundColor: GREEN + '15', fill: true, tension: .3, pointRadius: 1, borderWidth: 2 },
  ] }, options: co })
  mk(c3.value, 'c3', { type: 'line', data: { labels, datasets: [
    { label: 'Anon %', data: dg.map((d: any) => d.anon ? Math.round(d.anonComp / d.anon * 100) : null), borderColor: BLUE, tension: .3, pointRadius: 1, borderWidth: 2, spanGaps: true },
    { label: 'Verified %', data: dg.map((d: any) => d.ver ? Math.round(d.verComp / d.ver * 100) : null), borderColor: GREEN, tension: .3, pointRadius: 1, borderWidth: 2, spanGaps: true },
  ] }, options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, min: 50, max: 100, ticks: { ...co.scales.y.ticks, callback: (v: number) => v + '%' } } } } })
  mk(c4.value, 'c4', { type: 'bar', data: { labels: ds.map((d: any) => fmt(d.day)), datasets: [
    { label: 'Anon', data: ds.map((d: any) => d.anon), backgroundColor: BLUE + '80', borderRadius: 2 },
    { label: 'Verified', data: ds.map((d: any) => d.ver), backgroundColor: GREEN + '80', borderRadius: 2 },
  ] }, options: { ...co, scales: { x: { ...co.scales.x, stacked: true }, y: { ...co.scales.y, stacked: true } } } })
}

function buildEngagement() {
  const dg = data.value.dailyGames, labels = dg.map((d: any) => fmt(d.day))
  mk(c5.value, 'c5', { type: 'line', data: { labels, datasets: [
    { label: 'Anon', data: dg.map((d: any) => d.anon), borderColor: BLUE, backgroundColor: BLUE + '20', fill: true, tension: .3, pointRadius: 0, borderWidth: 2 },
    { label: 'Verified', data: dg.map((d: any) => d.ver), borderColor: GREEN, backgroundColor: GREEN + '20', fill: true, tension: .3, pointRadius: 0, borderWidth: 2 },
  ] }, options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, stacked: true } } } })
  mk(c6.value, 'c6', { type: 'bar', data: { labels, datasets: [
    { label: 'Done', data: dg.map((d: any) => d.anonComp), backgroundColor: GREEN + '80', borderRadius: 2 },
    { label: 'Incomplete', data: dg.map((d: any) => d.anon - d.anonComp), backgroundColor: '#ff6b6b66', borderRadius: 2 },
  ] }, options: { ...co, scales: { x: { ...co.scales.x, stacked: true }, y: { ...co.scales.y, stacked: true } } } })
  mk(c7.value, 'c7', { type: 'bar', data: { labels, datasets: [
    { label: 'Done', data: dg.map((d: any) => d.verComp), backgroundColor: GREEN + '80', borderRadius: 2 },
    { label: 'Incomplete', data: dg.map((d: any) => d.ver - d.verComp), backgroundColor: '#ff6b6b66', borderRadius: 2 },
  ] }, options: { ...co, scales: { x: { ...co.scales.x, stacked: true }, y: { ...co.scales.y, stacked: true } } } })
}

function buildRetention() {
  const cr = data.value.cohortRetention, b = data.value.retentionBuckets
  mk(c8.value, 'c8', { type: 'line', data: { labels: cr.map((d: any) => fmt(d.day)), datasets: [
    { label: 'Anon', data: cr.map((d: any) => d.anon), borderColor: BLUE, backgroundColor: BLUE + '15', fill: true, tension: .3, pointRadius: 1.5, borderWidth: 2 },
    { label: 'Verified', data: cr.map((d: any) => d.ver), borderColor: GREEN, backgroundColor: GREEN + '15', fill: true, tension: .3, pointRadius: 1.5, borderWidth: 2 },
    { label: 'Total', data: cr.map((d: any) => d.anon + d.ver), borderColor: PURPLE, borderDash: [4, 4], tension: .3, pointRadius: 0, borderWidth: 1.5 },
  ] }, options: co })
  mk(c9.value, 'c9', { type: 'doughnut', data: {
    labels: ['Zero', 'One & done', '2–5', '6–20', '20+'],
    datasets: [{ data: [b.zero, b.one, b.two5, b.six20, b.twenty], backgroundColor: ['#454545', '#ff6b6b', GOLD, BLUE, GREEN], borderWidth: 0, hoverOffset: 6 }],
  }, options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right' as const, labels: { color: '#878787', font: { size: 11 }, padding: 10, boxWidth: 10 } }, tooltip: co.plugins.tooltip } } })
}

function buildPlayers() {
  const tv = data.value.topVerified.slice(0, 10)
  const ta = data.value.topAnon.slice(0, 10)

  const tvData = tv.map((p: any) => Number(p.games))
  const taData = ta.map((p: any) => Number(p.games))

  mk(c10.value, 'c10', {
    type: 'bar',
    data: {
      labels: tv.map((p: any) => p.name),
      datasets: [{ data: tvData, backgroundColor: GREEN + '88', borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
      plugins: { legend: { display: false }, tooltip: co.plugins.tooltip },
      scales: {
        x: { grid: { color: 'rgba(34,23,135,.3)' }, ticks: { color: '#878787' }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { color: '#fff', font: { size: 11 } } }
      }
    }
  })

  mk(c11.value, 'c11', {
    type: 'bar',
    data: {
      labels: ta.map((p: any) => p.id),
      datasets: [{ data: taData, backgroundColor: BLUE + '88', borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
      plugins: { legend: { display: false }, tooltip: co.plugins.tooltip },
      scales: {
        x: { grid: { color: 'rgba(34,23,135,.3)' }, ticks: { color: '#878787' }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { color: '#fff', font: { size: 11 } } }
      }
    }
  })
}

function renderTab() {
  kill()
  nextTick(() => {
    if (tab.value === 'overview') buildOverview()
    else if (tab.value === 'engagement') buildEngagement()
    else if (tab.value === 'retention') buildRetention()
    else if (tab.value === 'players') buildPlayers()
  })
}

async function refresh() {
  loading.value = true; loadError.value = ''
  try {
    data.value = await fetchDashboardData()
    loaded.value = true
    nextTick(renderTab)
  } catch (e: any) {
    loadError.value = e.message || 'Failed to fetch'
    console.error(e)
  } finally { loading.value = false }
}

watch(tab, renderTab)
onMounted(refresh)
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
html { font-family: 'DM Sans', sans-serif; background: #1b1665; color: #fff; -webkit-font-smoothing: antialiased }
body { min-height: 100vh }

.load-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 14px; color: #878787 }
.spinner { width: 28px; height: 28px; border: 3px solid #221787; border-top-color: #0c5bec; border-radius: 50%; animation: spin .7s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

.dashboard { max-width: 1400px; margin: 0 auto; padding: 24px 16px 60px }

.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(34,23,135,.5) }
.title-group { display: flex; align-items: center; gap: 12px }
.hunch-letters { display: flex; gap: 3px }
.h-letter { width: 28px; height: 28px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; background: #221787; color: #fff; border: 1px solid rgba(255,255,255,.08) }
.sub { color: #878787; font-size: 13px }
.refresh-btn { background: #221787; border: 1px solid rgba(255,255,255,.08); color: #878787; font-family: inherit; font-size: 13px; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all .2s }
.refresh-btn:hover { color: #fff; border-color: #0c5bec }
.refresh-btn:disabled { opacity: .4; cursor: default }

.tab-bar { display: flex; gap: 2px; margin-bottom: 20px; background: #110e3e; border-radius: 8px; padding: 3px; overflow-x: auto }
.tab-bar button { background: none; border: none; color: #878787; font-family: inherit; font-size: 13px; font-weight: 500; padding: 7px 16px; border-radius: 6px; cursor: pointer; transition: all .15s; white-space: nowrap }
.tab-bar button:hover { color: #fff }
.tab-bar button.active { background: #221787; color: #fff }

.kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px }
.kpi { background: #110e3e; border: 1px solid rgba(34,23,135,.5); border-radius: 10px; padding: 14px 16px }
.kpi .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .7px; color: #878787; margin-bottom: 6px }
.kpi .value { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 600; line-height: 1 }
.kpi .value.blue { color: #0c5bec } .kpi .value.green { color: #03c15f } .kpi .value.gold { color: #eda71c } .kpi .value.purple { color: #5e37ba }
.kpi .delta { font-size: 11px; font-weight: 500; margin-top: 4px }
.kpi .delta.up { color: #03c15f } .kpi .delta.down { color: #ff6b6b }
.kpi .mini { font-size: 10px; color: #878787; margin-top: 3px }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px }
.card { background: #110e3e; border: 1px solid rgba(34,23,135,.5); border-radius: 10px; padding: 16px; overflow: hidden }
.card.mb { margin-bottom: 12px }
.card-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #878787; margin-bottom: 12px }
.chart-wrap { position: relative; height: 280px }

.tbl-wrap { overflow-x: auto }
table { width: 100%; border-collapse: collapse; font-size: 12px }
thead th { text-align: left; color: #878787; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; padding: 6px 10px; border-bottom: 1px solid rgba(34,23,135,.5) }
tbody td { padding: 6px 10px; border-bottom: 1px solid rgba(34,23,135,.3); color: #878787; font-family: 'JetBrains Mono', monospace; font-size: 11px }
tbody tr:hover td { background: #221787; color: #fff }
tbody td:first-child { color: #fff }

.funnel-bar { display: flex; height: 26px; border-radius: 5px; overflow: hidden; margin-bottom: 6px }
.funnel-bar div { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; color: #fff }
.funnel-legend { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px }
.funnel-legend span { font-size: 10px; display: flex; align-items: center; gap: 4px; color: #878787 }
.funnel-legend i { width: 8px; height: 8px; border-radius: 2px; display: inline-block }

.spark-row { display: flex; align-items: center; gap: 10px; padding: 5px 0 }
.spark-label { font-size: 11px; color: #878787; width: 80px; flex-shrink: 0 }
.spark-val { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; width: 36px; text-align: right }
.spark-track { flex: 1; height: 7px; background: #221787; border-radius: 4px; overflow: hidden }
.spark-fill { height: 100%; border-radius: 4px; transition: width .4s ease }

@media (max-width: 900px) {
  .dashboard { padding: 16px 10px 48px }
  .kpi-row { grid-template-columns: repeat(3, 1fr); gap: 8px }
  .grid-2 { grid-template-columns: 1fr }
  .chart-wrap { height: 220px }
  .kpi .value { font-size: 22px }
  .tab-bar button { padding: 7px 12px; font-size: 12px }
}

@media (max-width: 500px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); gap: 6px }
  .kpi { padding: 10px 12px }
  .kpi .value { font-size: 20px }
  .kpi .label { font-size: 9px }
  .chart-wrap { height: 200px }
  .h-letter { width: 24px; height: 24px; font-size: 14px }
  .header { margin-bottom: 14px; padding-bottom: 10px }
  .card { padding: 12px }
  .card-title { font-size: 10px; margin-bottom: 8px }
}
</style>
