<script setup>
import { ref } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
import LineItem from './LineItem.vue'

defineEmits(['add'])

const store = useFinanceStore()
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

// Inline add
const label  = ref('')
const amount = ref('')

function add() {
  if (!label.value.trim() || !amount.value) return
  store.addIncome(label.value.trim(), amount.value)
  label.value  = ''
  amount.value = ''
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Entradas</h2>
        <p class="panel-sub">Receitas e proventos do mês</p>
      </div>
      <span class="panel-total mono green">
        {{ store.privacyMode ? '••••' : fmt(store.totalIncome) }}
      </span>
    </div>

    <!-- List -->
    <div class="panel-list" v-if="store.monthIncomes.length">
      <TransitionGroup name="slide">
        <LineItem
          v-for="item in store.monthIncomes" :key="item.id"
          :item="item" label-key="label" value-key="amount"
          @delete="store.removeIncome(item.id)"
          @edit="p => store.updateIncome(item.id, { label: p.label, amount: p.amount })"
        />
      </TransitionGroup>
    </div>
    <div v-else class="empty">Nenhuma entrada registrada.</div>

    <!-- Inline form -->
    <div class="add-row">
      <input class="field" v-model="label" placeholder="Ex: Salário, Freelance…" @keyup.enter="add">
      <input class="field mono w-amount" v-model="amount" type="number" step="0.01" placeholder="R$ 0,00" @keyup.enter="add">
      <button class="btn-add" @click="add">+</button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 20px 16px; border-bottom: 1px solid var(--border);
}
.panel-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.panel-sub   { font-size: .72rem; color: var(--ink3); margin-top: 2px; }
.panel-total { font-size: 1.05rem; }
.green { color: var(--green); }

.panel-list { padding: 0 20px; max-height: 380px; overflow-y: auto; }
.empty { padding: 40px 20px; text-align: center; color: var(--ink3); font-size: .85rem; }

.add-row {
  display: flex; gap: 8px; padding: 14px 20px;
  border-top: 1px solid var(--border); background: var(--surface2);
}
.w-amount { width: 110px; flex-shrink: 0; }
</style>
