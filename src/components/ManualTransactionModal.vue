<script setup>
import { ref, watch } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
const props = defineProps(['isDark', 'isOpen'])
const emit = defineEmits(['close'])

const store = useFinanceStore()
const getToday = () => new Date().toISOString().split('T')[0]
const form = ref({ 
    desc: '', 
    value: '', 
    type: 'debit', 
    cardId: null, 
    owner: 'Eu', 
    installments: '',
    date: getToday() // <--- Data Padrão: Hoje
})

// Limpa campos se trocar de Crédito para Débito
watch(() => form.value.type, (newType) => {
  if (newType === 'debit') {
    form.value.owner = 'Eu'; form.value.cardId = null; form.value.installments = ''
  }
})

const submit = () => {
  if(form.value.type === 'credit' && !form.value.cardId) {
    alert("Selecione um cartão"); return
  }
  // Envia a data escolhida para a store
  store.addTransaction({ ...form.value, value: Number(form.value.value) })
  
  // Reseta mantendo a data de hoje
  form.value = { desc: '', value: '', type: 'debit', cardId: null, owner: 'Eu', installments: '', date: getToday() }
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" 
       class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
     
     <div class="w-full max-w-lg p-8 relative animate-fade-in shadow-2xl"
          :class="isDark ? 'card-dark' : 'card-light'">
        
        <button @click="$emit('close')" 
                class="absolute top-4 right-4 text-2xl font-bold transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 hover:text-red-500"
                :class="isDark ? 'text-gray-500' : 'text-slate-400'">
          &times;
        </button>
        
        <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-3 tracking-wider"
            :class="isDark ? 'text-white' : 'text-indigo-900'">
           <span class="w-3 h-3 rounded-full" :class="isDark ? 'bg-neon shadow-[0_0_10px_#00f3ff]' : 'bg-indigo-600'"></span>
           Nova Transação
        </h3>

        <form @submit.prevent="submit" class="flex flex-col gap-5">
            
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Descrição</label>
                    <input v-model="form.desc" placeholder="Ex: Mercado" 
                           :class="isDark ? 'input-glass' : 'input-light'" required>
                </div>
                <div class="w-full md:w-36">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Valor (R$)</label>
                    <input v-model="form.value" type="number" step="0.01" placeholder="0,00" 
                           :class="isDark ? 'input-glass' : 'input-light'" class="font-mono text-lg" required>
                </div>
            </div>

            <div class="flex flex-col md:flex-row gap-4">
                 <div class="w-full md:w-1/3">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Data</label>
                    <input v-model="form.date" type="date" 
                           :class="isDark ? 'input-glass text-gray-300' : 'input-light text-slate-700'" required>
                </div>

                <div class="flex-1">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Tipo</label>
                    <select v-model="form.type" :class="isDark ? 'input-glass text-gray-200' : 'input-light text-slate-700'">
                        <option value="debit">💸 Débito / Pix</option>
                        <option value="credit">💳 Cartão de Crédito</option>
                    </select>
                </div>
            </div>

            <div v-if="form.type === 'credit'" class="w-full animate-fade-in">
                 <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Quem Gastou?</label>
                 <select v-model="form.owner" :class="isDark ? 'input-glass' : 'input-light'">
                     <option value="Eu">Fui Eu</option>
                     <option value="Mãe">Mãe</option>
                     <option value="Esposa">Esposa</option>
                     <option value="Outro">Outro</option>
                 </select>
            </div>

            <div v-if="form.type === 'credit'" class="p-4 rounded-xl border animate-fade-in flex flex-col gap-3"
                 :class="isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'">
                <p class="text-xs uppercase font-bold opacity-50">Detalhes do Crédito</p>
                <div class="flex gap-3">
                    <div class="flex-1">
                        <select v-model="form.cardId" 
                                :class="isDark ? 'input-glass border-purple-500/50 text-purple-300' : 'input-light border-purple-300 text-purple-700'" 
                                class="font-bold" required>
                            <option :value="null" disabled>Selecione o Cartão...</option>
                            <option v-for="card in store.cards" :key="card.id" :value="card.id">{{ card.name }}</option>
                        </select>
                    </div>
                    <div class="w-24">
                        <input v-model="form.installments" placeholder="Ex: 1/12" 
                               :class="isDark ? 'input-glass' : 'input-light'" class="text-center">
                    </div>
                </div>
            </div>
            
            <button class="btn-primary w-full mt-4 py-4 text-sm shadow-xl hover:scale-[1.02] transition-transform" 
                    :class="!isDark && 'light-mode-btn'">
                Confirmar Lançamento
            </button>
        </form>
     </div>
  </div>
</template>