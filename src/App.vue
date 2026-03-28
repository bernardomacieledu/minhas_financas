<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFinanceStore } from './stores/financeStore'

import SummaryBar    from './components/SummaryBar.vue'
import IncomePanel   from './components/IncomePanel.vue'
import FixedPanel    from './components/FixedPanel.vue'
import DebtorPanel   from './components/DebtorPanel.vue'
import CardPanel     from './components/CardPanel.vue'
import ReportPanel   from './components/ReportPanel.vue'
import AddModal      from './components/AddModal.vue'

const store = useFinanceStore()

onMounted(() => {
  store.load()
  applyTheme()
})

// ── Theme ────────────────────────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle('light', !store.darkMode)
}
function toggleTheme() {
  store.toggleDarkMode()
  applyTheme()
}

// ── Tabs ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'income',  label: 'Entradas',  icon: '↑'  },
  { id: 'fixed',   label: 'Fixos',     icon: '📌' },
  { id: 'debtors', label: 'A Receber', icon: '↗'  },
  { id: 'cards',   label: 'Cartões',   icon: '▣'  },
  { id: 'reports', label: 'Relatórios',icon: '📊' },
]
const activeTab = ref('income')

// ── Month navigation with slide direction ─────────────────────────────────
const monthDir = ref(1)   // 1 = forward (left), -1 = backward (right)

function changeMonth(step) {
  monthDir.value = step
  document.documentElement.style.setProperty('--month-dir', step > 0 ? '60px' : '-60px')
  store.changeMonth(step)
}

const monthLabel = computed(() => {
  const [y, m] = store.currentMonth.split('-')
  return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

// ── Modal ─────────────────────────────────────────────────────────────────
const showModal   = ref(false)
const modalPreset = ref(null)
function openAdd(preset = null) { modalPreset.value = preset; showModal.value = true }

// ── File restore ──────────────────────────────────────────────────────────
const fileInput = ref(null)
function handleRestore(e) {
  const file = e.target.files[0]
  if (file) { store.importJSON(file); e.target.value = '' }
}
</script>

<template>
  <div class="page">
    <div class="app-shell">

      <!-- ── Top bar ──────────────────────────────────────────────────── -->
      <header class="topbar">
        <div class="topbar-left">
          <span class="logo">fin<b>vue</b></span>

          <div class="month-nav">
            <button class="month-arrow" @click="changeMonth(-1)">‹</button>
            <Transition name="fade" mode="out-in">
              <span class="month-text" :key="store.currentMonth">{{ monthLabel }}</span>
            </Transition>
            <button class="month-arrow" @click="changeMonth(1)">›</button>
          </div>
        </div>

        <div class="topbar-right">
          <button class="btn-icon theme-btn" @click="toggleTheme"
            :title="store.darkMode ? 'Modo claro' : 'Modo escuro'">
            {{ store.darkMode ? '☀️' : '🌙' }}
          </button>
          <button class="btn-icon" @click="store.togglePrivacy"
            :title="store.privacyMode ? 'Mostrar' : 'Ocultar'">
            {{ store.privacyMode ? '🙈' : '👁' }}
          </button>
          <button class="btn btn-ghost" @click="openAdd()">+ Adicionar</button>
          <button class="btn btn-ghost" @click="store.exportJSON">Exportar</button>
          <button class="btn btn-ghost" @click="fileInput.click()">Restaurar</button>
          <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleRestore">
        </div>
      </header>

      <!-- ── Summary ──────────────────────────────────────────────────── -->
      <SummaryBar />

      <!-- ── Tabs ─────────────────────────────────────────────────────── -->
      <nav class="tab-nav">
        <button
          v-for="tab in TABS" :key="tab.id"
          class="tab-btn" :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- ── Content with month slide animation ───────────────────────── -->
      <main class="content">
        <Transition name="fade" mode="out-in">
          <IncomePanel  v-if="activeTab === 'income'"   key="income"   @add="openAdd('income')"  />
          <FixedPanel   v-else-if="activeTab === 'fixed'"   key="fixed"   @add="openAdd('fixed')"   />
          <DebtorPanel  v-else-if="activeTab === 'debtors'" key="debtors" @add="openAdd('debtor')"  />
          <CardPanel    v-else-if="activeTab === 'cards'"   key="cards"   @add="openAdd('credit')"  />
          <ReportPanel  v-else-if="activeTab === 'reports'" key="reports" />
        </Transition>
      </main>

      <AddModal v-if="showModal" :preset="modalPreset" @close="showModal = false" />
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background: var(--bg);
}
.app-shell {
  width: 100%;
  max-width: 900px;
  padding: 0 20px 60px;
}

/* ── Topbar ───────────────────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 0 18px; gap: 12px; flex-wrap: wrap;
}
.topbar-left, .topbar-right { display: flex; align-items: center; gap: 8px; }

.logo { font-size: 1.2rem; color: var(--ink3); letter-spacing: -.02em; }
.logo b { color: var(--accent); font-weight: 700; }

/* ── Month nav ────────────────────────────────────────────────────────── */
.month-nav { display: flex; align-items: center; gap: 6px; }
.month-arrow {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid var(--border2); background: var(--surface2);
  color: var(--ink2); font-size: 1.15rem; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .18s;
}
.month-arrow:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.month-text {
  font-size: .82rem; font-weight: 600;
  min-width: 148px; text-align: center;
  text-transform: capitalize; color: var(--ink);
  background: var(--surface); border: 1.5px solid var(--border2);
  border-radius: 99px; padding: 6px 16px;
  display: inline-block;
}

/* ── Theme btn ────────────────────────────────────────────────────────── */
.theme-btn { font-size: .9rem; }

/* ── Tabs ─────────────────────────────────────────────────────────────── */
.tab-nav {
  display: flex; gap: 2px;
  background: var(--surface); border: 1.5px solid var(--border2);
  border-radius: var(--radius); padding: 4px; margin-bottom: 20px;
}
.tab-btn {
  flex: 1; height: 36px; border: none; border-radius: var(--radius-sm);
  background: transparent; color: var(--ink3);
  font-size: .78rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  cursor: pointer; transition: all .18s;
}
.tab-btn:hover  { color: var(--ink); background: var(--surface2); }
.tab-btn.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: .88rem; }
@media (max-width: 560px) { .tab-label { display: none; } }

/* ── Content ──────────────────────────────────────────────────────────── */
.content { position: relative; min-height: 300px; }
</style>