<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'

defineEmits(['add'])

const store = useFinanceStore()
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const pv  = v => store.privacyMode ? '••••' : fmt(v)

// Inline add
const name  = ref('')
const desc  = ref('')
const amount = ref('')
const dueDate = ref('')

function add() {
  if (!name.value.trim() || !amount.value) return
  store.addDebtor({
    name: name.value.trim(),
    description: desc.value.trim(),
    amount: amount.value,
    dueDate: dueDate.value,
  })
  name.value = desc.value = amount.value = dueDate.value = ''
}

// Merge manual + card debtors
const allDebtors = computed(() => {
  const manual = store.monthDebtors.map(d => ({
    ...d, _source: 'manual', displayName: d.name, displayDesc: d.description
  }))
  const card = store.cardDebtors.map(t => ({
    id: t.id, amount: t.amount, isPaid: t.isPaid,
    _source: 'card',
    displayName: t.ownerName || t.owner,
    displayDesc: `💳 ${t.description}`,
    dueDate: null,
  }))
  return [...manual, ...card]
})

const pendingTotal  = computed(() => allDebtors.value.filter(d => !d.isPaid).reduce((a, d) => a + d.amount, 0))
const receivedTotal = computed(() => allDebtors.value.filter(d => d.isPaid).reduce((a, d) => a + d.amount, 0))

function togglePaid(item) {
  if (item._source === 'manual') store.toggleDebtorPaid(item.id)
  else store.toggleTxnPaid(item.id)
}
function remove(item) {
  if (item._source === 'manual') store.removeDebtor(item.id)
  else store.removeTransaction(item.id)
}

function dueDateLabel(date) {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d - today) / 86400000)
  if (diff < 0)  return { text: 'Vencido', cls: 'badge-red' }
  if (diff === 0) return { text: 'Hoje', cls: 'badge-amber' }
  if (diff <= 7)  return { text: `em ${diff}d`, cls: 'badge-amber' }
  return { text: d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }), cls: 'badge-blue' }
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">A Receber</h2>
        <p class="panel-sub">Devedores e receitas futuras</p>
      </div>
      <div class="header-nums">
        <div>
          <div class="stat-lbl">Pendente</div>
          <div class="stat-val amber mono">{{ pv(pendingTotal) }}</div>
        </div>
        <div>
          <div class="stat-lbl">Recebido</div>
          <div class="stat-val green mono">{{ pv(receivedTotal) }}</div>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="debtor-list" v-if="allDebtors.length">
      <TransitionGroup name="slide">
        <div v-for="item in allDebtors" :key="item.id" class="debtor-row" :class="{ 'is-done': item.isPaid }">
          <div class="debtor-left">
            <div class="debtor-name">{{ item.displayName }}</div>
            <div class="debtor-desc" v-if="item.displayDesc">{{ item.displayDesc }}</div>
            <div class="debtor-tags">
              <span v-if="item._source === 'card'" class="badge badge-gray">Cartão</span>
              <template v-if="item.dueDate">
                <span class="badge" :class="dueDateLabel(item.dueDate)?.cls">
                  📅 {{ dueDateLabel(item.dueDate)?.text }}
                </span>
              </template>
            </div>
          </div>
          <div class="debtor-right">
            <span class="debtor-value mono" :class="item.isPaid ? 'green' : 'amber'">
              {{ pv(item.amount) }}
            </span>
            <button
              class="badge"
              :class="item.isPaid ? 'badge-green' : 'badge-gray'"
              @click="togglePaid(item)"
            >
              {{ item.isPaid ? '✓ Recebido' : '○ Pendente' }}
            </button>
            <button class="del-btn" @click="remove(item)">×</button>
          </div>
        </div>
      </TransitionGroup>
    </div>
    <div v-else class="empty">Ninguém te deve (por enquanto).</div>

    <!-- Add form -->
    <div class="add-section">
      <div class="add-row">
        <input class="field" v-model="name" placeholder="Nome da pessoa" @keyup.enter="add">
        <input class="field" v-model="desc" placeholder="Descrição (opcional)">
      </div>
      <div class="add-row">
        <input class="field mono" v-model="amount" type="number" step="0.01" placeholder="Valor (R$)" @keyup.enter="add">
        <input class="field" v-model="dueDate" type="date" title="Data prevista do recebimento">
        <button class="btn-add" @click="add">+</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 20px 16px; border-bottom: 1px solid var(--border); gap: 16px;
}
.panel-title { font-size: 1rem; font-weight: 700; }
.panel-sub   { font-size: .72rem; color: var(--ink3); margin-top: 2px; }
.header-nums { display: flex; gap: 20px; text-align: right; flex-shrink: 0; }
.stat-lbl { font-size: .68rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--ink3); margin-bottom: 2px; }
.stat-val { font-size: .9rem; }
.green { color: var(--green); }
.amber { color: var(--amber); }

.debtor-list { padding: 0 20px; max-height: 420px; overflow-y: auto; }

.debtor-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 0; border-bottom: 1px solid var(--border);
  gap: 12px; transition: opacity .2s;
}
.debtor-row:last-child { border-bottom: none; }
.debtor-row.is-done .debtor-name { text-decoration: line-through; opacity: .6; }
.debtor-row.is-done .debtor-value { color: var(--green) !important; }

.debtor-left { flex: 1; min-width: 0; }
.debtor-name { font-size: .875rem; font-weight: 600; color: var(--ink); }
.debtor-desc { font-size: .75rem; color: var(--ink3); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.debtor-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }

.debtor-right {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.debtor-value { font-size: .9rem; font-weight: 500; }
.badge { cursor: pointer; }

.del-btn {
  background: none; border: none; color: var(--ink3); font-size: 1rem;
  padding: 2px 4px; border-radius: 4px; cursor: pointer; transition: all .15s;
  line-height: 1;
}
.del-btn:hover { color: var(--red); background: var(--red-lt); }

.empty { padding: 40px 20px; text-align: center; color: var(--ink3); font-size: .85rem; }

.add-section {
  padding: 14px 20px; border-top: 1px solid var(--border);
  background: var(--surface2); display: flex; flex-direction: column; gap: 8px;
}
.add-row { display: flex; gap: 8px; }
</style>