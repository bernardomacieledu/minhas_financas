import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useFinanceStore = defineStore('finance', () => {
  // --- STATE ---
  const assets = ref([])
  const cards = ref([])
  const fixedExpenses = ref([])
  const receivables = ref([])
  const transactions = ref([])
  
  const currentMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM
  
  // Chaves de armazenamento
  const STORAGE_KEY = 'finvue_v8_monthly' // Chave Nova
  const OLD_KEYS = ['finvue_v7_stable', 'finvue_v6_final', 'finvue_v5_auto', 'vue-fin-data-v1'] // Chaves Antigas

  // --- INIT (Com Resgate Automático) ---
  function init() {
    const data = localStorage.getItem(STORAGE_KEY)
    
    if (data) {
      // Cenário 1: Já existe dados na versão nova
      loadData(data)
    } else {
      // Cenário 2: Versão nova vazia -> TENTA RESGATAR DA ANTIGA
      console.log("Iniciando migração de dados antigos...")
      migrateOldData()
    }
  }

  // Função que carrega o JSON na memória
  const loadData = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString)
      const fix = (i) => ({ ...i, value: Number(i.value) || 0 })
      
      assets.value = (parsed.assets || []).map(fix)
      // Garante que o Invoice seja número
      cards.value = (parsed.cards || []).map(c => ({...c, currentInvoice: Number(c.currentInvoice)||0}))
      fixedExpenses.value = (parsed.fixedExpenses || []).map(fix)
      receivables.value = (parsed.receivables || []).map(fix)
      transactions.value = (parsed.transactions || []).map(t => ({
        ...t, 
        value: Number(t.value) || 0,
        owner: t.owner || 'Eu',
        installments: t.installments || null,
        isPaid: t.isPaid || false
      }))
    } catch (e) { console.error("Erro ao carregar:", e) }
  }

  // --- MÁGICA DE MIGRAÇÃO ---
  const migrateOldData = () => {
    let foundData = false
    
    // Procura em todas as chaves antigas
    for (const key of OLD_KEYS) {
      const oldRaw = localStorage.getItem(key)
      if (oldRaw) {
        console.log(`Dados encontrados na chave: ${key}. Migrando...`)
        try {
          const parsed = JSON.parse(oldRaw)
          const fixValue = (i) => Number(i.value) || 0
          
          // 1. Migrar Assets (Adiciona o mês atual para aparecerem agora)
          assets.value = (parsed.assets || []).map(i => ({
            ...i, value: fixValue(i), month: currentMonth.value, id: i.id || uid()
          }))

          // 2. Migrar Fixos (Adiciona o mês atual)
          fixedExpenses.value = (parsed.fixedExpenses || []).map(i => ({
            ...i, value: fixValue(i), month: currentMonth.value, id: i.id || uid()
          }))

          // 3. Migrar Recebíveis
          receivables.value = (parsed.receivables || []).map(i => ({
            ...i, value: fixValue(i), month: currentMonth.value, id: i.id || uid()
          }))

          // 4. Migrar Cartões (São globais, apenas copia)
          cards.value = (parsed.cards || []).map(c => ({
             ...c, currentInvoice: Number(c.currentInvoice) || 0, id: c.id || uid()
          }))

          // 5. Migrar Transações (Se não tiver data, coloca hoje)
          transactions.value = (parsed.transactions || []).map(t => ({
            ...t, 
            value: fixValue(t),
            id: t.id || uid(),
            date: t.date || `${currentMonth.value}-01`, // Se perdeu a data, joga pro dia 01
            owner: t.owner || 'Eu',
            isPaid: t.isPaid || false
          }))

          foundData = true
          alert(`Seus dados antigos da versão (${key}) foram encontrados e migrados para o novo sistema mensal!`)
          break // Para na primeira chave que achar
        } catch (e) {
          console.error("Erro na migração:", e)
        }
      }
    }

    if (!foundData) {
      console.log("Nenhum dado antigo encontrado no navegador.")
    }
  }

  // --- PERSISTÊNCIA ---
  watch([assets, cards, fixedExpenses, receivables, transactions], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      assets: assets.value, cards: cards.value, fixedExpenses: fixedExpenses.value,
      receivables: receivables.value, transactions: transactions.value
    }))
  }, { deep: true })

  const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

  // --- ACTIONS ---
  const addAsset = (i) => assets.value.push({ ...i, value: Number(i.value), id: uid(), month: currentMonth.value })
  const addCard = (i) => cards.value.push({ ...i, id: uid(), currentInvoice: Number(i.currentInvoice)||0 })
  const addFixedExpense = (i) => fixedExpenses.value.push({ ...i, value: Number(i.value), id: uid(), month: currentMonth.value })
  const addReceivable = (i) => receivables.value.push({ ...i, value: Number(i.value), id: uid(), month: currentMonth.value })

  const addTransaction = (t) => {
    transactions.value.push({ 
      ...t, 
      value: Number(t.value),
      id: uid(), 
      date: t.date || `${currentMonth.value}-01`, 
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

  // --- IMPORT/EXPORT ---
  const importJSONFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        loadData(e.target.result)
        alert('Backup restaurado! Verifique se a data das transações bate com o mês selecionado.')
      } catch (err) { alert('Erro no arquivo JSON.') }
    }
    reader.readAsText(file)
  }
  
  const exportJSON = () => {
    const data = JSON.stringify({
       assets: assets.value, cards: cards.value, fixedExpenses: fixedExpenses.value,
       receivables: receivables.value, transactions: transactions.value
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `finvue_full_backup.json`; a.click()
  }

  const importNubankTransactions = (csvText, cardId) => {
    const lines = csvText.split('\n')
    let count = 0
    const startIndex = (lines[0].toLowerCase().includes('date')) ? 1 : 0
    lines.slice(startIndex).forEach((line) => {
      if (!line.trim()) return
      const parts = line.split(',')
      if (parts.length >= 3) {
        const date = parts[0]
        const amount = parseFloat(parts[parts.length - 1])
        const title = parts.slice(1, parts.length - 1).join(',').replace(/"/g, '')
        if (!isNaN(amount)) {
          addTransaction({ desc: title, value: amount, type: 'credit', cardId, date, owner: 'Eu' })
          count++
        }
      }
    })
    return count
  }

  // --- GETTERS (FILTRADOS) ---
  const monthlyTransactions = computed(() => transactions.value.filter(t => t.date.startsWith(currentMonth.value)))
  const monthlyAssets = computed(() => assets.value.filter(i => i.month === currentMonth.value))
  const monthlyFixed = computed(() => fixedExpenses.value.filter(i => i.month === currentMonth.value))
  const monthlyReceivables = computed(() => receivables.value.filter(i => i.month === currentMonth.value))

  const monthlyCardDebtors = computed(() => {
    return monthlyTransactions.value.filter(t => t.type === 'credit' && t.owner && t.owner !== 'Eu')
  })

  // --- TOTAIS ---
  const totalAssets = computed(() => monthlyAssets.value.reduce((acc, i) => acc + i.value, 0))
  const totalFixed = computed(() => monthlyFixed.value.reduce((acc, i) => acc + i.value, 0))
  
  const totalReceivables = computed(() => {
    const manual = monthlyReceivables.value.reduce((acc, i) => acc + i.value, 0)
    const debtors = monthlyCardDebtors.value.reduce((acc, t) => acc + t.value, 0)
    return manual + debtors
  })

  const totalCards = computed(() => {
    return monthlyTransactions.value
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + t.value, 0)
  })

  const totalDebitSpent = computed(() => monthlyTransactions.value
    .filter(t => t.type !== 'credit')
    .reduce((acc, t) => acc + t.value, 0)
  )

  const finalBalance = computed(() => {
    return (totalAssets.value + totalReceivables.value) - (totalFixed.value + totalCards.value + totalDebitSpent.value)
  })

  return { 
    assets, cards, fixedExpenses, receivables, transactions, currentMonth,
    init, addAsset, addCard, addFixedExpense, addReceivable, addTransaction, deleteItem, togglePaid,
    importNubankTransactions, exportJSON, importJSONFile, migrateOldData, // Exportando migrateOldData caso precise forçar
    monthlyAssets, monthlyFixed, monthlyTransactions, monthlyCardDebtors,
    totalAssets, totalFixed, totalReceivables, totalCards, totalDebitSpent, finalBalance
  }
})