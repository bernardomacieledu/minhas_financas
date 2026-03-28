<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
import LineItem from './LineItem.vue'

defineEmits(['add'])

const store = useFinanceStore()
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const label  = ref('')
const amount = ref('')

function add() {
  if (!label.value.trim() || !amount.value) return
  store.addFixed(label.value.trim(), amount.value)
  label.value  = ''
  amount.value = ''
}

const paidCount = computed(() => store.monthFixed.filter(i => i.isPaid).length)
const total     = computed(() => store.monthFixed.length)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Gastos Fixos</h2>
        <p class="panel-sub">
          {{ paidCount }}/{{ total }} pagos ·
          <span class="mono">{{ store.privacyMode ? '••••' : fmt(store.totalFixed) }}</span>
        </p>
      </div>
      <div class="progress-ring" :style="{ '--pct': total ? paidCount/total : 0 }">
        <svg viewBox="0 0 36 36">
          <circle class="ring-bg" cx="18" cy="18" r="15"/>
          <circle class="ring-fill" cx="18" cy="18" r="15"/>
        </svg>
        <span class="ring-label">{{ total ? Math.round(paidCount/total*100) : 0 }}%</span>
      </div>
    </div>

    <div class="panel-list" v-if="store.monthFixed.length">
      <TransitionGroup name="slide">
        <LineItem
          v-for="item in store.monthFixed" :key="item.id"
          :item="item" label-key="label" value-key="amount"
          :show-paid="true" :paid-label="['Pago', 'Pendente']"
          @delete="store.removeFixed(item.id)"
          @togglePaid="store.toggleFixedPaid(item.id)"
          @edit="p => store.updateFixed(item.id, { label: p.label, amount: p.amount })"
        />
      </TransitionGroup>
    </div>
    <div v-else class="empty">Nenhum gasto fixo registrado.</div>

    <div class="add-row">
      <input class="field" v-model="label" placeholder="Ex: Aluguel, Internet…" @keyup.enter="add">
      <input class="field mono w-amount" v-model="amount" type="number" step="0.01" placeholder="R$ 0,00" @keyup.enter="add">
      <button class="btn-add" @click="add">+</button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 20px 16px; border-bottom: 1px solid var(--border); gap: 12px;
}
.panel-title { font-size: 1rem; font-weight: 700; }
.panel-sub   { font-size: .72rem; color: var(--ink3); margin-top: 2px; }

/* Progress ring */
.progress-ring {
  position: relative; width: 48px; height: 48px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.progress-ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
circle { fill: none; stroke-width: 3; }
.ring-bg   { stroke: var(--border2); }
.ring-fill {
  stroke: var(--green);
  stroke-dasharray: 94.2; /* 2π×15 */
  stroke-dashoffset: calc(94.2 * (1 - var(--pct)));
  stroke-linecap: round;
  transition: stroke-dashoffset .5s ease;
}
.ring-label {
  font-size: .65rem; font-weight: 700; color: var(--ink2); z-index: 1;
}

.panel-list { padding: 0 20px; max-height: 400px; overflow-y: auto; }
.empty { padding: 40px 20px; text-align: center; color: var(--ink3); font-size: .85rem; }

.add-row {
  display: flex; gap: 8px; padding: 14px 20px;
  border-top: 1px solid var(--border); background: var(--surface2);
}
.w-amount { width: 110px; flex-shrink: 0; }
</style>
