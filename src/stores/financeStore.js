import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useFinanceStore = defineStore('finance', () => {
  // --- STATE ---
  const assets = ref([])
  const cards = ref([])
  const fixedExpenses = ref([])
  const receivables = ref([])
  const transactions = ref([])
  
  const currentMonth = ref(new Date().toISOString().slice(0, 7))
  
  // Chave atual. Se mudamos isso antes, os dados ficaram na chave antiga.
  const STORAGE_KEY = 'finvue_v7_stable' 
  // Lista de chaves antigas que usamos hoje para tentar recuperar
  const OLD_KEYS = ['finvue_v6_final', 'finvue_v5_auto', 'finvue_v4_data', 'vue-fin-data-v2', 'vue-fin-data-v1']

  // --- PERSISTÊNCIA ROBUSTA ---
  const saveToStorage = () => {
    try {
      const data = {
        assets: assets.value,
        cards: cards.value,
        fixedExpenses: fixedExpenses.value,
        receivables: receivables.value,
        transactions: transactions.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      console.log('Dados salvos automaticamente em:', new Date().toLocaleTimeString())
    } catch (e) {
      console.error('ERRO AO SALVAR NO LOCALSTORAGE:', e)
      alert('Atenção: Erro ao salvar dados no navegador. Verifique o espaço em disco.')
    }
  }

  // Observa qualquer mudança profundamente
  watch([assets, cards, fixedExpenses, receivables, transactions], () => {
    saveToStorage()
  }, { deep: true })

  // --- INIT ---
  function init() {
    // 1. Tenta carregar da chave atual
    const data = localStorage.getItem(STORAGE_KEY)
    
    if (data) {
      loadData(data)
    } else {
      // 2. Se não achou, tenta recuperar automaticamente das chaves antigas (Resgate)
      console.warn("Nenhum dado na chave atual. Tentando recuperar de versões anteriores...")
      recoverOldData()
    }
  }

  // Função interna para processar o JSON e corrigir tipos
  const loadData = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString)
      const fix = (i) => ({ ...i, value: Number(i.value) || 0 })

      assets.value = (parsed.assets || []).map(fix)
      fixedExpenses.value = (parsed.fixedExpenses || []).map(fix)
      receivables.value = (parsed.receivables || []).map(fix)
      
      cards.value = (parsed.cards || []).map(c => ({
        ...c, currentInvoice: Number(c.currentInvoice) || 0
      }))
      
      transactions.value = (parsed.transactions || []).map(t => ({
        ...t, 
        value: Number(t.value) || 0,
        owner: t.owner || 'Eu',
        installments: t.installments || null,
        isPaid: t.isPaid || false
      }))
      console.log("Dados carregados com sucesso.")
    } catch (e) {
      console.error("Erro ao processar JSON:", e)
    }
  }

  // --- FUNÇÃO DE RESGATE DE DADOS PERDIDOS ---
  const recoverOldData = () => {
    for (const key of OLD_KEYS) {
      const oldData = localStorage.getItem(key)
      if (oldData) {
        console.log(`Dados encontrados na chave antiga: ${key}. Restaurando...`)
        loadData(oldData)
        alert(`Seus dados foram recuperados da versão antiga (${key})! Eles foram salvos na nova versão.`)
        saveToStorage() // Salva na nova chave imediatamente
        return // Para ao encontrar o primeiro backup válido
      }
    }
    console.log("Nenhum dado antigo encontrado.")
  }

  // --- ACTIONS ---
  const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

  const addAsset = (i) => assets.value.push({ ...i, value: Number(i.value), id: uid() })
  const addCard = (i) => cards.value.push({ ...i, id: uid(), currentInvoice: Number(i.currentInvoice)||0 })
  const addFixedExpense = (i) => fixedExpenses.value.push({ ...i, value: Number(i.value), id: uid() })
  const addReceivable = (i) => receivables.value.push({ ...i, value: Number(i.value), id: uid() })

  const addTransaction = (t) => {
    transactions.value.push({ 
      ...t, 
      value: Number(t.value),
      id: uid(), 
      date: t.date || new Date().toISOString().split('T')[0],
      installments: t.installments || null,
      owner: t.owner || 'Eu',
      isPaid: false
    })
  }

  const deleteItem = (type, id) => {
    if(type === 'asset') assets.value = assets.value.filter(i => i.id !== id)
    if(type === 'card') cards.value = cards.value.filter(i => i.id !== id)
    if(type === 'fixed') fixedExpenses.value = fixedExpenses.value.filter(i => i.id !== id)
    if(type === 'receivable') receivables.value = receivables.value.filter(i => i.id !== id)
    if(type === 'transaction') transactions.value = transactions.value.filter(i => i.id !== id)
  }

  const togglePaid = (id) => {
    const t = transactions.value.find(i => i.id === id)
    if (t) t.isPaid = !t.isPaid
  }

  // Importar Nubank
  const importNubankTransactions = (csvText, cardId) => {
    const lines = csvText.split('\n')
    let count = 0
    const startIndex = (lines[0].toLowerCase().includes('date')) ? 1 : 0

    lines.slice(startIndex).forEach((line) => {
      if (!line.trim()) return
      const parts = line.split(',')
      if (parts.length >= 3) {
        const date = parts[0]
        let amountStr = parts[parts.length - 1].trim()
        const title = parts.slice(1, parts.length - 1).join(',').replace(/"/g, '')
        const amount = parseFloat(amountStr)

        if (!isNaN(amount)) {
          addTransaction({
            desc: title, value: amount, type: 'credit', cardId, date, owner: 'Eu'
          })
          count++
        }
      }
    })
    return count
  }
  
  // --- EXPORTAR JSON (Backup Manual) ---
  const exportJSON = () => {
    try {
      const data = JSON.stringify({
         assets: assets.value, cards: cards.value, fixedExpenses: fixedExpenses.value,
         receivables: receivables.value, transactions: transactions.value
      }, null, 2)
      
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finvue_backup_${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a) // Necessário em alguns browsers
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error(e)
      alert("Erro ao gerar arquivo de backup.")
    }
  }

  // --- IMPORTAR JSON (Arquivo) ---
  const importJSONFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        loadData(e.target.result)
        saveToStorage() // Salva imediatamente
        alert('Backup restaurado com sucesso!')
      } catch (err) {
        alert('Arquivo inválido ou corrompido.')
      }
    }
    reader.readAsText(file)
  }

  // --- GETTERS ---
  const currentMonthTransactions = computed(() => transactions.value.filter(t => t.date.startsWith(currentMonth.value)))

  const cardDebtors = computed(() => {
    return transactions.value.filter(t => t.type === 'credit' && t.owner && t.owner !== 'Eu')
  })

  const totalReceivables = computed(() => {
    const manualTotal = receivables.value.reduce((acc, i) => acc + i.value, 0)
    const cardTotal = cardDebtors.value.reduce((acc, t) => acc + t.value, 0)
    return manualTotal + cardTotal
  })

  const totalAssets = computed(() => assets.value.reduce((acc, i) => acc + i.value, 0))
  const totalFixed = computed(() => fixedExpenses.value.reduce((acc, i) => acc + i.value, 0))

  const totalCards = computed(() => {
    let base = cards.value.reduce((acc, c) => acc + c.currentInvoice, 0)
    const creditTrans = currentMonthTransactions.value
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + t.value, 0)
    return base + creditTrans
  })

  const totalDebitSpent = computed(() => currentMonthTransactions.value
    .filter(t => t.type !== 'credit')
    .reduce((acc, t) => acc + t.value, 0)
  )

  const finalBalance = computed(() => {
    return (totalAssets.value + totalReceivables.value) - (totalFixed.value + totalCards.value + totalDebitSpent.value)
  })

  return { 
    assets, cards, fixedExpenses, receivables, transactions, currentMonth,
    init, addAsset, addCard, addFixedExpense, addReceivable, addTransaction, deleteItem, togglePaid,
    importNubankTransactions, exportJSON, importJSONFile, recoverOldData,
    totalAssets, totalReceivables, totalFixed, totalCards, totalDebitSpent, finalBalance,
    currentMonthTransactions, cardDebtors 
  }
})