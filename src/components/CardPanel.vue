<script setup>
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '../stores/financeStore'

const store = useFinanceStore()
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const pv  = v => store.privacyMode ? '••••' : fmt(v)

// ── Card selection ─────────────────────────────────────────────────────
const selectedId   = ref(store.cards[0]?.id || null)
const selectedCard = computed(() => store.cards.find(c => c.id === selectedId.value))

watch(() => store.cards, cards => {
  if (!selectedId.value && cards.length) selectedId.value = cards[0].id
}, { deep: true })

// ── Edit closing day inline ───────────────────────────────────────────
const editingClosingDay = ref(false)
const closingDayInput   = ref('')

function openClosingEdit() {
  closingDayInput.value = selectedCard.value?.closingDay || ''
  editingClosingDay.value = true
}
function saveClosingDay() {
  const card = store.cards.find(c => c.id === selectedId.value)
  if (!card) return
  const day = parseInt(closingDayInput.value)
  if (day >= 1 && day <= 31) card.closingDay = day
  editingClosingDay.value = false
  persistCards()
}

// ── New card form ──────────────────────────────────────────────────────
const newCardName     = ref('')
const newCardDay      = ref('')
const showNewCardForm = ref(false)

function addCard() {
  if (!newCardName.value.trim()) return
  const id = store.addCard(newCardName.value.trim(), newCardDay.value)
  selectedId.value = id
  newCardName.value = ''
  newCardDay.value  = ''
  showNewCardForm.value = false
}

// ── Invoice data ───────────────────────────────────────────────────────
function getInvoiceData(cardId) {
  const card = store.cards.find(c => c.id === cardId)
  const k = store.currentMonth
  return {
    paid:       card?.invoicePaid?.[k]  || false,
    total:      card?.invoiceTotal?.[k] ?? null,
  }
}

function persistCards() {
  localStorage.setItem('finvue_v10', JSON.stringify({
    currentMonth: store.currentMonth,
    incomes: store.incomes,
    fixed: store.fixed,
    debtors: store.debtors,
    cards: store.cards,
    transactions: store.transactions,
  }))
}

function toggleInvoicePaid() {
  const card = store.cards.find(c => c.id === selectedId.value)
  if (!card) return
  if (!card.invoicePaid) card.invoicePaid = {}
  card.invoicePaid[store.currentMonth] = !card.invoicePaid[store.currentMonth]
  persistCards()
}

// ── Invoice total editing ──────────────────────────────────────────────
const totalInput   = ref('')
const editingTotal = ref(false)

function openEdit() {
  const inv = getInvoiceData(selectedId.value)
  totalInput.value = inv.total !== null ? String(inv.total) : ''
  editingTotal.value = true
  // focus next tick
}

function saveTotal() {
  const card = store.cards.find(c => c.id === selectedId.value)
  if (!card) return
  if (!card.invoiceTotal) card.invoiceTotal = {}
  const val = parseFloat(totalInput.value)
  card.invoiceTotal[store.currentMonth] = isNaN(val) ? null : val
  editingTotal.value = false
  persistCards()
}

function cancelEdit() {
  editingTotal.value = false
  totalInput.value   = ''
}

// Displayed total for selected card
const displayTotal = computed(() => {
  const inv = getInvoiceData(selectedId.value)
  return inv.total !== null ? inv.total : 0
})

// ── Closing date info ──────────────────────────────────────────────────
const closingInfo = computed(() => {
  if (!selectedCard.value) return null
  const day = selectedCard.value.closingDay
  if (!day) return null
  const [y, m] = store.currentMonth.split('-').map(Number)
  const closing = new Date(y, m - 1, day)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((closing - today) / 86400000)
  if (diff < 0)   return { text: `Fecha dia ${day}`, urgent: false }
  if (diff === 0) return { text: 'Fecha hoje!', urgent: true }
  if (diff <= 5)  return { text: `Fecha em ${diff}d`, urgent: true }
  return { text: `Fecha dia ${day}`, urgent: false }
})
</script>

<template>
  <div class="panel">

    <!-- ── Sidebar ────────────────────────────────────────────────────── -->
    <aside class="sidebar">
      <div class="sidebar-head">
        <span class="sidebar-title">Cartões</span>
        <button class="icon-add" @click="showNewCardForm = !showNewCardForm" title="Novo cartão">+</button>
      </div>

      <div class="card-list">
        <button
          v-for="card in store.cards" :key="card.id"
          class="card-btn" :class="{ active: card.id === selectedId }"
          @click="selectedId = card.id; editingTotal = false"
        >
          <div class="card-btn-name">{{ card.name }}</div>
          <div class="card-btn-sub">
            <span>Fecha dia {{ card.closingDay || '?' }}</span>
            <span v-if="getInvoiceData(card.id).paid" class="check">✓</span>
          </div>
        </button>
        <div v-if="!store.cards.length" class="no-cards">Nenhum cartão ainda.</div>
      </div>

      <!-- New card form -->
      <Transition name="slide">
        <div v-if="showNewCardForm" class="new-form">
          <input class="field" v-model="newCardName" placeholder="Nome do cartão"
            @keyup.enter="addCard" @keyup.esc="showNewCardForm = false">
          <input class="field" v-model="newCardDay" type="number" min="1" max="31"
            placeholder="Dia fechamento" @keyup.enter="addCard">
          <div class="new-form-btns">
            <button class="btn btn-primary btn-sm" @click="addCard">Adicionar</button>
            <button class="btn btn-ghost btn-sm" @click="showNewCardForm = false">×</button>
          </div>
        </div>
      </Transition>
    </aside>

    <!-- ── Main ───────────────────────────────────────────────────────── -->
    <div class="main" v-if="selectedCard">

      <!-- Card header info -->
      <div class="card-header">
        <div>
          <div class="card-name">{{ selectedCard.name }}</div>
          <div class="card-meta">
            <span v-if="closingInfo && !editingClosingDay" class="badge"
              :class="closingInfo.urgent ? 'badge-amber' : 'badge-gray'"
              style="cursor:pointer" @click="openClosingEdit" title="Clique para editar">
              {{ closingInfo.text }}
            </span>
            <span v-else-if="!closingInfo && !editingClosingDay"
              class="badge badge-gray" style="cursor:pointer" @click="openClosingEdit">
              Definir fechamento
            </span>
            <span v-if="editingClosingDay" class="closing-edit">
              Dia:
              <input class="field closing-input" v-model="closingDayInput"
                type="number" min="1" max="31"
                @keyup.enter="saveClosingDay" @keyup.esc="editingClosingDay=false">
              <button class="btn btn-primary btn-xs" @click="saveClosingDay">✓</button>
              <button class="btn btn-ghost btn-xs" @click="editingClosingDay=false">×</button>
            </span>
            <span class="meta-month" v-if="!editingClosingDay">{{ store.formattedMonth }}</span>
          </div>
        </div>

        <!-- Paid toggle -->
        <button
          class="badge paid-toggle"
          :class="getInvoiceData(selectedId).paid ? 'badge-green' : 'badge-amber'"
          @click="toggleInvoicePaid"
        >
          {{ getInvoiceData(selectedId).paid ? '✓ Fatura paga' : '○ Em aberto' }}
        </button>
      </div>

      <!-- Total da fatura -->
      <div class="total-block">
        <div class="total-label">Total da fatura</div>

        <!-- Viewing mode -->
        <div v-if="!editingTotal" class="total-view">
          <div class="total-value mono"
            :class="getInvoiceData(selectedId).total === null ? 'total-empty' : ''">
            {{ getInvoiceData(selectedId).total !== null ? pv(displayTotal) : '—' }}
          </div>
          <button class="btn btn-ghost btn-sm" @click="openEdit">
            {{ getInvoiceData(selectedId).total !== null ? '✎ Editar' : '+ Inserir valor' }}
          </button>
        </div>

        <!-- Editing mode -->
        <div v-else class="total-edit">
          <input
            class="field mono total-input"
            v-model="totalInput"
            type="number" step="0.01" placeholder="0,00"
            @keyup.enter="saveTotal"
            @keyup.esc="cancelEdit"
            autofocus
          >
          <button class="btn btn-primary btn-sm" @click="saveTotal">Salvar</button>
          <button class="btn btn-ghost btn-sm" @click="cancelEdit">×</button>
        </div>

        <div class="total-hint">
          Digite o valor total que aparece na fatura do cartão
        </div>
      </div>

      <!-- Remove card -->
      <div class="card-footer">
        <button class="danger-link"
          @click="store.removeCard(selectedId); selectedId = store.cards[0]?.id || null">
          Remover este cartão
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-else>
      <div class="empty-icon">▣</div>
      <p>Selecione ou adicione um cartão</p>
      <button class="btn btn-primary" @click="showNewCardForm = true">+ Novo cartão</button>
    </div>

  </div>
</template>

<style scoped>
.panel {
  display: flex;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  min-height: 260px;
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width: 190px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
}
.sidebar-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px; border-bottom: 1px solid var(--border);
}
.sidebar-title {
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .07em; color: var(--ink3);
}
.icon-add {
  width: 24px; height: 24px; border-radius: 6px;
  background: var(--accent-lt); border: 1px solid rgba(37,99,235,.2);
  color: var(--accent); font-size: 1.1rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s;
}
.icon-add:hover { background: var(--accent); color: #fff; }

.card-list { flex: 1; overflow-y: auto; padding: 8px; }
.card-btn {
  width: 100%; text-align: left; padding: 10px 10px; border-radius: 8px;
  border: 1.5px solid transparent; background: transparent;
  cursor: pointer; transition: all .15s; margin-bottom: 4px;
}
.card-btn:hover { background: var(--surface2); }
.card-btn.active { background: var(--accent-lt); border-color: rgba(37,99,235,.22); }
.card-btn-name { font-size: .84rem; font-weight: 600; color: var(--ink); }
.card-btn.active .card-btn-name { color: var(--accent); }
.card-btn-sub {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 3px; font-size: .67rem; color: var(--ink3);
}
.card-btn.active .card-btn-sub { color: rgba(37,99,235,.6); }
.check { color: var(--green); font-weight: 700; }
.no-cards { padding: 20px 12px; font-size: .75rem; color: var(--ink3); text-align: center; }

.new-form {
  padding: 12px; border-top: 1px solid var(--border);
  background: var(--surface2); display: flex; flex-direction: column; gap: 6px;
}
.new-form .field { height: 34px; font-size: .8rem; }
.new-form-btns { display: flex; gap: 6px; }

/* ── Main ─────────────────────────────────────────────────────────────── */
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
  gap: 12px; flex-wrap: wrap;
}
.card-name { font-size: 1.05rem; font-weight: 700; }
.card-meta {
  display: flex; align-items: center; gap: 8px;
  margin-top: 5px; font-size: .72rem; color: var(--ink3);
}
.meta-month { text-transform: capitalize; }

.paid-toggle { cursor: pointer; font-size: .72rem; padding: 4px 12px; }
.badge { cursor: pointer; }
.btn-sm { height: 32px; padding: 0 14px; font-size: .76rem; }

/* ── Total block ──────────────────────────────────────────────────────── */
.total-block {
  padding: 28px 24px 20px;
  flex: 1;
}
.total-label {
  font-size: .7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: var(--ink3); margin-bottom: 14px;
}
.total-view {
  display: flex; align-items: center; gap: 16px; margin-bottom: 10px;
}
.total-value {
  font-size: 2rem; font-weight: 500; letter-spacing: -.02em; color: var(--ink);
}
.total-empty { color: var(--ink3); }

.total-edit {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.total-input { width: 160px; height: 40px; font-size: 1rem; }

.total-hint {
  font-size: .72rem; color: var(--ink3); margin-top: 8px;
}

/* ── Footer ───────────────────────────────────────────────────────────── */
.card-footer {
  padding: 12px 24px;
  border-top: 1px solid var(--border);
  margin-top: auto;
}
.danger-link {
  background: none; border: none; padding: 0;
  font-size: .72rem; color: var(--red); cursor: pointer;
  text-decoration: underline; text-underline-offset: 2px;
  font-family: inherit; opacity: .7;
}
.danger-link:hover { opacity: 1; }

/* ── Empty state ──────────────────────────────────────────────────────── */
.empty-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 40px;
  color: var(--ink3); font-size: .85rem; text-align: center;
}
.empty-icon { font-size: 2rem; opacity: .18; }

.closing-edit {
  display: flex; align-items: center; gap: 5px; font-size: .72rem; color: var(--ink2);
}
.closing-input { width: 56px; height: 28px; font-size: .78rem; padding: 0 8px; }
.btn-xs { height: 26px; padding: 0 8px; font-size: .72rem; }

/* Slide transition */
.slide-enter-active, .slide-leave-active { transition: all .22s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; }
.slide-enter-to, .slide-leave-from { max-height: 200px; opacity: 1; }

@media (max-width: 560px) {
  .panel { flex-direction: column; }
  .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
  .card-list { max-height: 120px; }
}
</style>