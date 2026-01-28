import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useFinanceStore = defineStore('finance', () => {
  // --- STATE (DADOS) ---
  const assets = ref([])          
  const cards = ref([])           
  const fixedExpenses = ref([])   
  const receivables = ref([])     
  const transactions = ref([])    
  
  const currentMonth = ref(new Date().toISOString().slice(0, 7)) 
  const privacyMode = ref(false)  

  const STORAGE_KEY = 'finvue_v8_monthly'
  const OLD_KEYS = ['finvue_v7_stable', 'finvue_v6_final', 'finvue_v5_auto', 'vue-fin-data-v1']

  // --- INIT ---
  function init() {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      loadData(data)
    } else {
      console.log("Iniciando verificação de dados antigos...")
      migrateOldData()
    }
  }

  const loadData = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString)
      const fix = (i) => ({ ...i, value: Number(i.value) || 0 })
      
      assets.value = (parsed.assets || []).map(fix)
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

  const migrateOldData = () => {
    for (const key of OLD_KEYS) {
      const oldRaw = localStorage.getItem(key)
      if (oldRaw) {
        try {
          const parsed = JSON.parse(oldRaw)
          const fixVal = (i) => Number(i.value) || 0
          
          assets.value = (parsed.assets || []).map(i => ({...i, value: fixVal(i), month: currentMonth.value, id: i.id || uid()}))
          fixedExpenses.value = (parsed.fixedExpenses || []).map(i => ({...i, value: fixVal(i), month: currentMonth.value, id: i.id || uid()}))
          receivables.value = (parsed.receivables || []).map(i => ({...i, value: fixVal(i), month: currentMonth.value, id: i.id || uid()}))
          cards.value = (parsed.cards || []).map(c => ({...c, currentInvoice: Number(c.currentInvoice)||0, id: c.id || uid()}))
          transactions.value = (parsed.transactions || []).map(t => ({
            ...t, value: fixVal(t), id: t.id || uid(),
            date: t.date || `${currentMonth.value}-01`, 
            owner: t.owner || 'Eu', isPaid: t.isPaid || false
          }))
          
          alert(`Dados migrados da versão antiga (${key}) com sucesso!`)
          return 
        } catch (e) { console.error(e) }
      }
    }
  }

  // --- PERSISTÊNCIA ---
  watch([assets, cards, fixedExpenses, receivables, transactions, privacyMode], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      assets: assets.value, cards: cards.value, fixedExpenses: fixedExpenses.value,
      receivables: receivables.value, transactions: transactions.value
    }))
  }, { deep: true })

  const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

  // --- ACTIONS ---
  const togglePrivacy = () => privacyMode.value = !privacyMode.value

  const addAsset = (i) => assets.value.push({ ...i, value: Number(i.value), id: uid(), month: currentMonth.value })
  const addFixedExpense = (i) => fixedExpenses.value.push({ ...i, value: Number(i.value), id: uid(), month: currentMonth.value })
  const addReceivable = (i) => receivables.value.push({ ...i, value: Number(i.value), id: uid(), month: currentMonth.value })
  const addCard = (i) => cards.value.push({ ...i, id: uid(), currentInvoice: Number(i.currentInvoice)||0 })

  const addTransaction = (t) => {
    transactions.value.push({ 
      ...t, value: Number(t.value), id: uid(), 
      date: t.date || `${currentMonth.value}-01`, 
      installments: t.installments || null, owner: t.owner || 'Eu', isPaid: false
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

  const importJSONFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try { loadData(e.target.result); alert('Backup restaurado!') } catch (err) { alert('Erro no arquivo JSON.') }
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
    a.href = url; a.download = `finvue_backup_${Date.now()}.json`; a.click()
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

  // --- GETTERS (FILTROS) ---
  const monthlyTransactions = computed(() => transactions.value.filter(t => t.date.startsWith(currentMonth.value)))
  const monthlyAssets = computed(() => assets.value.filter(i => i.month === currentMonth.value))
  const monthlyFixed = computed(() => fixedExpenses.value.filter(i => i.month === currentMonth.value))
  const monthlyReceivables = computed(() => receivables.value.filter(i => i.month === currentMonth.value))
  const monthlyCardDebtors = computed(() => monthlyTransactions.value.filter(t => t.type === 'credit' && t.owner && t.owner !== 'Eu'))

  // --- TOTAIS ---
  const totalAssets = computed(() => monthlyAssets.value.reduce((acc, i) => acc + i.value, 0))
  const totalFixed = computed(() => monthlyFixed.value.reduce((acc, i) => acc + i.value, 0))
  const totalReceivables = computed(() => monthlyReceivables.value.reduce((acc, i) => acc + i.value, 0) + monthlyCardDebtors.value.reduce((acc, t) => acc + t.value, 0))
  const totalCards = computed(() => monthlyTransactions.value.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.value, 0))
  const totalDebitSpent = computed(() => monthlyTransactions.value.filter(t => t.type !== 'credit').reduce((acc, t) => acc + t.value, 0))
  const finalBalance = computed(() => (totalAssets.value + totalReceivables.value) - (totalFixed.value + totalCards.value + totalDebitSpent.value))

  // --- ESTATÍSTICAS (Corrigido para usar Mês Atual no Ranking) ---
  const stats = computed(() => {
    const allTrans = transactions.value
    const allFixed = fixedExpenses.value 
    
    if (allTrans.length === 0 && allFixed.length === 0) return null

    // 1. Evolução Mensal (ESTE É HISTÓRICO - Usa tudo)
    const byMonth = {}
    allTrans.forEach(t => {
      const m = t.date ? t.date.slice(0, 7) : currentMonth.value
      byMonth[m] = (byMonth[m] || 0) + Number(t.value)
    })
    allFixed.forEach(f => {
       if (f.month) byMonth[f.month] = (byMonth[f.month] || 0) + Number(f.value)
    })

    const monthlyEvolution = Object.entries(byMonth)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
    
    const highestMonth = [...monthlyEvolution].sort((a,b) => b.value - a.value)[0] || { month: '-', value: 0 }


    // === AQUI MUDOU: Filtramos dados apenas do MÊS ATUAL para os detalhes ===
    const thisMonthTrans = allTrans.filter(t => t.date.startsWith(currentMonth.value))
    const thisMonthFixed = allFixed.filter(f => f.month === currentMonth.value)

    // 2. Ranking de Pessoas (Só Mês Atual)
    const byOwner = {}
    
    // Transações do Mês
    thisMonthTrans.forEach(t => {
        const owner = t.type === 'credit' ? t.owner : 'Eu'
        byOwner[owner] = (byOwner[owner] || 0) + Number(t.value)
    })
    // Fixos do Mês
    thisMonthFixed.forEach(f => {
        byOwner['Eu'] = (byOwner['Eu'] || 0) + Number(f.value)
    })

    const ownerRanking = Object.entries(byOwner)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 3. Top Despesas (Só Mês Atual - COMPLETO)
    const byDesc = {}
    
    thisMonthTrans.forEach(t => {
        let cleanName = t.desc.toLowerCase().split('*')[0].split('-')[0].trim()
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
        byDesc[cleanName] = (byDesc[cleanName] || 0) + Number(t.value)
    })
    thisMonthFixed.forEach(f => {
        let cleanName = f.name.trim()
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
        byDesc[cleanName] = (byDesc[cleanName] || 0) + Number(f.value)
    })
    
    const topExpenses = Object.entries(byDesc)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    // 4. Totais (Só Mês Atual)
    const totalTrans = thisMonthTrans.reduce((acc, t) => acc + Number(t.value), 0)
    const totalFixos = thisMonthFixed.reduce((acc, f) => acc + Number(f.value), 0)
    const totalSpent = totalTrans + totalFixos
    const myTotalSpend = ownerRanking.find(o => o.name === 'Eu')?.value || 0

    return { 
      monthlyEvolution, // Histórico
      highestMonth,     // Histórico
      ownerRanking,     // Mês Atual
      topExpenses,      // Mês Atual
      totalSpent,       // Mês Atual
      myTotalSpend      // Mês Atual
    }
  })

  return { 
    // State
    assets, cards, fixedExpenses, receivables, transactions, currentMonth, privacyMode,
    // Actions
    init, addAsset, addCard, addFixedExpense, addReceivable, addTransaction, deleteItem, togglePaid, togglePrivacy,
    importNubankTransactions, exportJSON, importJSONFile, migrateOldData,
    // Getters Filtrados
    monthlyAssets, monthlyFixed, monthlyTransactions, monthlyCardDebtors,
    // Getters Totais
    totalAssets, totalFixed, totalReceivables, totalCards, totalDebitSpent, finalBalance,
    // Analytics
    stats
  }
})