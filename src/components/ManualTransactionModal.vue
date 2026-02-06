<script setup>
import { ref, watch, computed } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
const props = defineProps(['isDark', 'isOpen', 'editingItem']) // Recebe item para editar
const emit = defineEmits(['close'])

const store = useFinanceStore()
const getToday = () => new Date().toISOString().split('T')[0]

// Form inicial
const form = ref({ 
    desc: '', value: '', type: 'credit', cardId: null, owner: 'Eu', installments: '', date: getToday()
})

// Se estiver editando, preenche o form
watch(() => props.editingItem, (item) => {
    if (item) {
        form.value = {
            desc: item.desc,
            value: item.value,
            type: 'credit', // Força crédito pois removemos débito da UI principal
            cardId: item.cardId,
            owner: item.owner,
            installments: item.installments,
            date: item.date
        }
    } else {
        // Reset para novo
        form.value = { desc: '', value: '', type: 'credit', cardId: null, owner: 'Eu', installments: '', date: getToday() }
    }
}, { immediate: true })

const submit = () => {
  if(!form.value.cardId) { alert("Selecione um cartão"); return }
  
  const payload = { ...form.value, value: Number(form.value.value) }

  if (props.editingItem) {
      // EDITA
      store.editItem('transaction', { id: props.editingItem.id, ...payload })
  } else {
      // CRIA
      store.addTransaction(payload)
  }
  
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
                :class="isDark ? 'text-gray-500' : 'text-slate-400'">&times;</button>
        
        <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-3 tracking-wider"
            :class="isDark ? 'text-white' : 'text-indigo-900'">
           <span class="w-3 h-3 rounded-full" :class="isDark ? 'bg-neon shadow-[0_0_10px_#00f3ff]' : 'bg-indigo-600'"></span>
           {{ editingItem ? 'Editar Transação' : 'Nova Transação' }}
        </h3>

        <form @submit.prevent="submit" class="flex flex-col gap-5">
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Descrição</label>
                    <input v-model="form.desc" placeholder="Ex: Mercado" :class="isDark ? 'input-glass' : 'input-light'" required>
                </div>
                <div class="w-full md:w-36">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Valor (R$)</label>
                    <input v-model="form.value" type="number" step="0.01" :class="isDark ? 'input-glass' : 'input-light'" class="font-mono text-lg" required>
                </div>
            </div>

            <div class="flex flex-col md:flex-row gap-4">
                 <div class="w-full md:w-1/2">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Data</label>
                    <input v-model="form.date" type="date" :class="isDark ? 'input-glass text-gray-300' : 'input-light text-slate-700'" required>
                </div>

                <div class="w-full md:w-1/2">
                    <label class="block text-xs font-bold mb-1 opacity-70 ml-1">Quem Gastou?</label>
                    <select v-model="form.owner" :class="isDark ? 'input-glass' : 'input-light'">
                        <option value="Eu">Fui Eu</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Esposa">Esposa</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>

            <div class="p-4 rounded-xl border animate-fade-in flex flex-col gap-3"
                 :class="isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'">
                <p class="text-xs uppercase font-bold opacity-50">Detalhes do Crédito</p>
                <div class="flex gap-3">
                    <div class="flex-1">
                        <select v-model="form.cardId" 
                                :class="isDark ? 'input-glass border-purple-500/50 text-purple-300' : 'input-light border-purple-300 text-purple-700'" class="font-bold" required>
                            <option :value="null" disabled>Selecione o Cartão...</option>
                            <option v-for="card in store.cards" :key="card.id" :value="card.id">{{ card.name }}</option>
                        </select>
                    </div>
                    <div class="w-24">
                        <input v-model="form.installments" placeholder="Ex: 1/12" :class="isDark ? 'input-glass' : 'input-light'" class="text-center">
                    </div>
                </div>
            </div>
            
            <button class="btn-primary w-full mt-4 py-4 text-sm shadow-xl hover:scale-[1.02] transition-transform" :class="!isDark && 'light-mode-btn'">
                {{ editingItem ? 'Salvar Alterações' : 'Confirmar Lançamento' }}
            </button>
        </form>
     </div>
  </div>
</template>