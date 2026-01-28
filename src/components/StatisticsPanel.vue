<script setup>
import { computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])

const store = useFinanceStore()
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// --- Helpers Visuais ---

// Cor para gráficos (Paleta Cyberpunk/Fintech)
const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1']

// Gera o gradiente cônico para o gráfico de pizza
const getPieGradient = (data) => {
    if (!data || data.length === 0) return 'gray'
    
    let gradient = []
    let currentDeg = 0
    const total = data.reduce((acc, item) => acc + item.value, 0)

    data.forEach((item, index) => {
        const percent = item.value / total
        const deg = percent * 360
        const color = colors[index % colors.length]
        
        gradient.push(`${color} ${currentDeg}deg ${currentDeg + deg}deg`)
        currentDeg += deg
    })

    return `conic-gradient(${gradient.join(', ')})`
}

const getBarPercent = (val, max) => {
    if (!max) return 0
    return Math.max(Math.round((val / max) * 100), 5) + '%' // Mínimo 5% pra não sumir
}

const maxMonthValue = computed(() => {
    if (!store.stats?.monthlyEvolution.length) return 1
    return Math.max(...store.stats.monthlyEvolution.map(m => m.value))
})
</script>

<template>
  <div v-if="store.stats" class="p-6 rounded-2xl animate-fade-in mb-8 border relative overflow-hidden"
       :class="isDark ? 'bg-[#15161b] border-white/5' : 'bg-white border-slate-200 shadow-xl'">

    <h2 class="text-xl font-bold mb-8 flex items-center gap-2 relative z-10">
        <span class="text-2xl">📊</span> Analytics & Insights
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        
        <div class="md:col-span-8 flex flex-col">
            <h3 class="text-sm font-bold opacity-70 mb-6 uppercase tracking-wider">Evolução Mensal</h3>
            
            <div class="flex-1 min-h-[200px] flex items-end gap-3 pb-2 border-b border-dashed relative"
                 :class="isDark ? 'border-white/10' : 'border-slate-300'">
                
                <div class="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                    <div class="w-full h-px bg-current"></div>
                    <div class="w-full h-px bg-current"></div>
                    <div class="w-full h-px bg-current"></div>
                </div>

                <div v-for="(m, i) in store.stats.monthlyEvolution" :key="m.month" 
                     class="flex-1 flex flex-col justify-end items-center group relative h-full">
                    
                    <div class="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                        {{ m.month }}: {{ format(m.value) }}
                    </div>

                    <div class="w-full max-w-[40px] rounded-t-md transition-all duration-500 hover:brightness-110 relative overflow-hidden"
                         :class="m.month === store.currentMonth 
                            ? (isDark ? 'bg-neon shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'bg-blue-500') 
                            : (isDark ? 'bg-white/10' : 'bg-slate-200')"
                         :style="{ height: getBarPercent(m.value, maxMonthValue) }">
                         <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                    
                    <span class="text-[10px] mt-2 font-mono opacity-50 truncate w-full text-center">
                        {{ m.month.slice(5) }}
                    </span>
                </div>
            </div>
        </div>

        <div class="md:col-span-4 flex flex-col">
            <h3 class="text-sm font-bold opacity-70 mb-4 uppercase tracking-wider">Onde você gasta?</h3>
            
            <div class="flex-1 overflow-y-auto custom-scroll pr-2 space-y-3 max-h-[250px]">
                <div v-for="(item, index) in store.stats.topExpenses" :key="item.name"
                     class="flex items-center gap-3 text-sm p-2 rounded hover:bg-white/5 transition">
                    
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                         :style="{ backgroundColor: colors[index % colors.length] + '30', color: colors[index % colors.length] }">
                        {{ index + 1 }}
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline">
                            <span class="font-medium truncate">{{ item.name }}</span>
                            <span class="font-mono text-xs opacity-70" :class="{ 'privacy-blur': store.privacyMode }">
                                {{ format(item.value) }}
                            </span>
                        </div>
                        <div class="h-1 rounded-full mt-1 bg-gray-500/10 overflow-hidden">
                            <div class="h-full rounded-full" 
                                 :style="{ width: getBarPercent(item.value, store.stats.totalSpent), backgroundColor: colors[index % colors.length] }">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 pt-6 border-t"
             :class="isDark ? 'border-white/5' : 'border-slate-100'">
             
             <div class="flex items-center gap-6 justify-center">
                <div class="relative w-32 h-32 rounded-full shadow-xl flex items-center justify-center"
                     :style="{ background: getPieGradient(store.stats.ownerRanking) }">
                     <div class="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                          :class="isDark ? 'bg-[#15161b]' : 'bg-white'">
                        <span class="text-[10px] opacity-50 uppercase">Total</span>
                        <span class="text-xs font-bold font-mono" :class="{ 'privacy-blur': store.privacyMode }">
                            {{ format(store.stats.totalSpent) }}
                        </span>
                     </div>
                </div>
                <div class="space-y-1">
                    <h4 class="text-xs font-bold mb-2 opacity-70">POR PESSOA</h4>
                    <div v-for="(p, i) in store.stats.ownerRanking" :key="p.name" class="flex items-center gap-2 text-xs">
                        <span class="w-2 h-2 rounded-full" :style="{ background: colors[i % colors.length] }"></span>
                        <span class="opacity-80 w-12">{{ p.name }}</span>
                        <span class="font-mono font-bold ml-auto" :class="{ 'privacy-blur': store.privacyMode }">
                            {{ format(p.value) }}
                        </span>
                    </div>
                </div>
             </div>

             <div class="p-4 rounded-xl border flex flex-col justify-center gap-2"
                  :class="isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'">
                 <h4 class="text-xs font-bold opacity-60 uppercase">Resumo Pessoal ("Fui Eu")</h4>
                 <div class="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
                      :class="{ 'privacy-blur': store.privacyMode }">
                     {{ format(store.stats.myTotalSpend) }}
                 </div>
                 <p class="text-xs opacity-50">
                    Isso representa 
                    <strong class="text-white">{{ Math.round((store.stats.myTotalSpend / store.stats.totalSpent) * 100) }}%</strong> 
                    de todo o volume financeiro processado.
                 </p>
             </div>
        </div>

    </div>
    
    <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-0 pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-0 pointer-events-none"></div>
  </div>
</template>