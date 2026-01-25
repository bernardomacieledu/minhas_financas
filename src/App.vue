<script setup>
import { onMounted, ref, computed } from 'vue'
import { useFinanceStore } from './stores/financeStore'

const store = useFinanceStore()
const showImportModal = ref(false)
const importText = ref('')
const fileInput = ref(null)

// TEMA (Dark por padrão)
const isDark = ref(true)
const toggleTheme = () => isDark.value = !isDark.value

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

// Helpers para exibição absoluta (sem sinal negativo duplo)
const absMoney = (value) => formatMoney(Math.abs(value))

// --- UPLOAD CSV ---
const triggerFileInput = (cardId) => {
  fileInput.value.dataset.cardId = cardId
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  const cardId = Number(event.target.dataset.cardId)
  if (file && cardId) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const count = store.importNubankTransactions(e.target.result, cardId)
      alert(`${count} transações processadas! Valores negativos foram abatidos da fatura.`)
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

// --- SUBMITS ---
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
  // Se for gasto normal (positivo), entra como positivo.
  // Se o usuário digitar negativo, entra como negativo (estorno).
  store.addTransaction({ ...newTransaction.value, value: Number(newTransaction.value.value) })
  newTransaction.value = { desc: '', value: '', type: 'debit', cardId: null }
}
</script>

<template>
  <div class="min-h-screen font-sans transition-colors duration-500 p-4 md:p-8"
       :class="isDark ? 'bg-gray-900 text-white selection:bg-neon selection:text-black' : 'bg-slate-100 text-slate-800 selection:bg-blue-400 selection:text-white'">
    
    <input type="file" ref="fileInput" @change="handleFileUpload" accept=".csv" class="hidden" />

    <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div class="flex items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r"
              :class="isDark ? 'from-neon to-purple-500' : 'from-blue-600 to-purple-600'">
            FinVue Control
          </h1>
          <p class="text-sm" :class="isDark ? 'text-gray-400' : 'text-slate-500'">Dashboard Financeiro Inteligente</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button @click="toggleTheme" class="p-2 rounded-full transition-all duration-300" 
                :class="isDark ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'">
          <span v-if="isDark">☀️ Claro</span>
          <span v-else>🌙 Escuro</span>
        </button>

        <button @click="store.exportJSON" class="btn-secondary" :class="!isDark && '!border-slate-300 !text-slate-600 hover:!bg-slate-200'">
          Backup
        </button>
        <button @click="showImportModal = true" class="btn-secondary" :class="!isDark && '!border-slate-300 !text-slate-600 hover:!bg-slate-200'">
          Restaurar
        </button>
      </div>
    </header>

    <main class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

      <div class="glass-panel col-span-1 md:col-span-3 lg:col-span-2 flex flex-col justify-center items-start p-8 relative overflow-hidden group transition-all duration-500"
           :class="isDark ? 'border-white/5' : 'bg-white/70 border-white shadow-xl shadow-blue-100'">
        
        <div class="absolute -right-10 -top-10 w-40 h-40 blur-[100px] opacity-20 group-hover:opacity-40 transition duration-700"
             :class="isDark ? 'bg-neon' : 'bg-blue-500'"></div>
        
        <h2 class="font-medium mb-2" :class="isDark ? 'text-gray-400' : 'text-slate-500'">Previsão de Sobra Mensal</h2>
        <div class="text-4xl md:text-6xl font-bold tracking-tighter transition-colors"
             :class="store.finalBalance >= 0 ? 'text-success' : 'text-danger'">
          {{ formatMoney(store.finalBalance) }}
        </div>
        <p class="text-xs mt-2" :class="isDark ? 'text-gray-500' : 'text-slate-400'">
          (Ativos + Recebíveis) - (Fixos + Faturas + Débito)
        </p>
      </div>

      <div class="glass-panel col-span-1 md:col-span-1 p-4 flex flex-col"
           :class="!isDark && 'bg-white/70 border-white shadow-lg'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold flex items-center gap-2" :class="isDark ? 'text-neon' : 'text-blue-600'"><span>💰</span> Ativos</h3>
          <span class="text-xs font-mono" :class="isDark ? 'text-gray-400' : 'text-slate-500'">{{ formatMoney(store.totalAssets) }}</span>
        </div>
        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
          <div v-for="item in store.assets" :key="item.id" class="flex justify-between text-sm border-b pb-1 group"
               :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
            <span>{{ item.name }}</span>
            <div class="flex gap-2 items-center">
               <span class="font-mono" :class="isDark ? 'text-gray-300' : 'text-slate-700'">{{ formatMoney(item.value) }}</span>
               <button @click="store.deleteItem('asset', item.id)" class="text-danger opacity-0 group-hover:opacity-100 transition-opacity">x</button>
            </div>
          </div>
        </div>
        <form @submit.prevent="submitAsset" class="flex gap-2 mt-auto">
          <input v-model="newAsset.name" placeholder="Ex: Salário" :class="isDark ? 'input-glass' : 'input-light'" class="w-full" required>
          <input v-model="newAsset.value" type="number" step="0.01" placeholder="R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-24" required>
          <button class="btn-primary" :class="!isDark && '!bg-blue-600 !text-white hover:!bg-blue-700'">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-1 p-4 flex flex-col"
           :class="!isDark && 'bg-white/70 border-white shadow-lg'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold flex items-center gap-2" :class="isDark ? 'text-purple-400' : 'text-purple-600'"><span>💳</span> Cartões</h3>
          <span class="text-xs font-mono" :class="isDark ? 'text-gray-400' : 'text-slate-500'">{{ formatMoney(store.totalCards) }}</span>
        </div>

        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
          <div v-for="card in store.cards" :key="card.id" class="text-sm border-b pb-2 group"
               :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
            <div class="flex justify-between items-center mb-1">
              <span class="font-semibold">{{ card.name }}</span>
              <div class="flex gap-2">
                 <button @click="triggerFileInput(card.id)" title="Importar CSV" 
                         class="text-[10px] px-2 rounded transition border"
                         :class="isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500 hover:text-white' : 'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white'">
                    📂 CSV
                 </button>
                 <button @click="store.deleteItem('card', card.id)" class="text-danger opacity-0 group-hover:opacity-100 transition-opacity">x</button>
              </div>
            </div>
            <div class="flex justify-between text-xs" :class="isDark ? 'text-gray-400' : 'text-slate-500'">
              <span>Base: {{ formatMoney(card.currentInvoice) }}</span>
              <span :class="isDark ? 'text-purple-300' : 'text-purple-700'">
                Gastos: {{ formatMoney(store.transactions.filter(t => t.cardId === card.id).reduce((a,b)=>a+Number(b.value),0)) }}
              </span>
            </div>
          </div>
        </div>

        <form @submit.prevent="submitCard" class="flex gap-2 mt-auto">
          <input v-model="newCard.name" placeholder="Nubank" :class="isDark ? 'input-glass' : 'input-light'" class="w-full" required>
          <input v-model="newCard.currentInvoice" type="number" step="0.01" placeholder="Base 0" :class="isDark ? 'input-glass' : 'input-light'" class="w-20">
          <button class="btn-primary" :class="!isDark && '!bg-blue-600 !text-white hover:!bg-blue-700'">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-2 p-4"
           :class="!isDark && 'bg-white/70 border-white shadow-lg'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold flex items-center gap-2" :class="isDark ? 'text-orange-400' : 'text-orange-600'"><span>🤝</span> A Receber</h3>
          <span class="text-sm font-mono" :class="isDark ? 'text-orange-400' : 'text-orange-600'">{{ formatMoney(store.totalReceivables) }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 max-h-48 overflow-y-auto custom-scroll">
           <div v-for="item in store.receivables" :key="item.id" class="p-3 rounded-lg border flex justify-between items-center transition-colors"
                :class="isDark ? 'bg-white/5 border-white/5 hover:border-orange-400/30' : 'bg-slate-50 border-slate-200 hover:border-orange-400'">
              <div>
                <div class="font-bold text-sm" :class="isDark ? 'text-gray-200' : 'text-slate-800'">{{ item.name }}</div>
                <div class="text-xs" :class="isDark ? 'text-gray-400' : 'text-slate-500'">{{ item.desc }}</div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="text-success font-mono font-bold">{{ formatMoney(item.value) }}</span>
                <button @click="store.deleteItem('receivable', item.id)" class="text-[10px] text-danger border border-danger/50 px-2 py-0.5 rounded hover:bg-danger hover:text-white transition-colors">Recebido</button>
              </div>
           </div>
        </div>
        <form @submit.prevent="submitReceivable" class="flex flex-col md:flex-row gap-2 items-end border-t pt-4"
              :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
          <div class="flex-1 w-full space-y-2">
             <div class="flex gap-2">
                <input v-model="newReceivable.name" placeholder="Quem?" :class="isDark ? 'input-glass' : 'input-light'" class="w-1/2" required>
                <input v-model="newReceivable.value" type="number" step="0.01" placeholder="R$ Valor" :class="isDark ? 'input-glass' : 'input-light'" class="w-1/2" required>
             </div>
             <input v-model="newReceivable.desc" placeholder="Motivo" :class="isDark ? 'input-glass' : 'input-light'" class="w-full text-xs">
          </div>
          <button class="btn-primary w-full md:w-auto px-6" :class="!isDark && '!bg-blue-600 !text-white hover:!bg-blue-700'">Adicionar</button>
        </form>
      </div>

       <div class="glass-panel col-span-1 p-4 flex flex-col"
            :class="!isDark && 'bg-white/70 border-white shadow-lg'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold flex items-center gap-2 text-danger"><span>📉</span> Fixos</h3>
          <span class="text-xs font-mono" :class="isDark ? 'text-gray-400' : 'text-slate-500'">{{ formatMoney(store.totalFixed) }}</span>
        </div>
        <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
          <div v-for="item in store.fixedExpenses" :key="item.id" class="flex justify-between text-sm border-b pb-1 group"
               :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
            <span>{{ item.name }}</span>
            <div class="flex gap-2 items-center">
               <span class="font-mono" :class="isDark ? 'text-gray-300' : 'text-slate-700'">{{ formatMoney(item.value) }}</span>
               <button @click="store.deleteItem('fixed', item.id)" class="text-danger opacity-0 group-hover:opacity-100 transition-opacity">x</button>
            </div>
          </div>
        </div>
        <form @submit.prevent="submitExpense" class="flex gap-2 mt-auto">
          <input v-model="newExpense.name" placeholder="Nome" :class="isDark ? 'input-glass' : 'input-light'" class="w-full" required>
          <input v-model="newExpense.value" type="number" step="0.01" placeholder="R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-24" required>
          <button class="btn-primary" :class="!isDark && '!bg-blue-600 !text-white hover:!bg-blue-700'">+</button>
        </form>
      </div>

      <div class="glass-panel col-span-1 md:col-span-3 lg:col-span-2 p-6 border shadow-[0_0_15px_rgba(0,0,0,0.05)]"
           :class="isDark ? 'border-neon/20 shadow-neon/5' : 'bg-white border-blue-200 shadow-xl'">
        <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px]"
                :class="isDark ? 'bg-neon shadow-neon' : 'bg-blue-500 shadow-blue-500'"></span>
          Registrar / Histórico
        </h3>
        <form @submit.prevent="submitTransaction" class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
          <div class="md:col-span-4"><input v-model="newTransaction.desc" placeholder="Desc: Almoço, Uber" :class="isDark ? 'input-glass' : 'input-light'" class="w-full h-12" required></div>
          <div class="md:col-span-3"><input v-model="newTransaction.value" type="number" step="0.01" placeholder="Valor R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-full h-12 font-mono" required></div>
          <div class="md:col-span-3">
            <select v-model="newTransaction.type" :class="isDark ? 'input-glass text-gray-300' : 'input-light text-slate-700'" class="w-full h-12 cursor-pointer">
              <option value="debit">Débito / Pix</option>
              <option value="credit">Crédito</option>
            </select>
          </div>
          <div class="md:col-span-2"><button class="btn-primary w-full h-12 font-bold uppercase tracking-widest text-xs" :class="!isDark && '!bg-blue-600 !text-white hover:!bg-blue-700'">Salvar</button></div>
          <div v-if="newTransaction.type === 'credit'" class="md:col-span-12 animate-fade-in">
             <label class="text-xs ml-1 mb-1 block" :class="isDark ? 'text-purple-400' : 'text-purple-600'">Selecione o Cartão:</label>
             <select v-model="newTransaction.cardId" :class="isDark ? 'input-glass text-purple-300 border-purple-500/30' : 'input-light text-purple-700 border-purple-300'" class="w-full" required>
              <option :value="null" disabled>-- Escolha --</option>
              <option v-for="card in store.cards" :key="card.id" :value="card.id">{{ card.name }}</option>
            </select>
          </div>
        </form>

        <div class="border-t pt-4" :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
          <h4 class="text-[10px] uppercase font-bold mb-3 tracking-widest" :class="isDark ? 'text-gray-500' : 'text-slate-400'">Últimos Registros</h4>
          <div class="flex flex-col gap-2">
            <div v-for="t in store.transactions.slice().reverse().slice(0, 5)" :key="t.id" class="flex justify-between items-center text-sm p-3 rounded-lg border border-transparent transition-colors"
                 :class="isDark ? 'bg-glass hover:border-glassBorder' : 'bg-slate-50 hover:border-slate-300'">
              
              <div class="flex items-center gap-3">
                 <span class="w-2 h-2 rounded-full" :class="t.type === 'credit' ? 'bg-purple-500' : 'bg-blue-500'"></span>
                 <div>
                    <span class="font-medium block" :class="isDark ? 'text-gray-200' : 'text-slate-800'">{{ t.desc }}</span>
                    <span class="text-[10px]" :class="isDark ? 'text-gray-500' : 'text-slate-500'" v-if="t.date">{{ t.date }}</span>
                 </div>
              </div>

              <div class="flex items-center gap-3">
                 <span v-if="t.value < 0" class="text-success font-mono font-bold">
                   + {{ absMoney(t.value) }}
                 </span>
                 <span v-else class="text-danger font-mono font-bold">
                   - {{ absMoney(t.value) }}
                 </span>

                 <button @click="store.deleteItem('transaction', t.id)" class="text-gray-400 hover:text-danger text-xs px-2 py-1">x</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showImportModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div class="p-6 w-full max-w-lg rounded-xl shadow-2xl" :class="isDark ? 'glass-panel' : 'bg-white text-slate-800'">
        <h3 class="mb-4 font-bold text-xl" :class="isDark ? 'text-neon' : 'text-blue-600'">Restaurar Backup</h3>
        <textarea v-model="importText" class="w-full h-48 text-xs font-mono mb-4 resize-none border rounded p-2 outline-none" 
                  :class="isDark ? 'input-glass' : 'bg-slate-50 border-slate-300'" placeholder='Cole o JSON aqui...'></textarea>
        <div class="flex justify-end gap-3">
          <button @click="showImportModal = false" class="px-4 py-2 rounded text-sm transition" :class="isDark ? 'text-gray-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'">Cancelar</button>
          <button @click="handleImport" class="btn-primary text-sm px-6" :class="!isDark && '!bg-blue-600 !text-white'">Restaurar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* CLASSE INPUT LIGHT - Novo estilo para o tema claro */
.input-light {
  background: #f1f5f9; /* Slate-100 */
  border: 1px solid #cbd5e1; /* Slate-300 */
  color: #1e293b; /* Slate-800 */
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  outline: none;
  transition: all 0.3s;
  font-size: 0.9rem;
}
.input-light:focus {
  border-color: #2563eb; /* Blue-600 */
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Mantendo os estilos Glass originais */
.glass-panel {
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  transition: border-color 0.3s ease, background 0.3s, color 0.3s;
}

.input-glass {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  outline: none;
  transition: all 0.3s;
  font-size: 0.9rem;
}
.input-glass:focus {
  border-color: #00f3ff;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.1);
}

.btn-primary {
  background: #00f3ff;
  color: #0a0a0a;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  transition: all 0.3s;
  border: none;
  cursor: pointer;
}
.btn-primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}
</style>
