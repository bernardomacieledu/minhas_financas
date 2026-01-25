<script setup>
import { onMounted, ref } from 'vue'
import { useFinanceStore } from './stores/financeStore'

import BalanceDisplay from './components/BalanceDisplay.vue'
import AssetList from './components/AssetList.vue'
import FixedExpenseList from './components/FixedExpenseList.vue'
import DebitList from './components/DebitList.vue'
import DebtorsList from './components/DebtorsList.vue'
import CreditCardCenter from './components/CreditCardCenter.vue'
import ManualTransactionModal from './components/ManualTransactionModal.vue' // <--- NOVO IMPORT

const store = useFinanceStore()
const isDark = ref(true)
const toggleTheme = () => isDark.value = !isDark.value

const showManualModal = ref(false)
const jsonInput = ref(null) // Referência para o input de arquivo

onMounted(() => store.init())

// Aciona o input oculto
const triggerRestore = () => jsonInput.value.click()

// Processa o arquivo selecionado
const handleRestoreFile = (e) => {
  const file = e.target.files[0]
  if (file) {
    store.importJSONFile(file)
    e.target.value = '' // Limpa para permitir re-upload
  }
}
</script>

<template>
  <div class="min-h-screen font-sans transition-colors duration-500 p-4 md:p-8 pb-24 relative"
       :class="isDark ? 'bg-[#0f1014] text-white selection:bg-neon selection:text-black' 
                      : 'bg-slate-100 text-slate-800 selection:bg-indigo-200 selection:text-indigo-900'">
    
    <input type="file" ref="jsonInput" @change="handleRestoreFile" accept=".json" class="hidden" />

    <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r"
            :class="isDark ? 'from-neon to-purple-500' : 'from-indigo-600 to-purple-600'">
          FinVue Control
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <button @click="toggleTheme" class="p-2 rounded-full border transition"
                :class="isDark ? 'bg-white/5 border-white/10 text-yellow-400' : 'bg-white border-slate-200 text-slate-600'">
          <span v-if="isDark">☀️</span><span v-else>🌙</span>
        </button>
        <button @click="store.exportJSON" class="btn-secondary" 
                :class="isDark ? 'border-white/20 text-gray-400' : 'border-slate-300 text-slate-600'">Salvar Backup</button>
        <button @click="triggerRestore" class="btn-secondary" 
                :class="isDark ? 'border-white/20 text-gray-400' : 'border-slate-300 text-slate-600'">Restaurar JSON</button>
      </div>
    </header>

    <main class="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      <div class="col-span-1 md:col-span-12">
        <BalanceDisplay :isDark="isDark" />
      </div>

      <div class="col-span-1 md:col-span-6 h-80">
        <AssetList :isDark="isDark" />
      </div>
      <div class="col-span-1 md:col-span-6 h-80">
        <FixedExpenseList :isDark="isDark" />
      </div>

      <div class="col-span-1 md:col-span-3 h-[600px]">
        <DebitList :isDark="isDark" />
      </div>
      
      <div class="col-span-1 md:col-span-3 h-[600px]">
        <DebtorsList :isDark="isDark" />
      </div>

      <div class="col-span-1 md:col-span-6 h-[600px]">
        <CreditCardCenter :isDark="isDark" />
      </div>

    </main>

    <button @click="showManualModal = true"
            class="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-bold transition-transform hover:scale-110 z-40"
            :class="isDark ? 'bg-neon text-black shadow-neon/50' : 'bg-indigo-600 text-white shadow-indigo-500/50'">
      +
    </button>

    <ManualTransactionModal 
      :isOpen="showManualModal" 
      :isDark="isDark" 
      @close="showManualModal = false" 
    />

  </div>
</template>