<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFinanceStore } from '../stores/financeStore'
defineProps(['isDark'])

const store = useFinanceStore()
const selectedCardId = ref(null)
const newCard = ref({ name: '', currentInvoice: '' })
const fileInput = ref(null)

onMounted(() => {
    if (store.cards.length > 0) selectedCardId.value = store.cards[0].id
})

const currentCard = computed(() => store.cards.find(c => c.id === selectedCardId.value))

const transactions = computed(() => {
    if (!selectedCardId.value) return []
    return store.transactions
        .filter(t => t.type === 'credit' && t.cardId === selectedCardId.value)
        .slice().reverse()
})

const cardTotal = computed(() => {
    if (!currentCard.value) return 0
    const base = Number(currentCard.value.currentInvoice || 0)
    const sum = transactions.value.reduce((acc, t) => acc + Number(t.value), 0)
    return base + sum
})

const addCard = () => {
    if (!newCard.value.name) return
    store.addCard({ ...newCard.value, currentInvoice: Number(newCard.value.currentInvoice || 0) })
    newCard.value = { name: '', currentInvoice: '' }
    setTimeout(() => selectedCardId.value = store.cards[store.cards.length - 1].id, 50)
}

const triggerFile = () => fileInput.value.click()

const handleFile = (e) => {
    const file = e.target.files[0]
    if (file && selectedCardId.value) {
        const reader = new FileReader()
        reader.onload = (ev) => {
            const count = store.importNubankTransactions(ev.target.result, selectedCardId.value)
            alert(`${count} itens importados!`)
            e.target.value = ''
        }
        reader.readAsText(file)
    }
}

const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const absFormat = (v) => format(Math.abs(v))
</script>

<template>
    <div class="flex flex-col md:flex-row h-full w-full overflow-hidden" :class="isDark ? 'card-dark' : 'card-light'">

        <input type="file" ref="fileInput" @change="handleFile" accept=".csv" class="hidden" />

        <div class="w-full md:w-1/4 border-r p-4 transition-colors flex flex-col h-full"
            :class="isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-slate-50/50'">

            <h3 class="font-bold mb-4 shrink-0" :class="isDark ? 'text-purple-400' : 'text-indigo-600'">Cartões</h3>

            <div class="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1 space-y-2 mb-2">
                <div v-for="card in store.cards" :key="card.id" @click="selectedCardId = card.id"
                    class="p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all border shrink-0"
                    :class="selectedCardId === card.id
                        ? (isDark ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-white border-indigo-500 text-indigo-700 shadow-sm')
                        : 'border-transparent opacity-70 hover:opacity-100 hover:bg-black/5'">
                    <span class="font-medium truncate">{{ card.name }}</span>
                    <button @click.stop="store.deleteItem('card', card.id)"
                        class="text-danger hover:text-red-600 px-2 font-bold">×</button>
                </div>
            </div>

            <div class="pt-4 border-t shrink-0" :class="isDark ? 'border-white/10' : 'border-slate-200'">
                <form @submit.prevent="addCard" class="flex gap-2 items-center">
                    <div class="flex-1">
                        <input v-model="newCard.name" placeholder="Novo Cartão"
                            :class="isDark ? 'input-glass' : 'input-light'" class="text-sm py-2 px-3 w-full">
                    </div>
                    <button class="btn-primary h-9 w-9 flex items-center justify-center p-0 text-lg rounded-lg"
                        :class="!isDark && 'light-mode-btn'">+</button>
                </form>
            </div>
        </div>

        <div class="flex-1 flex flex-col h-full min-w-0">
            <div v-if="currentCard" class="flex flex-col h-full overflow-hidden">

                <div class="flex justify-between items-start p-6 border-b shrink-0"
                    :class="isDark ? 'border-white/10' : 'border-slate-200'">
                    <div>
                        <h2 class="text-2xl font-bold tracking-tight truncate">{{ currentCard.name }}</h2>
                        <p class="text-sm opacity-60">Fatura Atual</p>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-3xl font-bold font-mono tracking-tighter"
                            :class="isDark ? 'text-purple-300' : 'text-indigo-700'">
                            {{ format(cardTotal) }}
                        </div>
                        <button @click="triggerFile"
                            class="text-xs mt-2 px-3 py-1.5 rounded border transition inline-flex items-center gap-2 font-medium"
                            :class="isDark ? 'border-purple-500/50 hover:bg-purple-500 hover:text-white text-purple-200'
                                : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300'">
                            📂 Importar CSV
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto custom-scroll min-h-0 relative bg-opacity-50">
                    <table class="w-full text-sm text-left relative">
                        <thead class="text-xs uppercase sticky top-0 z-20 font-bold border-b"
                            :class="isDark ? 'text-gray-500 bg-[#15161b] border-white/5' : 'text-slate-400 bg-slate-50 border-slate-200'">
                            <tr>
                                <th class="py-3 px-4 w-24">Data</th>
                                <th class="py-3">Descrição</th>
                                <th class="py-3 text-center w-24">Quem/Parc.</th>
                                <th class="py-3 text-right pr-4 w-32">Valor</th>
                                <th class="py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y" :class="isDark ? 'divide-white/5' : 'divide-slate-100'">
                            <tr v-for="t in transactions" :key="t.id" class="group transition hover:bg-opacity-50"
                                :class="isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'">

                                <td class="py-3 px-4 text-xs opacity-60 font-mono">{{ t.date.slice(5) }}</td>
                                <td class="py-3 font-medium truncate max-w-[150px] md:max-w-none">{{ t.desc }}</td>

                                <td class="py-3 text-center text-xs">
                                    <div v-if="t.installments"
                                        class="inline-block px-1.5 rounded bg-blue-500/20 text-blue-400 mx-1 mb-1 md:mb-0">
                                        {{ t.installments }}
                                    </div>
                                    <div v-if="t.owner && t.owner !== 'Eu'"
                                        class="inline-block px-1.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                                        {{ t.owner }}
                                    </div>
                                </td>

                                <td class="py-3 text-right font-mono font-bold pr-4">
                                    <span v-if="t.value < 0" class="text-emerald-500">+ {{ absFormat(t.value) }}</span>
                                    <span v-else class="text-rose-500">- {{ absFormat(t.value) }}</span>
                                </td>

                                <td class="py-3 text-right pr-2">
                                    <button @click="store.deleteItem('transaction', t.id)"
                                        class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-2">
                                        ×
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div v-if="transactions.length === 0"
                        class="flex flex-col items-center justify-center h-40 opacity-40">
                        <p>Nenhum lançamento.</p>
                    </div>
                </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-full opacity-40">
                <p>Selecione um cartão ao lado.</p>
            </div>
        </div>
    </div>
</template>