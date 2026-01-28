<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
const props = defineProps(['isDark'])
const store = useFinanceStore()
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Filtra só Débitos do Mês Atual
const debitTransactions = computed(() => {
    return store.currentMonthTransactions.filter(t => t.type === 'debit').reverse()
})
</script>

<template>
  <div class="h-full flex flex-col p-4" :class="isDark ? 'card-dark' : 'card-light'">
    <h3 class="font-bold mb-4 flex justify-between">
        <span>Extrato (Débito/Pix)</span>
        <input type="month" v-model="store.currentMonth" 
               class="bg-transparent border-none font-mono text-sm cursor-pointer focus:outline-none"
               :class="isDark ? 'text-white' : 'text-slate-800'">
    </h3>

    <div class="flex-1 overflow-y-auto custom-scroll space-y-2">
        <div v-for="t in debitTransactions" :key="t.id" 
             class="flex justify-between items-center p-3 rounded border transition"
             :class="isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'">
            
            <div class="flex flex-col">
                <span class="font-medium text-sm">{{ t.desc }}</span>
                <span class="text-xs opacity-50">{{ t.date }} • {{ t.owner }}</span>
            </div>
            
            <div class="flex items-center gap-3">
                <span class="font-mono font-bold text-rose-500" >- {{ format(t.value) }}</span>
                <button @click="store.deleteItem('transaction', t.id)" class="text-xs text-gray-400 hover:text-red-500">x</button>
            </div>
        </div>
        <div v-if="debitTransactions.length === 0" class="text-center opacity-40 text-xs py-4">
            Nenhum gasto no débito este mês.
        </div>
    </div>
  </div>
</template>