<script setup>
import { ref, watch } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
const props = defineProps(['isOpen', 'isDark', 'item', 'type']) // item = objeto original, type = 'asset' ou 'fixed'
const emit = defineEmits(['close'])

const store = useFinanceStore()
const form = ref({ name: '', value: '' })

watch(() => props.item, (newVal) => {
    if (newVal) {
        form.value = { name: newVal.name, value: newVal.value }
    }
}, { immediate: true })

const save = () => {
    store.editItem(props.type, { id: props.item.id, ...form.value })
    emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
     <div class="w-full max-w-sm p-6 rounded-2xl shadow-2xl relative animate-fade-in"
          :class="isDark ? 'card-dark' : 'card-light'">
        
        <h3 class="font-bold mb-4 text-lg">Editar {{ type === 'asset' ? 'Entrada' : 'Despesa Fixa' }}</h3>
        
        <form @submit.prevent="save" class="flex flex-col gap-4">
            <div>
                <label class="text-xs opacity-70 font-bold ml-1">Nome</label>
                <input v-model="form.name" :class="isDark ? 'input-glass' : 'input-light'">
            </div>
            <div>
                <label class="text-xs opacity-70 font-bold ml-1">Valor</label>
                <input v-model="form.value" type="number" step="0.01" :class="isDark ? 'input-glass' : 'input-light'" class="font-mono text-lg">
            </div>
            
            <div class="flex gap-2 mt-2">
                <button type="button" @click="$emit('close')" class="btn-secondary flex-1 opacity-70">Cancelar</button>
                <button class="btn-primary flex-1">Salvar</button>
            </div>
        </form>
     </div>
  </div>
</template>