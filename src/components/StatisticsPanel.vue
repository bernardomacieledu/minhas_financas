<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])

const store = useFinanceStore()
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1']

const getPieGradient = (data) => {
    if (!data || data.length === 0) return 'gray'
    let gradient = [], currentDeg = 0
    const total = data.reduce((acc, item) => acc + item.value, 0)
    data.forEach((item, index) => {
        const deg = (item.value / total) * 360
        gradient.push(`${colors[index % colors.length]} ${currentDeg}deg ${currentDeg + deg}deg`)
        currentDeg += deg
    })
    return `conic-gradient(${gradient.join(', ')})`
}
const getBarPercent = (val, max) => !max ? 0 : Math.max(Math.round((val / max) * 100), 5) + '%'
const maxMonthValue = computed(() => !store.stats?.monthlyEvolution.length ? 1 : Math.max(...store.stats.monthlyEvolution.map(m => m.value)))
</script>

<template>
  <div v-if="store.stats" class="p-6 rounded-2xl mb-8 border relative overflow-hidden transition-all"
       :class="isDark ? 'bg-[#15161b] border-white/5' : 'bg-white border-slate-200 shadow-xl'">

    <h2 class="text-xl font-bold mb-8 flex items-center gap-2 relative z-10">
        <span class="text-2xl">📊</span> Analytics do Mês
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        
        <div class="md:col-span-8 flex flex-col">
            <h3 class="text-xs font-bold opacity-70 mb-6 uppercase tracking-wider">Evolução Histórica</h3>
            <div class="flex-1 min-h-[200px] flex items-end gap-3 pb-2 border-b border-dashed relative"
                 :class="isDark ? 'border-white/10' : 'border-slate-300'">
                <div class="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                    <div class="w-full h-px bg-current"></div><div class="w-full h-px bg-current"></div><div class="w-full h-px bg-current"></div>
                </div>
                <div v-for="(m, i) in store.stats.monthlyEvolution" :key="m.month" class="flex-1 flex flex-col justify-end items-center group relative h-full">
                    <div class="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-[10px] px-2 py-1 rounded z-20 whitespace-nowrap">
                        {{ m.month }}: {{ format(m.value) }}
                    </div>
                    <div class="w-full max-w-[40px] rounded-t-md transition-all duration-500 hover:brightness-110 relative overflow-hidden"
                         :class="m.month === store.currentMonth ? (isDark ? 'bg-neon shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'bg-blue-500') : (isDark ? 'bg-white/10' : 'bg-slate-200')"
                         :style="{ height: getBarPercent(m.value, maxMonthValue) }"></div>
                    <span class="text-[10px] mt-2 font-mono opacity-50 truncate w-full text-center">{{ m.month.slice(5) }}</span>
                </div>
            </div>
        </div>

        <div class="md:col-span-4 flex flex-col">
            <h3 class="text-xs font-bold opacity-70 mb-4 uppercase tracking-wider">Top Despesas (Mês)</h3>
            <div class="flex-1 overflow-y-auto custom-scroll pr-2 space-y-3 max-h-[250px]">
                <div v-for="(item, index) in store.stats.topExpenses" :key="item.name" class="flex items-center gap-3 text-sm p-2 rounded hover:bg-white/5 transition">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                         :style="{ backgroundColor: colors[index % colors.length] + '30', color: colors[index % colors.length] }">{{ index + 1 }}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline">
                            <span class="font-medium truncate">{{ item.name }}</span>
                            <span class="font-mono text-xs opacity-70" :class="{ 'privacy-blur': store.privacyMode }">{{ format(item.value) }}</span>
                        </div>
                        <div class="h-1 rounded-full mt-1 bg-gray-500/10 overflow-hidden">
                            <div class="h-full rounded-full" :style="{ width: getBarPercent(item.value, store.stats.totalSpent), backgroundColor: colors[index % colors.length] }"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-6 border-t" :class="isDark ? 'border-white/5' : 'border-slate-100'">
             
             <div class="flex items-center gap-6 justify-center">
                <div class="relative w-32 h-32 rounded-full shadow-xl flex items-center justify-center" :style="{ background: getPieGradient(store.stats.ownerRanking) }">
                     <div class="w-20 h-20 rounded-full flex flex-col items-center justify-center" :class="isDark ? 'bg-[#15161b]' : 'bg-white'">
                        <span class="text-[10px] opacity-50 uppercase">Total Mês</span>
                        <span class="text-xs font-bold font-mono" :class="{ 'privacy-blur': store.privacyMode }">{{ format(store.stats.totalSpent) }}</span>
                     </div>
                </div>
                <div class="space-y-1">
                    <h4 class="text-[10px] font-bold mb-2 opacity-70 uppercase">Por Pessoa</h4>
                    <div v-for="(p, i) in store.stats.ownerRanking" :key="p.name" class="flex items-center gap-2 text-xs">
                        <span class="w-2 h-2 rounded-full" :style="{ background: colors[i % colors.length] }"></span>
                        <span class="opacity-80 w-12 truncate">{{ p.name }}</span>
                        <span class="font-mono font-bold ml-auto" :class="{ 'privacy-blur': store.privacyMode }">{{ format(p.value) }}</span>
                    </div>
                </div>
             </div>

             <div class="md:col-span-2 p-5 rounded-xl border flex flex-col gap-4"
                  :class="isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'">
                 
                 <div class="flex justify-between items-center mb-2">
                     <h4 class="text-sm font-bold text-neon flex items-center gap-2">👤 Resumo Pessoal ("Fui Eu")</h4>
                     <span class="text-2xl font-mono font-bold" :class="{ 'privacy-blur': store.privacyMode }">{{ format(store.stats.myTotalSpend) }}</span>
                 </div>

                 <div class="grid grid-cols-2 gap-4 text-xs">
                    <div class="p-3 rounded border" :class="isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'">
                        <span class="opacity-60 block mb-1">📉 Gastos Fixos</span>
                        <span class="font-mono font-bold text-base" :class="{ 'privacy-blur': store.privacyMode }">{{ format(store.stats.myFixed) }}</span>
                    </div>

                    <div class="p-3 rounded border" :class="isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'">
                        <span class="opacity-60 block mb-1">💳 Total Cartões (Só Eu)</span>
                        <span class="font-mono font-bold text-base text-purple-400" :class="{ 'privacy-blur': store.privacyMode }">{{ format(store.stats.myCardTotal) }}</span>
                    </div>
                 </div>

                 <div class="mt-1">
                    <p class="text-[10px] uppercase font-bold opacity-50 mb-2">Por Cartão (Meus Gastos)</p>
                    <div class="flex gap-4">
                        <div v-for="(val, cardName) in store.stats.myCardBreakdown" :key="cardName" class="flex items-center gap-2 text-xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            <span>{{ cardName }}:</span>
                            <span class="font-mono font-bold opacity-80" :class="{ 'privacy-blur': store.privacyMode }">{{ format(val) }}</span>
                        </div>
                        <div v-if="Object.keys(store.stats.myCardBreakdown).length === 0" class="opacity-40 text-xs italic">Nenhum gasto no cartão.</div>
                    </div>
                 </div>
             </div>
        </div>
    </div>
  </div>
</template>