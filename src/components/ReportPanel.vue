<script setup>
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { useFinanceStore } from '../stores/financeStore'

const store = useFinanceStore()
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

// ── Chart.js dynamic import ───────────────────────────────────────────
let Chart = null
const chartsReady = ref(false)

onMounted(async () => {
  const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.3/auto/+esm')
  Chart = mod.default
  chartsReady.value = true
  await nextTick()
  renderAll()
})

// ── Canvas refs ───────────────────────────────────────────────────────
const canvasOverview  = ref(null)
const canvasBalance   = ref(null)
const canvasCards     = ref(null)
const canvasFixed     = ref(null)
const canvasReceive   = ref(null)

let chartInstances = {}

function destroyAll() {
  Object.values(chartInstances).forEach(c => c?.destroy())
  chartInstances = {}
}

// ── Color palette ─────────────────────────────────────────────────────
const COLORS = ['#4f80ff','#34d399','#f87171','#fbbf24','#a78bfa','#fb923c','#38bdf8','#f472b6']

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function themeColors() {
  const isDark = store.darkMode
  return {
    grid:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    label:  isDark ? '#8b91a8' : '#9aa5b8',
    surface: isDark ? '#181c27' : '#ffffff',
    ink:    isDark ? '#e8eaf2' : '#0f1624',
  }
}

function baseOptions(tc) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: tc.label, font: { family: 'Sora', size: 11 }, boxWidth: 12, padding: 16 }
      },
      tooltip: {
        backgroundColor: tc.surface,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: tc.ink,
        bodyColor: tc.label,
        callbacks: {
          label: ctx => ` ${fmt(ctx.parsed.y ?? ctx.parsed)}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: tc.label, font: { family: 'Sora', size: 10 } },
        grid:  { color: tc.grid }
      },
      y: {
        ticks: {
          color: tc.label, font: { family: 'Sora', size: 10 },
          callback: v => {
            if (Math.abs(v) >= 1000) return (v/1000).toFixed(1) + 'k'
            return v
          }
        },
        grid: { color: tc.grid }
      }
    }
  }
}

// ── Render all charts ─────────────────────────────────────────────────
function renderAll() {
  if (!Chart || !chartsReady.value) return
  destroyAll()
  const data = store.reportData
  if (!data.length) return

  const tc     = themeColors()
  const labels = data.map(d => {
    const [y, m] = d.month.split('-')
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  })

  // 1. Entradas vs Gastos (grouped bars) + saldo (line)
  if (canvasOverview.value) {
    chartInstances.overview = new Chart(canvasOverview.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Entradas',
            data: data.map(d => d.income + d.debtors),
            backgroundColor: 'rgba(52,211,153,0.7)',
            borderColor: '#34d399', borderWidth: 1.5, borderRadius: 4,
          },
          {
            label: 'Gastos',
            data: data.map(d => d.fixed + d.cards),
            backgroundColor: 'rgba(248,113,113,0.7)',
            borderColor: '#f87171', borderWidth: 1.5, borderRadius: 4,
          },
          {
            label: 'Saldo',
            data: data.map(d => d.balance),
            type: 'line',
            borderColor: '#4f80ff', backgroundColor: 'rgba(79,128,255,0.1)',
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#4f80ff',
            tension: 0.35, fill: true, yAxisID: 'y',
          }
        ]
      },
      options: { ...baseOptions(tc), plugins: { ...baseOptions(tc).plugins, legend: { ...baseOptions(tc).plugins.legend, position: 'top' } } }
    })
  }

  // 2. Saldo acumulado (line)
  if (canvasBalance.value) {
    let acc = 0
    const accData = data.map(d => { acc += d.balance; return acc })
    chartInstances.balance = new Chart(canvasBalance.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Saldo Acumulado',
          data: accData,
          borderColor: '#4f80ff', backgroundColor: 'rgba(79,128,255,0.12)',
          borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#4f80ff',
          tension: 0.35, fill: true,
        }]
      },
      options: baseOptions(tc)
    })
  }

  // 3. Cartões por mês (stacked bars per card)
  if (canvasCards.value) {
    const allCardNames = [...new Set(store.cards.map(c => c.name))]
    const cardDatasets = allCardNames.map((name, i) => ({
      label: name,
      data: data.map(d => d.cardBreakdown.find(c => c.name === name)?.amount || 0),
      backgroundColor: COLORS[i % COLORS.length] + 'cc',
      borderColor: COLORS[i % COLORS.length],
      borderWidth: 1.5, borderRadius: 4,
      stack: 'cards',
    }))
    chartInstances.cards = new Chart(canvasCards.value, {
      type: 'bar',
      data: { labels, datasets: cardDatasets },
      options: { ...baseOptions(tc), scales: { ...baseOptions(tc).scales, x: { ...baseOptions(tc).scales.x, stacked: true }, y: { ...baseOptions(tc).scales.y, stacked: true } } }
    })
  }

  // 4. Gastos fixos por mês (bar)
  if (canvasFixed.value) {
    chartInstances.fixed = new Chart(canvasFixed.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Fixos',
          data: data.map(d => d.fixed),
          backgroundColor: 'rgba(251,191,36,0.7)',
          borderColor: '#fbbf24', borderWidth: 1.5, borderRadius: 4,
        }]
      },
      options: baseOptions(tc)
    })
  }

  // 5. A receber acumulado (line)
  if (canvasReceive.value) {
    chartInstances.receive = new Chart(canvasReceive.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'A Receber',
          data: data.map(d => d.debtors),
          borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.12)',
          borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#fbbf24',
          tension: 0.35, fill: true,
        }]
      },
      options: baseOptions(tc)
    })
  }
}

// Re-render when theme or data changes
watch(() => [store.darkMode, store.reportData], async () => {
  await nextTick()
  renderAll()
}, { deep: true })

// ── Summary stats ─────────────────────────────────────────────────────
const stats = computed(() => {
  const data = store.reportData
  if (!data.length) return null
  const totalIn  = data.reduce((a, d) => a + d.income + d.debtors, 0)
  const totalOut = data.reduce((a, d) => a + d.fixed + d.cards, 0)
  const bestMonth = [...data].sort((a, b) => b.balance - a.balance)[0]
  const worstMonth = [...data].sort((a, b) => a.balance - b.balance)[0]
  const avgBalance = data.reduce((a, d) => a + d.balance, 0) / data.length
  return { totalIn, totalOut, bestMonth, worstMonth, avgBalance, months: data.length }
})

function shortMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}
</script>

<template>
  <div class="report">

    <!-- No data -->
    <div v-if="!store.reportData.length" class="empty-report">
      <div class="empty-icon">📊</div>
      <p>Nenhum dado registrado ainda.<br>Comece adicionando entradas e gastos.</p>
    </div>

    <template v-else>

      <!-- ── Summary cards ─────────────────────────────────────────── -->
      <div class="stat-grid" v-if="stats">
        <div class="stat-card">
          <div class="sc-label">Total entrou</div>
          <div class="sc-value green mono">{{ fmt(stats.totalIn) }}</div>
          <div class="sc-sub">{{ stats.months }} meses registrados</div>
        </div>
        <div class="stat-card">
          <div class="sc-label">Total saiu</div>
          <div class="sc-value red mono">{{ fmt(stats.totalOut) }}</div>
          <div class="sc-sub">fixos + cartões</div>
        </div>
        <div class="stat-card">
          <div class="sc-label">Média mensal de saldo</div>
          <div class="sc-value mono" :class="stats.avgBalance >= 0 ? 'green' : 'red'">
            {{ fmt(stats.avgBalance) }}
          </div>
          <div class="sc-sub">por mês</div>
        </div>
        <div class="stat-card">
          <div class="sc-label">Melhor mês</div>
          <div class="sc-value green mono">{{ fmt(stats.bestMonth?.balance) }}</div>
          <div class="sc-sub">{{ shortMonth(stats.bestMonth?.month) }}</div>
        </div>
        <div class="stat-card">
          <div class="sc-label">Pior mês</div>
          <div class="sc-value red mono">{{ fmt(stats.worstMonth?.balance) }}</div>
          <div class="sc-sub">{{ shortMonth(stats.worstMonth?.month) }}</div>
        </div>
      </div>

      <!-- ── Charts ────────────────────────────────────────────────── -->
      <div class="charts" v-if="chartsReady">

        <div class="chart-card wide">
          <div class="chart-title">Entradas vs Gastos + Saldo</div>
          <div class="chart-wrap">
            <canvas ref="canvasOverview"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-title">Evolução do Saldo Acumulado</div>
          <div class="chart-wrap">
            <canvas ref="canvasBalance"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-title">Custo por Cartão / Mês</div>
          <div class="chart-wrap">
            <canvas ref="canvasCards"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-title">Gastos Fixos por Mês</div>
          <div class="chart-wrap">
            <canvas ref="canvasFixed"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-title">A Receber por Mês</div>
          <div class="chart-wrap">
            <canvas ref="canvasReceive"></canvas>
          </div>
        </div>

      </div>

      <div v-else class="loading">Carregando gráficos…</div>

    </template>
  </div>
</template>

<style scoped>
.report { display: flex; flex-direction: column; gap: 20px; }

/* ── Summary stats ────────────────────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  background: var(--surface); border: 1.5px solid var(--border2);
  border-radius: var(--radius); padding: 16px 18px;
  box-shadow: var(--shadow);
}
.sc-label { font-size: .67rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ink3); margin-bottom: 6px; }
.sc-value { font-size: 1.05rem; font-weight: 500; margin-bottom: 3px; }
.sc-sub   { font-size: .68rem; color: var(--ink3); }
.green { color: var(--green); }
.red   { color: var(--red);   }

/* ── Charts ───────────────────────────────────────────────────────────── */
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart-card {
  background: var(--surface); border: 1.5px solid var(--border2);
  border-radius: var(--radius); padding: 18px 20px;
  box-shadow: var(--shadow);
}
.chart-card.wide { grid-column: 1 / -1; }
.chart-title {
  font-size: .72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: var(--ink3); margin-bottom: 14px;
}
.chart-wrap { height: 220px; position: relative; }
.chart-card.wide .chart-wrap { height: 280px; }

/* ── Empty / loading ──────────────────────────────────────────────────── */
.empty-report {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; padding: 80px 20px; text-align: center;
  color: var(--ink3); font-size: .9rem; line-height: 1.6;
}
.empty-icon { font-size: 2.5rem; opacity: .3; }
.loading { padding: 40px; text-align: center; color: var(--ink3); font-size: .85rem; }

@media (max-width: 600px) {
  .charts { grid-template-columns: 1fr; }
  .chart-card.wide { grid-column: auto; }
}
</style>