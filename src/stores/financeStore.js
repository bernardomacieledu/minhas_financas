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
  const STORAGE_KEY = 'vue-fin-data-v2' // Mudei a chave para v2 para evitar conflito antigo
  
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
      date: t.date || new Date().toISOString().split('T')[0] // Garante data YYYY-MM-DD
    })
  }

  // --- IMPORTAÇÃO NUBANK CORRIGIDA ---
  const importNubankTransactions = (csvText, cardId) => {
    const lines = csvText.split('\n')
    let count = 0
    
    // Pula cabeçalho se existir
    const hasHeader = lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('data')
    const startIndex = hasHeader ? 1 : 0

    lines.slice(startIndex).forEach((line) => {
      if (!line.trim()) return

      // Tenta separar por vírgula
      const parts = line.split(',')
      
      if (parts.length >= 3) {
        // Formato: date, title, amount
        const date = parts[0] 
        // Valor é o ultimo campo
        let amountStr = parts[parts.length - 1].trim()
        // Nome é o miolo
        const title = parts.slice(1, parts.length - 1).join(',').replace(/"/g, '')

        // Tratamento de valor: Nubank CSV usa ponto para decimal.
        const amount = parseFloat(amountStr)

        if (!isNaN(amount)) {
          // AQUI ESTÁ O SEGREDO:
          // Se o CSV traz positivo (gasto), adicionamos como positivo.
          // O sistema entende: Positivo no cartão = Aumento da Fatura.
          addTransaction({
            desc: title,
            value: amount, // Mantém positivo
            type: 'credit',
            cardId: cardId, // Vincula EXPLICITAMENTE a este cartão
            date: date
          })
          count++
        }
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

  const exportJSON = () => { /* Mantido igual */
    const data = JSON.stringify({
      assets: assets.value, cards: cards.value, fixedExpenses: fixedExpenses.value,
      receivables: receivables.value, transactions: transactions.value
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financas-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const importJSON = (jsonString) => { /* Mantido igual */
    try {
      const parsed = JSON.parse(jsonString)
      assets.value = parsed.assets || []
      cards.value = parsed.cards || []
      fixedExpenses.value = parsed.fixedExpenses || []
      receivables.value = parsed.receivables || []
      transactions.value = parsed.transactions || []
      alert('Dados restaurados.')
    } catch (e) { alert('Erro no JSON') }
  }

  // --- GETTERS ---
  const totalAssets = computed(() => assets.value.reduce((acc, i) => acc + Number(i.value), 0))
  const totalReceivables = computed(() => receivables.value.reduce((acc, i) => acc + Number(i.value), 0))
  const totalFixed = computed(() => fixedExpenses.value.reduce((acc, i) => acc + Number(i.value), 0))

  // Total de Faturas (Base + Transações de Crédito)
  const totalCards = computed(() => {
    let base = cards.value.reduce((acc, c) => acc + Number(c.currentInvoice || 0), 0)
    // Soma todas as transações do tipo crédito
    const creditTransactions = transactions.value
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + Number(t.value), 0)
    return base + creditTransactions
  })

  // Gastos Débito (Saem direto da conta)
  const totalDebitSpent = computed(() => transactions.value
    .filter(t => t.type !== 'credit')
    .reduce((acc, t) => acc + Number(t.value), 0)
  )

  // Saldo Final
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
