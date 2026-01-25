import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useFinanceStore = defineStore('finance', () => {
  // --- STATE ---
  const assets = ref([]) 
  const cards = ref([]) 
  const fixedExpenses = ref([]) 
  const receivables = ref([]) 
  const transactions = ref([]) 

  // --- PERSISTENCE ---
  const STORAGE_KEY = 'vue-fin-data-v1'
  
  function init() {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      try {
        const parsed = JSON.parse(data)
        assets.value = parsed.assets || []
        cards.value = parsed.cards || []
        fixedExpenses.value = parsed.fixedExpenses || []
        receivables.value = parsed.receivables || []
        transactions.value = parsed.transactions || []
      } catch (e) {
        console.error("Erro ao carregar dados", e)
      }
    }
  }

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
  const addAsset = (item) => assets.value.push({ ...item, id: Date.now() + Math.random() })
  const addCard = (item) => cards.value.push({ ...item, id: Date.now() + Math.random(), currentInvoice: item.currentInvoice || 0 })
  const addFixedExpense = (item) => fixedExpenses.value.push({ ...item, id: Date.now() + Math.random() })
  const addReceivable = (item) => receivables.value.push({ ...item, id: Date.now() + Math.random() })
  
  const addTransaction = (t) => {
    transactions.value.push({ 
      ...t, 
      id: Date.now() + Math.random(), 
      date: t.date || new Date().toISOString() 
    })
  }

  // --- NOVA LÓGICA DE IMPORTAÇÃO NUBANK ---
  const importNubankTransactions = (csvText, cardId) => {
    const lines = csvText.split('\n')
    let count = 0
    
    // Tenta identificar se tem cabeçalho (se a primeira linha tiver 'date' ou 'data')
    const hasHeader = lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('data')
    const startIndex = hasHeader ? 1 : 0

    lines.slice(startIndex).forEach((line) => {
      if (!line.trim()) return

      // Formato esperado: date, title, amount
      // Ex: 2026-01-25,Undrbarltda,16
      const parts = line.split(',')
      
      // Proteção básica contra linhas inválidas
      if (parts.length < 3) return

      const date = parts[0]
      // O valor é sempre a última coluna
      const amountStr = parts[parts.length - 1]
      // A descrição é tudo que está entre a data e o valor (caso tenha virgulas no nome)
      const title = parts.slice(1, parts.length - 1).join(',')

      const amount = parseFloat(amountStr)

      if (!isNaN(amount)) {
        addTransaction({
          desc: title,
          value: amount,
          type: 'credit',
          cardId: cardId,
          date: date // Usa a data do CSV
        })
        count++
      }
    })
    return count
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
      assets.value = parsed.assets || []
      cards.value = parsed.cards || []
      fixedExpenses.value = parsed.fixedExpenses || []
      receivables.value = parsed.receivables || []
      transactions.value = parsed.transactions || []
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

  // --- GETTERS ---
  const totalAssets = computed(() => assets.value.reduce((acc, i) => acc + Number(i.value), 0))
  const totalReceivables = computed(() => receivables.value.reduce((acc, i) => acc + Number(i.value), 0))
  const totalFixed = computed(() => fixedExpenses.value.reduce((acc, i) => acc + Number(i.value), 0))

  const totalCards = computed(() => {
    let base = cards.value.reduce((acc, c) => acc + Number(c.currentInvoice || 0), 0)
    const creditTransactions = transactions.value
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + Number(t.value), 0)
    return base + creditTransactions
  })

  const totalDebitSpent = computed(() => transactions.value
    .filter(t => t.type !== 'credit')
    .reduce((acc, t) => acc + Number(t.value), 0)
  )

  const finalBalance = computed(() => {
    return (totalAssets.value + totalReceivables.value) - (totalFixed.value + totalCards.value + totalDebitSpent.value)
  })

  return { 
    assets, cards, fixedExpenses, receivables, transactions,
    init, addAsset, addCard, addFixedExpense, addReceivable, addTransaction, deleteItem,
    importJSON, exportJSON, importNubankTransactions,
    totalAssets, totalReceivables, totalFixed, totalCards, totalDebitSpent, finalBalance
  }
})
