<script setup>
import { onMounted, ref, computed } from 'vue'
import { useFinanceStore } from './stores/financeStore'

const store = useFinanceStore()
const showImportModal = ref(false)
const importText = ref('')
const fileInput = ref(null)

// TEMA
const isDark = ref(true)
const toggleTheme = () => isDark.value = !isDark.value

// Seleção de Cartão (Abas)
const selectedCardId = ref(null)

// Estados dos Formulários
const newAsset = ref({ name: '', value: '' })
const newExpense = ref({ name: '', value: '' })
const newCard = ref({ name: '', currentInvoice: '' }) 
const newReceivable = ref({ name: '', value: '', desc: '' })
const newTransaction = ref({ desc: '', value: '', type: 'debit', cardId: null })

onMounted(() => {
  store.init()
  // Seleciona o primeiro cartão automaticamente se existir
  if (store.cards.length > 0) {
    selectedCardId.value = store.cards[0].id
  }
})

// Formatação
const formatMoney = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Computados para a Central de Cartões
const currentCard = computed(() => store.cards.find(c => c.id === selectedCardId.value))

const currentCardTransactions = computed(() => {
  if (!selectedCardId.value) return []
  return store.transactions
    .filter(t => t.type === 'credit' && t.cardId === selectedCardId.value)
    .slice().reverse() // Mais recentes primeiro
})

const currentCardTotal = computed(() => {
  if (!selectedCardId.value || !currentCard.value) return 0
  const base = Number(currentCard.value.currentInvoice || 0)
  const sumTrans = currentCardTransactions.value.reduce((acc, t) => acc + Number(t.value), 0)
  return base + sumTrans
})

// --- UPLOAD CSV ---
const triggerFileInput = () => {
  if (!selectedCardId.value) {
    alert("Selecione um cartão primeiro.")
    return
  }
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file && selectedCardId.value) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const count = store.importNubankTransactions(e.target.result, selectedCardId.value)
      alert(`${count} lançamentos adicionados à fatura do ${currentCard.value.name}!`)
      event.target.value = '' // Reset input
    }
    reader.readAsText(file)
  }
}

const handleImport = () => {
  store.importJSON(importText.value)
  showImportModal.value = false
  importText.value = ''
  if(store.cards.length) selectedCardId.value = store.cards[0].id
}

// Submits
const submitAsset = () => {
  store.addAsset({ ...newAsset.value, value: Number(newAsset.value.value) })
  newAsset.value = { name: '', value: '' }
}
const submitCard = () => {
  store.addCard({ ...newCard.value, currentInvoice: Number(newCard.value.currentInvoice || 0) })
  newCard.value = { name: '', currentInvoice: '' }
  // Seleciona o novo cartão criado
  setTimeout(() => selectedCardId.value = store.cards[store.cards.length -1].id, 100)
}
const submitReceivable = () => {
  store.addReceivable({ ...newReceivable.value, value: Number(newReceivable.value.value) })
  newReceivable.value = { name: '', value: '', desc: '' }
}
const submitExpense = () => {
  store.addFixedExpense({ ...newExpense.value, value: Number(newExpense.value.value) })
  newExpense.value = { name: '', value: '' }
}
const submitTransaction = () => {
  // Se for crédito e nenhum cartão selecionado no form, avisa
  if(newTransaction.value.type === 'credit' && !newTransaction.value.cardId) {
    alert("Selecione o cartão para esta compra.")
    return
  }
  store.addTransaction({ ...newTransaction.value, value: Number(newTransaction.value.value) })
  newTransaction.value = { desc: '', value: '', type: 'debit', cardId: null }
}
</script>

<template>
  <div class="min-h-screen font-sans transition-colors duration-500 p-4 md:p-8"
       :class="isDark ? 'bg-gray-900 text-white selection:bg-neon selection:text-black' : 'bg-slate-100 text-slate-800 selection:bg-blue-400 selection:text-white'">
    
    <input type="file" ref="fileInput" @change="handleFileUpload" accept=".csv" class="hidden" />

    <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r"
            :class="isDark ? 'from-neon to-purple-500' : 'from-blue-600 to-purple-600'">
          FinVue Control
        </h1>
        <p class="text-sm" :class="isDark ? 'text-gray-400' : 'text-slate-500'">Gestão Financeira Pessoal</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="toggleTheme" class="p-2 rounded-full transition-all" 
                :class="isDark ? 'bg-white/10 text-yellow-400' : 'bg-slate-200 text-slate-600'">
          <span v-if="isDark">☀️</span><span v-else>🌙</span>
        </button>
        <button @click="store.exportJSON" class="btn-secondary" :class="!isDark && '!border-slate-300 !text-slate-600'">Backup</button>
        <button @click="showImportModal = true" class="btn-secondary" :class="!isDark && '!border-slate-300 !text-slate-600'">Restaurar</button>
      </div>
    </header>

    <main class="grid grid-cols-1 md:grid-cols-4 gap-6">

      <div class="glass-panel col-span-1 md:col-span-4 lg:col-span-2 flex flex-col justify-center items-start p-8 relative overflow-hidden group"
           :class="isDark ? 'border-white/5' : 'bg-white/70 border-white shadow-xl'">
        <div class="absolute -right-10 -top-10 w-40 h-40 blur-[100px] opacity-20"
             :class="isDark ? 'bg-neon' : 'bg-blue-500'"></div>
        
        <h2 class="font-medium mb-2" :class="isDark ? 'text-gray-400' : 'text-slate-500'">Sobra Mensal Prevista</h2>
        <div class="text-5xl font-bold tracking-tighter transition-colors"
             :class="store.finalBalance >= 0 ? 'text-success' : 'text-danger'">
          {{ formatMoney(store.finalBalance) }}
        </div>
        <p class="text-xs mt-2 opacity-60">Lógica: (Ganhos + Devedores) - (Fixos + Total de Cartões + Débitos)</p>
      </div>

      <div class="glass-panel col-span-1 md:col-span-2 lg:col-span-1 p-4 flex flex-col" :class="!isDark && 'bg-white/70 shadow-lg'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold flex items-center gap-2" :class="isDark ? 'text-neon' : 'text-blue-600'"><span>💰</span> Entradas</h3>
          <span class="text-xs font-mono">{{ formatMoney(store.totalAssets) }}</span>
        </div>
        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-32">
          <div v-for="item in store.assets" :key="item.id" class="flex justify-between text-sm border-b pb-1 group"
               :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
            <span>{{ item.name }}</span>
            <div class="flex gap-2 items-center">
               <span class="font-mono opacity-80">{{ formatMoney(item.value) }}</span>
               <button @click="store.deleteItem('asset', item.id)" class="text-danger opacity-0 group-hover:opacity-100">x</button>
            </div>
          </div>
        </div>
        <form @submit.prevent="submitAsset" class="flex gap-2 mt-auto">
          <input v-model="newAsset.name" placeholder="Ex: Salário" :class="isDark ? 'input-glass' : 'input-light'" class="w-full" required>
          <input v-model="newAsset.value" type="number" step="0.01" placeholder="R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-24" required>
          <button class="btn-primary" :class="!isDark && '!bg-blue-600 !text-white'">+</button>
        </form>
      </div>

       <div class="glass-panel col-span-1 md:col-span-2 lg:col-span-1 p-4 flex flex-col" :class="!isDark && 'bg-white/70 shadow-lg'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold flex items-center gap-2 text-danger"><span>📉</span> Fixos</h3>
          <span class="text-xs font-mono">{{ formatMoney(store.totalFixed) }}</span>
        </div>
        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-32">
          <div v-for="item in store.fixedExpenses" :key="item.id" class="flex justify-between text-sm border-b pb-1 group"
               :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
            <span>{{ item.name }}</span>
            <div class="flex gap-2 items-center">
               <span class="font-mono opacity-80">{{ formatMoney(item.value) }}</span>
               <button @click="store.deleteItem('fixed', item.id)" class="text-danger opacity-0 group-hover:opacity-100">x</button>
            </div>
          </div>
        </div>
        <form @submit.prevent="submitExpense" class="flex gap-2 mt-auto">
          <input v-model="newExpense.name" placeholder="Nome" :class="isDark ? 'input-glass' : 'input-light'" class="w-full" required>
          <input v-model="newExpense.value" type="number" step="0.01" placeholder="R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-24" required>
          <button class="btn-primary" :class="!isDark && '!bg-blue-600 !text-white'">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-4 p-4 border" :class="isDark ? 'border-neon/20' : 'bg-white border-blue-200 shadow-md'">
         <h3 class="text-sm font-bold uppercase mb-3 opacity-70">Registro Manual Rápido</h3>
         <form @submit.prevent="submitTransaction" class="flex flex-col md:flex-row gap-3">
            <input v-model="newTransaction.desc" placeholder="Descrição (Ex: Uber)" :class="isDark ? 'input-glass' : 'input-light'" class="flex-1" required>
            <input v-model="newTransaction.value" type="number" step="0.01" placeholder="R$ Valor" :class="isDark ? 'input-glass' : 'input-light'" class="w-full md:w-32" required>
            <select v-model="newTransaction.type" :class="isDark ? 'input-glass text-gray-300' : 'input-light text-slate-700'" class="w-full md:w-40">
              <option value="debit">Débito</option>
              <option value="credit">Crédito</option>
            </select>
            <select v-if="newTransaction.type === 'credit'" v-model="newTransaction.cardId" 
                    :class="isDark ? 'input-glass border-purple-500/50' : 'input-light border-purple-400'" class="w-full md:w-48 text-purple-400 font-bold" required>
              <option :value="null" disabled>Cartão...</option>
              <option v-for="card in store.cards" :key="card.id" :value="card.id">{{ card.name }}</option>
            </select>
            <button class="btn-primary w-full md:w-auto px-6" :class="!isDark && '!bg-blue-600 !text-white'">Lançar</button>
         </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-4 p-0 overflow-hidden flex flex-col md:flex-row min-h-[400px]"
           :class="!isDark && 'bg-white shadow-xl'">
        
        <div class="w-full md:w-1/4 border-r p-4" :class="isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-slate-50'">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg" :class="isDark ? 'text-purple-400' : 'text-purple-600'">Cartões</h3>
          </div>
          
          <div class="space-y-2 mb-6">
            <div v-for="card in store.cards" :key="card.id" 
                 @click="selectedCardId = card.id"
                 class="p-3 rounded-lg cursor-pointer transition-all border flex justify-between items-center"
                 :class="selectedCardId === card.id 
                    ? (isDark ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-purple-100 border-purple-400 text-purple-900') 
                    : (isDark ? 'bg-transparent border-transparent hover:bg-white/5 text-gray-400' : 'bg-transparent border-transparent hover:bg-slate-200 text-slate-500')">
               <span class="font-medium">{{ card.name }}</span>
               <button @click.stop="store.deleteItem('card', card.id)" class="text-xs text-danger hover:text-red-400 opacity-50 hover:opacity-100">x</button>
            </div>
          </div>

          <div class="pt-4 border-t" :class="isDark ? 'border-white/10' : 'border-slate-200'">
             <p class="text-[10px] uppercase font-bold mb-2 opacity-50">Novo Cartão</p>
             <form @submit.prevent="submitCard" class="flex gap-2">
               <input v-model="newCard.name" placeholder="Nome" :class="isDark ? 'input-glass' : 'input-light'" class="w-full text-xs">
               <button class="btn-primary text-xs px-3">+</button>
             </form>
          </div>
        </div>

        <div class="flex-1 p-6 flex flex-col">
          <div v-if="currentCard" class="h-full flex flex-col">
            <div class="flex justify-between items-start mb-6">
               <div>
                 <h2 class="text-2xl font-bold mb-1">{{ currentCard.name }}</h2>
                 <p class="text-sm opacity-60">Fatura Atual (CSV + Manuais)</p>
               </div>
               <div class="text-right">
                 <div class="text-3xl font-bold font-mono" :class="isDark ? 'text-purple-300' : 'text-purple-700'">
                   {{ formatMoney(currentCardTotal) }}
                 </div>
                 <div class="mt-2">
                   <button @click="triggerFileInput" class="text-xs flex items-center gap-2 ml-auto px-3 py-1.5 rounded border transition"
                           :class="isDark ? 'border-purple-500/50 hover:bg-purple-500 hover:text-white text-purple-300' : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white'">
                     📄 Importar CSV Nubank
                   </button>
                 </div>
               </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scroll bg-black/10 rounded-lg p-2" :class="!isDark && '!bg-slate-50 border border-slate-200'">
               <table class="w-full text-sm text-left">
                 <thead class="text-xs uppercase opacity-50 border-b" :class="isDark ? 'border-white/10' : 'border-slate-200'">
                   <tr>
                     <th class="py-2 px-3">Data</th>
                     <th class="py-2 px-3">Descrição</th>
                     <th class="py-2 px-3 text-right">Valor</th>
                     <th class="py-2 px-3"></th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr v-if="currentCard.currentInvoice > 0" class="border-b border-dashed border-white/5">
                      <td class="py-3 px-3 opacity-50">-</td>
                      <td class="py-3 px-3 italic opacity-70">Saldo Inicial / Anterior</td>
                      <td class="py-3 px-3 text-right font-mono">{{ formatMoney(currentCard.currentInvoice) }}</td>
                      <td></td>
                   </tr>
                   <tr v-for="t in currentCardTransactions" :key="t.id" class="group hover:bg-white/5 transition" :class="!isDark && 'hover:!bg-slate-100'">
                      <td class="py-3 px-3 opacity-60 text-xs">{{ t.date }}</td>
                      <td class="py-3 px-3 font-medium">{{ t.desc }}</td>
                      <td class="py-3 px-3 text-right font-mono" :class="isDark ? 'text-white' : 'text-slate-800'">
                        {{ formatMoney(t.value) }}
                      </td>
                      <td class="py-3 px-3 text-right">
                        <button @click="store.deleteItem('transaction', t.id)" class="text-red-500 opacity-0 group-hover:opacity-100 px-2">x</button>
                      </td>
                   </tr>
                 </tbody>
               </table>
               
               <div v-if="currentCardTransactions.length === 0 && currentCard.currentInvoice === 0" class="text-center py-10 opacity-50">
                 Nenhuma transação neste cartão ainda.
               </div>
            </div>
          </div>
          
          <div v-else class="h-full flex flex-col items-center justify-center opacity-40">
             <div class="text-4xl mb-2">💳</div>
             <p>Selecione ou crie um cartão ao lado para gerenciar a fatura.</p>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showImportModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div class="p-6 w-full max-w-lg rounded-xl shadow-2xl" :class="isDark ? 'glass-panel' : 'bg-white text-slate-800'">
        <h3 class="mb-4 font-bold text-xl">Restaurar JSON</h3>
        <textarea v-model="importText" class="w-full h-48 text-xs font-mono mb-4 resize-none border rounded p-2 outline-none" 
                  :class="isDark ? 'input-glass' : 'bg-slate-50 border-slate-300'"></textarea>
        <div class="flex justify-end gap-3">
          <button @click="showImportModal = false" class="px-4 py-2 rounded text-sm opacity-70 hover:opacity-100">Cancelar</button>
          <button @click="handleImport" class="btn-primary text-sm px-6" :class="!isDark && '!bg-blue-600 !text-white'">Restaurar</button>
        </div>
      </div>
    </div>
  </div>
</template>
