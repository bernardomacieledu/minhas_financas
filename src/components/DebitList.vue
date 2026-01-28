<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])

const store = useFinanceStore()
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Filtra transações do Mês Selecionado que NÃO são cartão de crédito
const debitList = computed(() => {
  return store.transactions
    .filter(t => t.type === 'debit' && t.date.startsWith(store.currentMonth))
    .slice().reverse()
})

const totalDebit = computed(() => debitList.value.reduce((acc, t) => acc + Number(t.value), 0))
</script>

<template>
  <div class="h-full flex flex-col p-5 overflow-hidden" :class="isDark ? 'card-dark' : 'card-light'">

    <div class="flex justify-between items-center mb-4 pb-4 border-b"
      :class="isDark ? 'border-white/10' : 'border-slate-200'">
      <div>
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span>💸</span> Débito / Pix
        </h3>
        <p class="text-xs opacity-60">Total gasto no mês</p>
      </div>
      <div class="text-right">
        <span class="block text-xl font-bold font-mono text-rose-500" :class="{ 'privacy-blur': store.privacyMode }">{{
          format(totalDebit) }}</span>

      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scroll">
      <table class="w-full text-sm text-left">
        <thead class="text-xs uppercase sticky top-0 backdrop-blur-md z-10"
          :class="isDark ? 'text-gray-500 bg-[#1a1b21]/90' : 'text-slate-500 bg-white/90'">
          <tr>
            <th class="py-2">Dia</th>
            <th class="py-2">Descrição</th>
            <th class="py-2 text-right">Valor</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in debitList" :key="t.id" class="group border-b last:border-0 transition"
            :class="isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'">

            <td class="py-3 px-1 text-xs opacity-60 font-mono">{{ t.date.slice(8) }}</td>
            <td class="py-3 font-medium">{{ t.desc }}</td>
            <td class="py-3 text-right font-mono font-bold text-rose-500"
              :class="{ 'privacy-blur': store.privacyMode }"> - {{ format(t.value) }}
            </td>
            <td class="py-3 text-right">
              <button @click="store.deleteItem('transaction', t.id)"
                class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 px-2 transition">×</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="debitList.length === 0" class="text-center py-10 opacity-40 text-sm">
        Nenhum gasto no débito em {{ store.currentMonth }}.
      </div>
    </div>
  </div>
</template>