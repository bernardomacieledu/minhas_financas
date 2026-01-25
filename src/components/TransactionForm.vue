<script setup>
import { ref, watch } from 'vue' // Importe o watch
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])

const store = useFinanceStore()
const form = ref({ desc: '', value: '', type: 'debit', cardId: null, owner: 'Eu', installments: '' })

// Monitora o tipo: Se mudar para Débito, força o dono ser "Eu"
watch(() => form.value.type, (newType) => {
  if (newType === 'debit') {
    form.value.owner = 'Eu'
    form.value.cardId = null
    form.value.installments = ''
  }
})

const submit = () => {
  if(form.value.type === 'credit' && !form.value.cardId) {
    alert("Selecione um cartão")
    return
  }
  store.addTransaction({ ...form.value, value: Number(form.value.value) })
  // Reseta o form
  form.value = { desc: '', value: '', type: 'debit', cardId: null, owner: 'Eu', installments: '' }
}
</script>

<template>
  <div class="glass-panel p-4 border" :class="isDark ? 'border-neon/20' : 'bg-white border-blue-200 shadow-md'">
     <h3 class="text-sm font-bold uppercase mb-3 opacity-70">Registro Manual Rápido</h3>
     <form @submit.prevent="submit" class="flex flex-col gap-3">
        <div class="flex gap-2">
            <input v-model="form.desc" placeholder="Descrição (Ex: Pizza)" :class="isDark ? 'input-glass' : 'input-light'" class="flex-1" required>
            <input v-model="form.value" type="number" step="0.01" placeholder="R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-24 md:w-32 font-mono" required>
        </div>

        <div class="flex gap-2">
            <select v-model="form.type" :class="isDark ? 'input-glass text-gray-300' : 'input-light text-slate-700'" class="w-1/3">
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
            </select>

            <select v-if="form.type === 'credit'" v-model="form.owner" 
                    :class="isDark ? 'input-glass' : 'input-light'" class="w-1/3 animate-fade-in">
                <option value="Eu">Fui Eu</option>
                <option value="Bruno">Bruno</option>
                <option value="Tiago">Tiago</option>
                <option value="Outro">Outro</option>
            </select>

            <input v-if="form.type === 'credit'" v-model="form.installments" placeholder="Parc." 
                   :class="isDark ? 'input-glass' : 'input-light'" class="w-1/3 text-center animate-fade-in">
        </div>
        
        <select v-if="form.type === 'credit'" v-model="form.cardId" 
                :class="isDark ? 'input-glass border-purple-500/50' : 'input-light border-purple-400'" class="w-full text-purple-400 font-bold animate-fade-in" required>
            <option :value="null" disabled>Selecione o Cartão...</option>
            <option v-for="card in store.cards" :key="card.id" :value="card.id">{{ card.name }}</option>
        </select>
        
        <button class="btn-primary w-full" :class="!isDark && 'light-mode-btn'">Lançar</button>
     </form>
  </div>
</template>