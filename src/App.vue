<script setup>
import { onMounted, ref, computed } from 'vue'
import { useFinanceStore } from './stores/financeStore'

// Componentes
import BalanceDisplay from './components/BalanceDisplay.vue'
import AssetList from './components/AssetList.vue'
import FixedExpenseList from './components/FixedExpenseList.vue'
import DebtorsList from './components/DebtorsList.vue'
import CreditCardCenter from './components/CreditCardCenter.vue'
import ManualTransactionModal from './components/ManualTransactionModal.vue'
import EditSimpleModal from './components/EditSimpleModal.vue' // <--- NOVO
import StatisticsPanel from './components/StatisticsPanel.vue'

const store = useFinanceStore()
const isDark = ref(true)
const toggleTheme = () => isDark.value = !isDark.value
const showStats = ref(false)

// Estados de Modal
const showManualModal = ref(false)
const transactionToEdit = ref(null) // Para editar transação
const simpleEditItem = ref(null)    // Para editar Asset/Fixo
const simpleEditType = ref('')

const jsonInput = ref(null)
onMounted(() => store.init())

const triggerRestore = () => jsonInput.value.click()
const handleRestoreFile = (e) => {
  const file = e.target.files[0]
  if (file) { store.importJSONFile(file); e.target.value = '' }
}

// Formatador de Mês (Ex: "Janeiro 2026")
const formattedMonth = computed(() => {
    const [y, m] = store.currentMonth.split('-')
    const date = new Date(y, m - 1)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
})

// Handlers de Edição
const openEditTransaction = (item) => {
    transactionToEdit.value = item
    showManualModal.value = true
}
const openEditSimple = (item, type) => {
    simpleEditItem.value = item
    simpleEditType.value = type
}
const closeManualModal = () => {
    showManualModal.value = false
    transactionToEdit.value = null // Limpa edição ao fechar
}
</script>

<template>
  <div class="min-h-screen font-sans transition-colors duration-500 p-4 md:p-8 pb-24 relative"
       :class="isDark ? 'bg-[#0f1014] text-white selection:bg-neon selection:text-black' : 'bg-slate-100 text-slate-800 selection:bg-indigo-200 selection:text-indigo-900'">
    
    <input type="file" ref="jsonInput" @change="handleRestoreFile" accept=".json" class="hidden" />

    <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div class="flex flex-col items-start gap-3">
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r"
            :class="isDark ? 'from-neon to-purple-500' : 'from-indigo-600 to-purple-600'">
          FinVue Control
        </h1>

        <div class="flex items-center gap-4 bg-opacity-10 rounded-full p-1 border select-none"
             :class="isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300'">
             
             <button @click="store.changeMonth(-1)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition text-lg">‹</button>
             
             <span class="font-mono font-bold text-lg min-w-[160px] text-center tracking-wide" :class="isDark ? 'text-white' : 'text-indigo-900'">
                {{ formattedMonth }}
             </span>
             
             <button @click="store.changeMonth(1)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition text-lg">›</button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button @click="showStats = !showStats" class="p-2 rounded-full border transition w-10 h-10 flex items-center justify-center"
                :class="showStats ? (isDark ? 'bg-neon text-black border-neon' : 'bg-indigo-600 text-white border-indigo-600') : (isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-slate-200 text-slate-500')">📊</button>
        <button @click="toggleTheme" class="p-2 rounded-full border transition" :class="isDark ? 'bg-white/5 border-white/10 text-yellow-400' : 'bg-white border-slate-200 text-slate-600'">
            <span v-if="isDark">☀️</span><span v-else>🌙</span>
        </button>
        <button @click="store.togglePrivacy" class="p-2 rounded-full border transition w-10 h-10 flex items-center justify-center" :class="isDark ? 'bg-white/5 border-white/10 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'">
            <span v-if="store.privacyMode">🙈</span><span v-else>👁️</span>
        </button>
        <button @click="store.exportJSON" class="btn-secondary" :class="isDark ? 'border-white/20 text-gray-400' : 'border-slate-300 text-slate-600'">Salvar</button>
        <button @click="triggerRestore" class="btn-secondary" :class="isDark ? 'border-white/20 text-gray-400' : 'border-slate-300 text-slate-600'">Restaurar</button>
      </div>
    </header>

    <Transition name="expand">
        <div v-if="showStats" class="mb-6">
            <StatisticsPanel :isDark="isDark" />
        </div>
    </Transition>

    <Transition name="slide-fade" mode="out-in">
        
        <main :key="store.currentMonth" class="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div class="col-span-1 md:col-span-12">
            <BalanceDisplay :isDark="isDark" />
          </div>

          <div class="col-span-1 md:col-span-6 h-80">
            <AssetList :isDark="isDark" @edit="(item) => openEditSimple(item, 'asset')" />
          </div>
          <div class="col-span-1 md:col-span-6 h-80">
            <FixedExpenseList :isDark="isDark" @edit="(item) => openEditSimple(item, 'fixed')" />
          </div>

          <div class="col-span-1 md:col-span-4 h-[600px]">
            <DebtorsList :isDark="isDark" />
          </div>

          <div class="col-span-1 md:col-span-8 h-[600px]">
            <CreditCardCenter :isDark="isDark" @edit="openEditTransaction" />
          </div>
        </main>
    </Transition>

    <button @click="showManualModal = true"
            class="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-bold transition-transform hover:scale-110 z-40"
            :class="isDark ? 'bg-neon text-black shadow-neon/50' : 'bg-indigo-600 text-white shadow-indigo-500/50'">
      +
    </button>

    <ManualTransactionModal 
      :isOpen="showManualModal" 
      :isDark="isDark" 
      :editingItem="transactionToEdit" 
      @close="closeManualModal" 
    />

    <EditSimpleModal 
      :isOpen="!!simpleEditItem" 
      :isDark="isDark" 
      :item="simpleEditItem" 
      :type="simpleEditType"
      @close="simpleEditItem = null"
    />
  </div>
</template>