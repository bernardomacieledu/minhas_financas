<script setup>
import { ref } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])
const emit = defineEmits(['edit']) // Importante para o botão editar funcionar

const store = useFinanceStore()
const newItem = ref({ name: '', value: '' })

const add = () => {
  store.addAsset({ ...newItem.value, value: Number(newItem.value.value) })
  newItem.value = { name: '', value: '' }
}
const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
</script>

<template>
  <div class="glass-panel p-4 flex flex-col h-full" :class="!isDark && 'bg-white/70 shadow-lg'">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold flex items-center gap-2" :class="isDark ? 'text-neon' : 'text-blue-600'">
        <span>💰</span> Entradas
      </h3>
      <span class="text-xs font-mono">{{ format(store.totalAssets) }}</span>
    </div>

    <div class="space-y-2 mb-4 flex-1 overflow-y-auto custom-scroll max-h-40">
      <div v-for="item in store.monthlyAssets" :key="item.id" class="flex justify-between text-sm border-b pb-1 group"
           :class="isDark ? 'border-glassBorder' : 'border-slate-200'">
        <span>{{ item.name }}</span>
        
        <div class="flex gap-2 items-center">
           <span class="font-mono opacity-90" :class="{ 'privacy-blur': store.privacyMode }">{{ format(item.value) }}</span>
           
           <button @click="emit('edit', item)" class="text-blue-400 opacity-0 group-hover:opacity-100 px-1 text-xs" title="Editar">✎</button>
           
           <button @click="store.deleteItem('asset', item.id)" class="text-danger opacity-0 group-hover:opacity-100 px-1" title="Excluir">x</button>
        </div>
      </div>
    </div>

    <form @submit.prevent="add" class="flex gap-2 mt-auto">
      <input v-model="newItem.name" placeholder="Ex: Salário" :class="isDark ? 'input-glass' : 'input-light'" class="w-full" required>
      <input v-model="newItem.value" type="number" step="0.01" placeholder="R$" :class="isDark ? 'input-glass' : 'input-light'" class="w-24" required>
      <button class="btn-primary" :class="!isDark && '!bg-blue-600 !text-white'">+</button>
    </form>
  </div>
</template>