<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'

const store = useFinanceStore()

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const pv  = v => store.privacyMode ? '••••' : fmt(v)

const balanceColor = computed(() => store.balance >= 0 ? 'var(--green)' : 'var(--red)')
</script>

<template>
  <div class="summary">
    <!-- Main balance -->
    <div class="balance-card">
      <div class="balance-label">Saldo previsto</div>
      <div class="balance-value mono" :style="{ color: balanceColor }">
        {{ pv(store.balance) }}
      </div>
      <div class="balance-formula">
        Entradas + A Receber − Fixos − Cartões
      </div>
    </div>

    <!-- Stats row -->
    <div class="stats-row">

      <!-- Entradas -->
      <div class="stat">
        <div class="stat-label">Entradas</div>
        <div class="stat-value green mono">{{ pv(store.totalIncome) }}</div>
      </div>

      <div class="stat-divider"></div>

      <!-- Fixos -->
      <div class="stat">
        <div class="stat-label">
          Fixos
          <span v-if="store.monthFixed.length" class="paid-pill"
            :class="store.fixedAllPaid ? 'pill-green' : 'pill-gray'">
            {{ store.fixedPaidCount }}/{{ store.monthFixed.length }}
            {{ store.fixedAllPaid ? '✓' : '' }}
          </span>
        </div>
        <div class="stat-value red mono">{{ pv(store.totalFixed) }}</div>
      </div>

      <div class="stat-divider"></div>

      <!-- Cartões -->
      <div class="stat stat-cards">
        <div class="stat-label">Cartões</div>
        <div class="stat-value ink2 mono">{{ pv(store.totalCards) }}</div>
        <!-- one pill per card that has a value this month -->
        <div class="card-pills" v-if="store.cardTotals.length">
          <span
            v-for="c in store.cardTotals" :key="c.id"
            class="paid-pill"
            :class="c.isPaid ? 'pill-green' : 'pill-amber'"
            :title="c.name"
          >
            {{ c.name.length > 8 ? c.name.slice(0, 7) + '…' : c.name }}
            {{ c.isPaid ? '✓' : '○' }}
          </span>
        </div>
      </div>

      <div class="stat-divider"></div>

      <!-- A Receber -->
      <div class="stat">
        <div class="stat-label">A Receber</div>
        <div class="stat-value amber mono">{{ pv(store.totalDebtors) }}</div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.summary {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 16px;
  overflow: hidden;
}

.balance-card {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border);
}
.balance-label {
  font-size: .72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: .07em;
  color: var(--ink3); margin-bottom: 6px;
}
.balance-value {
  font-size: 2.2rem; font-weight: 500;
  line-height: 1; letter-spacing: -.02em;
  transition: color .3s;
}
.balance-formula {
  font-size: .72rem; color: var(--ink3); margin-top: 6px;
}

.stats-row {
  display: flex; align-items: stretch;
}
.stat {
  flex: 1; padding: 14px 18px;
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0;
}
.stat-cards { flex: 1.4; }
.stat-divider {
  width: 1px; background: var(--border); flex-shrink: 0;
}
.stat-label {
  font-size: .68rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--ink3);
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
}
.stat-value { font-size: .92rem; font-weight: 500; }
.green { color: var(--green); }
.red   { color: var(--red);   }
.amber { color: var(--amber); }
.ink2  { color: var(--ink2);  }

/* pills */
.paid-pill {
  display: inline-flex; align-items: center;
  padding: 1px 6px; border-radius: 99px;
  font-size: .6rem; font-weight: 700; letter-spacing: .02em;
  border: 1px solid; line-height: 1.6;
}
.pill-green { color: var(--green); border-color: #6ee7b7; background: var(--green-lt); }
.pill-gray  { color: var(--ink3);  border-color: var(--border2); background: var(--surface2); }
.pill-amber { color: var(--amber); border-color: #fcd34d; background: var(--amber-lt); }

.card-pills {
  display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;
}

@media (max-width: 600px) {
  .stats-row { flex-wrap: wrap; }
  .stat { min-width: 45%; padding: 10px 14px; }
  .stat-divider { display: none; }
  .balance-value { font-size: 1.7rem; }
}
</style>