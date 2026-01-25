import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useFinanceStore = defineStore('finance', () => {
  // --- STATE ---
  const assets = ref([]) // Dinheiro, Nubank, Salário
  const cards = ref([]) // Cartões de Crédito
  const fixedExpenses = ref([]) // Luz, Água, Internet
  const receivables = ref([]) // Pessoas que te devem (ex: usaram seu cartão)
  const transactions = ref([]) // Gastos do dia a dia

  // --- PERSISTENCE ---
  const STORAGE_KEY = 'vue-fin-data-v1'
  
  function init() {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      assets.value = parsed.assets || []
      cards.value = parsed.cards || []
      fixedExpenses.value = parsed.fixedExpenses || []
      receivables.value = parsed.receivables || []
      transactions.value = parsed.transactions || []
    }
  }

  // Salvar sempre que algo mudar
  watch([assets, cards, fixedExpenses, receivables, transactions], () => {
    const dump = {
      assets: assets.value,
      cards: cards.value,
      fixedExpenses: fixedExpenses.value,
      receivables: receivables.value,
      transactions: transactions.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dump))
  }, { deep: true })

  // --- ACTIONS ---
  const addAsset = (item) => assets.value.push({ ...item, id: Date.now() })
  const addCard = (item) => cards.value.push({ ...item, id: Date.now(), currentInvoice: 0 })
  const addFixedExpense = (item) => fixedExpenses.value.push({ ...item, id: Date.now() })
  const addReceivable = (item) => receivables.value.push({ ...item, id: Date.now() })
  
  const addTransaction = (t) => {
    transactions.value.push({ ...t, id: Date.now(), date: new Date().toISOString() })
    // Se for Crédito, impacta o cartão selecionado visualmente no cálculo
  }

  const deleteItem = (type, id) => {
    if(type === 'asset') assets.value = assets.value.filter(i => i.id !== id)
    if(type === 'card') cards.value = cards.value.filter(i => i.id !== id)
    if(type === 'fixed') fixedExpenses.value = fixedExpenses.value.filter(i => i.id !== id)
    if(type === 'receivable') receivables.value = receivables.value.filter(i => i.id !== id)
    if(type === 'transaction') transactions.value = transactions.value.filter(i => i.id !== id)
  }

  const importJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString)
      assets.value = parsed.assets
      cards.value = parsed.cards
      fixedExpenses.value = parsed.fixedExpenses
      receivables.value = parsed.receivables
      transactions.value = parsed.transactions
      alert('Dados importados com sucesso!')
    } catch (e) {
      alert('Erro ao importar JSON')
    }
  }

  const exportJSON = () => {
    const data = JSON.stringify({
      assets: assets.value,
      cards: cards.value,
      fixedExpenses: fixedExpenses.value,
      receivables: receivables.value,
      transactions: transactions.value
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financas-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  // --- GETTERS / COMPUTED ---
  
  // Total que você tem
  const totalAssets = computed(() => assets.value.reduce((acc, i) => acc + Number(i.value), 0))
  
  // Total que te devem
  const totalReceivables = computed(() => receivables.value.reduce((acc, i) => acc + Number(i.value), 0))

  // Gastos Fixos (Boletos)
  const totalFixed = computed(() => fixedExpenses.value.reduce((acc, i) => acc + Number(i.value), 0))

  // Fatura dos Cartões (Base + Transações no Crédito)
  const totalCards = computed(() => {
    // Soma faturas iniciais cadastradas
    let base = cards.value.reduce((acc, c) => acc + Number(c.currentInvoice || 0), 0)
    // Soma transações feitas no crédito
    const creditTransactions = transactions.value
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + Number(t.value), 0)
    return base + creditTransactions
  })

  // Transações Débito/Dinheiro (saem direto do saldo)
  const totalDebitSpent = computed(() => transactions.value
    .filter(t => t.type !== 'credit')
    .reduce((acc, t) => acc + Number(t.value), 0)
  )

  // O GRANDE TOTAL (Saldo Final)
  // Lógica: (O que tenho + O que vão me pagar) - (Contas Fixas + Faturas + Gastos Débito)
  const finalBalance = computed(() => {
    return (totalAssets.value + totalReceivables.value) - (totalFixed.value + totalCards.value + totalDebitSpent.value)
  })

  return { 
    assets, cards, fixedExpenses, receivables, transactions,
    init, addAsset, addCard, addFixedExpense, addReceivable, addTransaction, deleteItem,
    importJSON, exportJSON,
    totalAssets, totalReceivables, totalFixed, totalCards, totalDebitSpent, finalBalance
  }
})