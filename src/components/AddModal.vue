<script setup>
import { ref, watch, computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'

const props = defineProps({ preset: { type: String, default: null } })
const emit  = defineEmits(['close'])

const store = useFinanceStore()

const TYPES = [
  { id: 'income',  label: 'Entrada',   icon: '↑', cls: 'green' },
  { id: 'fixed',   label: 'Fixo',      icon: '📌', cls: 'red' },
  { id: 'debtor',  label: 'A Receber', icon: '↗', cls: 'amber' },
  { id: 'credit',  label: 'Cartão',    icon: '▣', cls: 'blue' },
]

const type    = ref(props.preset || 'income')
const label   = ref('')
const amount  = ref('')
const date    = ref(new Date().toISOString().split('T')[0])
const cardId  = ref(store.cards[0]?.id || null)
const owner   = ref('Eu')
const ownerName = ref('')
const inst    = ref('')
const dueDate = ref('')
const debtorName = ref('')

watch(() => props.preset, v => { if (v) type.value = v }, { immediate: true })

function submit() {
  const val = parseFloat(amount.value)
  if (!val) return

  if (type.value === 'income') {
    if (!label.value.trim()) return
    store.addIncome(label.value.trim(), val)
  } else if (type.value === 'fixed') {
    if (!label.value.trim()) return
    store.addFixed(label.value.trim(), val)
  } else if (type.value === 'debtor') {
    if (!debtorName.value.trim()) return
    store.addDebtor({ name: debtorName.value.trim(), description: label.value, amount: val, dueDate: dueDate.value })
  } else if (type.value === 'credit') {
    if (!label.value.trim() || !cardId.value) return
    store.addTransaction({
      cardId: cardId.value, description: label.value.trim(), amount: val, date: date.value,
      installments: inst.value, owner: owner.value, ownerName: owner.value === 'Outro' ? ownerName.value : ''
    })
  }
  emit('close')
}

function onOverlay(e) { if (e.target === e.currentTarget) emit('close') }
</script>

<template>
  <div class="overlay" @click="onOverlay">
    <div class="modal">
      <button class="close-btn" @click="$emit('close')">×</button>
      <div class="modal-title">Adicionar</div>

      <!-- Type selector -->
      <div class="type-row">
        <button v-for="t in TYPES" :key="t.id"
          class="type-btn" :class="[`type-${t.cls}`, { active: type === t.id }]"
          @click="type = t.id">
          <span>{{ t.icon }}</span> {{ t.label }}
        </button>
      </div>

      <!-- Fields -->
      <div class="fields">
        <!-- Debtor name (only for debtor) -->
        <div v-if="type === 'debtor'" class="field-group">
          <label>Nome da pessoa</label>
          <input class="field" v-model="debtorName" placeholder="Ex: João Silva">
        </div>

        <!-- Label -->
        <div class="field-group">
          <label>{{ type === 'debtor' ? 'Descrição (opcional)' : 'Descrição' }}</label>
          <input class="field" v-model="label"
            :placeholder="type === 'income' ? 'Ex: Salário, Freelance…' : type === 'fixed' ? 'Ex: Aluguel, Internet…' : type === 'credit' ? 'Ex: Mercado, Netflix…' : 'Contexto…'"
            @keyup.enter="submit">
        </div>

        <!-- Amount + Date -->
        <div class="field-row">
          <div class="field-group">
            <label>Valor (R$)</label>
            <input class="field mono" v-model="amount" type="number" step="0.01" placeholder="0,00" @keyup.enter="submit">
          </div>
          <div class="field-group" v-if="type === 'credit'">
            <label>Data</label>
            <input class="field" v-model="date" type="date">
          </div>
          <div class="field-group" v-if="type === 'debtor'">
            <label>Prazo esperado</label>
            <input class="field" v-model="dueDate" type="date">
          </div>
        </div>

        <!-- Credit extras -->
        <template v-if="type === 'credit'">
          <div class="field-row">
            <div class="field-group">
              <label>Cartão</label>
              <select class="field" v-model="cardId">
                <option :value="null" disabled>Selecione…</option>
                <option v-for="c in store.cards" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="field-group">
              <label>Parcelas</label>
              <input class="field" v-model="inst" placeholder="Ex: 1/6">
            </div>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label>Quem usou?</label>
              <select class="field" v-model="owner">
                <option value="Eu">Fui eu</option>
                <option value="Outro">Outra pessoa</option>
              </select>
            </div>
            <div class="field-group" v-if="owner === 'Outro'">
              <label>Nome</label>
              <input class="field" v-model="ownerName" placeholder="Ex: João">
            </div>
          </div>
        </template>
      </div>

      <button class="btn btn-primary submit-btn" @click="submit">Confirmar</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(15,22,36,.35); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 440px; padding: 28px;
  position: relative; box-shadow: var(--shadow-lg);
  animation: pop .2s cubic-bezier(.34,1.56,.64,1);
}
@keyframes pop { from { opacity: 0; transform: scale(.96) translateY(8px); } }

.close-btn {
  position: absolute; top: 14px; right: 14px;
  background: none; border: none; font-size: 1.4rem; color: var(--ink3);
  width: 30px; height: 30px; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.close-btn:hover { background: var(--red-lt); color: var(--red); }

.modal-title { font-size: 1rem; font-weight: 700; margin-bottom: 18px; }

.type-row { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
.type-btn {
  flex: 1; min-width: 80px; height: 36px; border: 1.5px solid var(--border);
  border-radius: 8px; background: var(--surface2); color: var(--ink3);
  font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}
.type-btn:hover { border-color: var(--border2); color: var(--ink); }
.type-btn.active.type-green { background: var(--green-lt); border-color: #6ee7b7; color: var(--green); }
.type-btn.active.type-red   { background: var(--red-lt);   border-color: #fca5a5; color: var(--red); }
.type-btn.active.type-amber { background: var(--amber-lt); border-color: #fcd34d; color: var(--amber); }
.type-btn.active.type-blue  { background: var(--accent-lt); border-color: #93c5fd; color: var(--accent); }

.fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.field-row { display: flex; gap: 10px; }
.field-row .field-group { flex: 1; }
.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-group label {
  font-size: .68rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: var(--ink3);
}

.submit-btn { width: 100%; height: 42px; justify-content: center; font-size: .88rem; }
</style>