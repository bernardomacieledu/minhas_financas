<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])

const store = useFinanceStore()
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Pega os devedores ordenados por data
const list = computed(() => store.cardDebtors.slice().sort((a,b) => b.date.localeCompare(a.date)))
</script>

<template>
  <div class="h-full flex flex-col p-5 overflow-hidden" :class="isDark ? 'card-dark' : 'card-light'">
    
    <div class="flex justify-between items-center mb-4 pb-2 border-b" :class="isDark ? 'border-white/10' : 'border-slate-200'">
      <div>
        <h3 class="font-bold text-lg text-orange-400 flex items-center gap-2">
           <span>🤝</span> Devedores (Cartão)
        </h3>
        <p class="text-xs opacity-60">Pessoas que usaram seu limite</p>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scroll space-y-2">
       <div v-for="t in list" :key="t.id" 
            class="p-3 rounded-lg border flex justify-between items-center transition-all"
            :class="isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'">
          
          <div class="flex flex-col">
             <div class="flex items-center gap-2">
                <span class="font-bold text-sm">{{ t.owner }}</span>
                <span class="text-[10px] opacity-50">{{ t.date }}</span>
             </div>
             <span class="text-xs opacity-70 truncate max-w-[120px]">{{ t.desc }}</span>
             <span class="text-[10px] text-purple-400" v-if="t.installments">Parc: {{ t.installments }}</span>
          </div>

          <div class="flex flex-col items-end gap-1">
             <span class="font-mono font-bold text-sm">{{ format(t.value) }}</span>
             
             <button @click="store.togglePaid(t.id)" 
                     class="text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer select-none"
                     :class="t.isPaid 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:border-orange-400 hover:text-orange-400'">
                <span v-if="t.isPaid">✓ Pago</span>
                <span v-else>○ Pendente</span>
             </button>
          </div>
       </div>

       <div v-if="list.length === 0" class="text-center py-10 opacity-40 text-xs">
         Ninguém usou seu cartão (ainda).
       </div>
    </div>
  </div>
</template>