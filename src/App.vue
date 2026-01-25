<script setup>
import { onMounted, ref } from 'vue'
import { useFinanceStore } from './stores/financeStore'

const store = useFinanceStore()
const showImportModal = ref(false)
const importText = ref('')
const fileInput = ref(null) // Referência para o input de arquivo oculto

// Estados dos Formulários
const newAsset = ref({ name: '', value: '' })
const newExpense = ref({ name: '', value: '' })
const newCard = ref({ name: '', currentInvoice: '' }) 
const newReceivable = ref({ name: '', value: '', desc: '' })
const newTransaction = ref({ desc: '', value: '', type: 'debit', cardId: null })

onMounted(() => {
  store.init()
})

const formatMoney = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Lógica de CSV do Nubank
const triggerFileInput = (cardId) => {
  // Guarda o ID do cartão no dataset do input para usar depois
  fileInput.value.dataset.cardId = cardId
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  const cardId = Number(event.target.dataset.cardId)
  
  if (file && cardId) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csvContent = e.target.result
      const count = store.importNubankTransactions(csvContent, cardId)
      alert(`${count} transações importadas com sucesso!`)
      // Limpa o input para permitir carregar o mesmo arquivo de novo se precisar
      event.target.value = ''
    }
    reader.readAsText(file)
  }
}

const handleImport = () => {
  store.importJSON(importText.value)
  showImportModal.value = false
  importText.value = ''
}

// Submits
const submitAsset = () => {
  store.addAsset({ ...newAsset.value, value: Number(newAsset.value.value) })
  newAsset.value = { name: '', value: '' }
}
const submitCard = () => {
  store.addCard({ ...newCard.value, currentInvoice: Number(newCard.value.currentInvoice || 0) })
  newCard.value = { name: '', currentInvoice: '' }
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
  store.addTransaction({ ...newTransaction.value, value: Number(newTransaction.value.value) })
  newTransaction.value = { desc: '', value: '', type: 'debit', cardId: null }
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white font-sans selection:bg-neon selection:text-black p-4 md:p-8">
    
    <input type="file" ref="fileInput" @change="handleFileUpload" accept=".csv" class="hidden" />

    <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-neon to-purple-500 bg-clip-text text-transparent">
          FinVue Control
        </h1>
        <p class="text-gray-400 text-sm">Dashboard Pessoal de Gastos</p>
      </div>
      <div class="flex gap-2">
        <button @click="store.exportJSON" class="btn-secondary">Backup (JSON)</button>
        <button @click="showImportModal = true" class="btn-secondary">Restaurar</button>
      </div>
    </header>

    <main class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

      <div class="glass-panel col-span-1 md:col-span-3 lg:col-span-2 flex flex-col justify-center items-start p-8 relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-neon blur-[100px] opacity-20 group-hover:opacity-40 transition duration-700"></div>
        <h2 class="text-gray-400 mb-2 font-medium">Previsão de Sobra Mensal</h2>
        <div class="text-4xl md:text-6xl font-bold tracking-tighter transition-colors"
             :class="store.finalBalance >= 0 ? 'text-success' : 'text-danger'">
          {{ formatMoney(store.finalBalance) }}
        </div>
        <p class="text-xs text-gray-500 mt-2">
          (Ativos + Recebíveis) - (Fixos + Faturas + Gastos Débito)
        </p>
      </div>

      <div class="glass-panel col-span-1 md:col-span-1 p-4 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-neon font-bold flex items-center gap-2"><span>💰</span> Ativos</h3>
          <span class="text-xs text-gray-400 font-mono">{{ formatMoney(store.totalAssets) }}</span>
        </div>
        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
          <div v-for="item in store.assets" :key="item.id" class="flex justify-between text-sm border-b border-glassBorder pb-1 group">
            <span>{{ item.name }}</span>
            <div class="flex gap-2 items-center">
               <span class="font-mono text-gray-300">{{ formatMoney(item.value) }}</span>
               <button @click="store.deleteItem('asset', item.id)" class="text-danger opacity-0 group-hover:opacity-100 transition-opacity">x</button>
            </div>
          </div>
        </div>
        <form @submit.prevent="submitAsset" class="flex gap-2 mt-auto">
          <input v-model="newAsset.name" placeholder="Ex: Salário" class="input-glass w-full" required>
          <input v-model="newAsset.value" type="number" step="0.01" placeholder="R$" class="input-glass w-24" required>
          <button class="btn-primary">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-1 p-4 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-purple-400 font-bold flex items-center gap-2"><span>💳</span> Cartões</h3>
          <span class="text-xs text-gray-400 font-mono">Total: {{ formatMoney(store.totalCards) }}</span>
        </div>

        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
          <div v-for="card in store.cards" :key="card.id" class="text-sm border-b border-glassBorder pb-2 group">
            <div class="flex justify-between items-center mb-1">
              <span class="font-semibold text-white">{{ card.name }}</span>
              <div class="flex gap-2">
                 <button @click="triggerFileInput(card.id)" title="Importar Fatura (CSV)" class="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/50 px-2 rounded hover:bg-purple-500 hover:text-white transition">
                    📂 Importar
                 </button>
                 <button @click="store.deleteItem('card', card.id)" class="text-danger opacity-0 group-hover:opacity-100 transition-opacity">x</button>
              </div>
            </div>
            <div class="flex justify-between text-gray-400 text-xs">
              <span>Base: {{ formatMoney(card.currentInvoice) }}</span>
              <span class="text-purple-300">Gastos: {{ formatMoney(store.transactions.filter(t => t.cardId === card.id).reduce((a,b)=>a+Number(b.value),0)) }}</span>
            </div>
          </div>
          <div v-if="store.cards.length === 0" class="text-xs text-gray-600 text-center py-2">Nenhum cartão</div>
        </div>

        <form @submit.prevent="submitCard" class="flex gap-2 mt-auto">
          <input v-model="newCard.name" placeholder="Nubank" class="input-glass w-full" required>
          <input v-model="newCard.currentInvoice" type="number" step="0.01" placeholder="Base 0" class="input-glass w-20">
          <button class="btn-primary">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-2 p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-orange-400 font-bold flex items-center gap-2"><span>🤝</span> A Receber</h3>
          <span class="text-sm font-mono text-orange-400">{{ formatMoney(store.totalReceivables) }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 max-h-48 overflow-y-auto custom-scroll">
           <div v-for="item in store.receivables" :key="item.id" class="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center hover:border-orange-400/30 transition-colors">
              <div>
                <div class="font-bold text-sm text-gray-200">{{ item.name }}</div>
                <div class="text-xs text-gray-400">{{ item.desc }}</div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="text-success font-mono font-bold">{{ formatMoney(item.value) }}</span>
                <button @click="store.deleteItem('receivable', item.id)" class="text-[10px] text-danger border border-danger/50 px-2 py-0.5 rounded hover:bg-danger hover:text-white transition-colors">Recebido</button>
              </div>
           </div>
        </div>
        <form @submit.prevent="submitReceivable" class="flex flex-col md:flex-row gap-2 items-end border-t border-glassBorder pt-4">
          <div class="flex-1 w-full space-y-2">
             <div class="flex gap-2">
                <input v-model="newReceivable.name" placeholder="Quem?" class="input-glass w-1/2" required>
                <input v-model="newReceivable.value" type="number" step="0.01" placeholder="R$ Valor" class="input-glass w-1/2" required>
             </div>
             <input v-model="newReceivable.desc" placeholder="Motivo" class="input-glass w-full text-xs">
          </div>
          <button class="btn-primary w-full md:w-auto px-6">Adicionar</button>
        </form>
      </div>

       <div class="glass-panel col-span-1 p-4 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-danger font-bold flex items-center gap-2"><span>📉</span> Fixos</h3>
          <span class="text-xs text-gray-400 font-mono">{{ formatMoney(store.totalFixed) }}</span>
        </div>
        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
          <div v-for="item in store.fixedExpenses" :key="item.id" class="flex justify-between text-sm border-b border-glassBorder pb-1 group">
            <span>{{ item.name }}</span>
            <div class="flex gap-2 items-center">
               <span class="font-mono text-gray-300">{{ formatMoney(item.value) }}</span>
               <button @click="store.deleteItem('fixed', item.id)" class="text-danger opacity-0 group-hover:opacity-100 transition-opacity">x</button>
            </div>
          </div>
        </div>
        <form @submit.prevent="submitExpense" class="flex gap-2 mt-auto">
          <input v-model="newExpense.name" placeholder="Nome" class="input-glass w-full" required>
          <input v-model="newExpense.value" type="number" step="0.01" placeholder="R$" class="input-glass w-24" required>
          <button class="btn-primary">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-3 lg:col-span-2 p-6 border border-neon/20 shadow-[0_0_15px_rgba(0,243,255,0.05)]">
        <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-neon animate-pulse shadow-[0_0_10px_#00f3ff]"></span>
          Registrar Gasto Manual
        </h3>
        <form @submit.prevent="submitTransaction" class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
          <div class="md:col-span-4"><input v-model="newTransaction.desc" placeholder="Ex: Almoço, Uber" class="input-glass w-full h-12" required></div>
          <div class="md:col-span-3"><input v-model="newTransaction.value" type="number" step="0.01" placeholder="Valor R$" class="input-glass w-full h-12 font-mono" required></div>
          <div class="md:col-span-3">
            <select v-model="newTransaction.type" class="input-glass w-full h-12 text-gray-300 cursor-pointer">
              <option value="debit">Débito / Pix</option>
              <option value="credit">Crédito</option>
            </select>
          </div>
          <div class="md:col-span-2"><button class="btn-primary w-full h-12 font-bold uppercase tracking-widest text-xs shadow-lg shadow-neon/20">Salvar</button></div>
          <div v-if="newTransaction.type === 'credit'" class="md:col-span-12 animate-fade-in">
             <label class="text-xs text-purple-400 ml-1 mb-1 block">Selecione o Cartão:</label>
             <select v-model="newTransaction.cardId" class="input-glass w-full text-purple-300 border-purple-500/30" required>
              <option :value="null" disabled>-- Escolha --</option>
              <option v-for="card in store.cards" :key="card.id" :value="card.id">{{ card.name }}</option>
            </select>
          </div>
        </form>
        <div class="border-t border-glassBorder pt-4">
          <h4 class="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Últimos Registros (Inclui Importados)</h4>
          <div class="flex flex-col gap-2">
            <div v-for="t in store.transactions.slice().reverse().slice(0, 4)" :key="t.id" class="flex justify-between items-center text-sm p-3 bg-glass rounded-lg border border-transparent hover:border-glassBorder transition-colors">
              <div class="flex items-center gap-3">
                 <span class="w-2 h-2 rounded-full" :class="t.type === 'credit' ? 'bg-purple-500' : 'bg-blue-500'"></span>
                 <div>
                    <span class="font-medium text-gray-200 block">{{ t.desc }}</span>
                    <span class="text-[10px] text-gray-500" v-if="t.date">{{ t.date }}</span>
                 </div>
              </div>
              <div class="flex items-center gap-3">
                 <span class="text-danger font-mono font-bold">- {{ formatMoney(t.value) }}</span>
                 <button @click="store.deleteItem('transaction', t.id)" class="text-gray-600 hover:text-danger text-xs px-2 py-1">x</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showImportModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div class="glass-panel p-6 w-full max-w-lg">
        <h3 class="mb-4 font-bold text-xl text-neon">Restaurar Backup</h3>
        <textarea v-model="importText" class="input-glass w-full h-48 text-xs font-mono mb-4 resize-none" placeholder='Cole o JSON aqui...'></textarea>
        <div class="flex justify-end gap-3">
          <button @click="showImportModal = false" class="px-4 py-2 rounded hover:bg-white/10 text-gray-300 text-sm">Cancelar</button>
          <button @click="handleImport" class="btn-primary text-sm px-6">Restaurar</button>
        </div>
      </div>
    </div>
  </div>
</template>
