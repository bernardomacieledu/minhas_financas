<script setup>
import { ref } from 'vue'
import { useFinanceStore } from '../stores/financeStore'

const props = defineProps({
  item:      { type: Object, required: true },
  valueKey:  { type: String, default: 'amount' },
  labelKey:  { type: String, default: 'label' },
  showPaid:  { type: Boolean, default: false },
  paidLabel: { type: Array, default: () => ['Pago', 'Pendente'] },
})
const emit = defineEmits(['delete', 'togglePaid', 'edit'])

const store = useFinanceStore()
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const pv  = v => store.privacyMode ? '••••' : fmt(v)

const editing = ref(false)
const editLabel  = ref('')
const editAmount = ref('')

function startEdit() {
  editLabel.value  = props.item[props.labelKey]
  editAmount.value = props.item[props.valueKey]
  editing.value = true
}
function confirmEdit() {
  emit('edit', { label: editLabel.value, amount: parseFloat(editAmount.value) })
  editing.value = false
}
function cancelEdit() { editing.value = false }
</script>

<template>
  <div class="line-item" :class="{ 'is-paid': showPaid && item.isPaid }">
    <!-- View mode -->
    <template v-if="!editing">
      <div class="item-main">
        <span class="item-label">{{ item[labelKey] }}</span>
        <div class="item-right">
          <span class="item-value mono">{{ pv(item[valueKey]) }}</span>
          <button v-if="showPaid" class="badge"
            :class="item.isPaid ? 'badge-green' : 'badge-gray'"
            @click="$emit('togglePaid')">
            {{ item.isPaid ? paidLabel[0] : paidLabel[1] }}
          </button>
          <div class="item-actions">
            <button class="action" @click="startEdit" title="Editar">✎</button>
            <button class="action del" @click="$emit('delete')" title="Excluir">×</button>
          </div>
        </div>
      </div>
      <slot name="sub" />
    </template>

    <!-- Edit mode -->
    <template v-else>
      <div class="edit-row">
        <input class="field edit-label" v-model="editLabel" placeholder="Nome" @keyup.enter="confirmEdit" @keyup.esc="cancelEdit">
        <input class="field edit-val mono" v-model="editAmount" type="number" step="0.01" @keyup.enter="confirmEdit" @keyup.esc="cancelEdit">
        <button class="btn-add" style="width:36px;height:36px;font-size:.9rem" @click="confirmEdit">✓</button>
        <button class="btn-icon" @click="cancelEdit" style="height:36px">✕</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.line-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  transition: background .15s;
}
.line-item:last-child { border-bottom: none; }
.line-item.is-paid { opacity: .55; }

.item-main {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.item-label {
  font-size: .875rem; color: var(--ink); flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-right {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.item-value { font-size: .875rem; color: var(--ink2); }

.item-actions {
  display: flex; gap: 2px; opacity: 0; transition: opacity .15s;
}
.line-item:hover .item-actions { opacity: 1; }

.action {
  background: none; border: none; padding: 3px 6px;
  border-radius: 4px; color: var(--ink3); font-size: .85rem;
  transition: all .15s; cursor: pointer;
}
.action:hover { background: var(--surface2); color: var(--ink); }
.action.del:hover { background: var(--red-lt); color: var(--red); }

.badge { cursor: pointer; }

/* Edit row */
.edit-row { display: flex; gap: 6px; align-items: center; }
.edit-label { flex: 2; }
.edit-val   { width: 90px; flex: none; }
</style>
