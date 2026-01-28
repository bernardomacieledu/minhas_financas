<script setup>
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])
const store = useFinanceStore()
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
</script>

<template>
  <div class="glass-panel p-8 relative overflow-hidden group transition-all duration-500 flex flex-col justify-center"
    :class="isDark ? 'border-white/5' : 'bg-white/70 border-white shadow-xl'">

    <div class="absolute -right-10 -top-10 w-40 h-40 blur-[100px] opacity-20"
      :class="isDark ? 'bg-neon' : 'bg-blue-500'"></div>

    <h2 class="font-medium mb-2" :class="isDark ? 'text-gray-400' : 'text-slate-500'">Sobra Mensal Prevista</h2>

    <div class="text-5xl md:text-6xl font-bold tracking-tighter transition-colors" :class="[
      store.finalBalance >= 0 ? 'text-success' : 'text-danger',
      { 'privacy-blur': store.privacyMode }  /* <--- ADICIONE ISSO */
    ]">
      {{ format(store.finalBalance) }}
    </div>

    <p class="text-xs mt-3 opacity-60" :class="isDark ? 'text-gray-500' : 'text-slate-400'">
      Cálculo: (Ganhos + A Receber) - (Fixos + Fatura Cartões + Débitos)
    </p>
  </div>
</template>