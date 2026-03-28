import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const STORAGE_KEY = 'finvue_v10'

export const useFinanceStore = defineStore('finance', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const currentMonth = ref(new Date().toISOString().slice(0, 7))
  const privacyMode  = ref(false)
  const darkMode     = ref(true)

  // income: { id, label, amount, month }
  const incomes = ref([])

  // fixed: { id, label, amount, month, isPaid }
  const fixed = ref([])

  // debtors: { id, name, description, amount, dueDate, isPaid, month }
  const debtors = ref([])

  // cards: { id, name, closingDay }
  const cards = ref([])

  // transactions: { id, cardId, description, amount, date, installments, owner, ownerName, isPaid }
  // type field removed — all transactions are credit card entries
  const transactions = ref([])

  // ── Persistence ────────────────────────────────────────────────────────
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentMonth: currentMonth.value,
      incomes: incomes.value,
      fixed: fixed.value,
      debtors: debtors.value,
      cards: cards.value,
      transactions: transactions.value,
      darkMode: darkMode.value,
    }))
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return migrateOld()
      const d = JSON.parse(raw)
      currentMonth.value = d.currentMonth || currentMonth.value
      incomes.value      = d.incomes      || []
      fixed.value        = d.fixed        || []
      debtors.value      = d.debtors      || []
      cards.value        = d.cards        || []
      transactions.value = d.transactions || []
      darkMode.value     = d.darkMode !== undefined ? d.darkMode : true
    } catch (e) { console.error('load error', e) }
  }

  function migrateOld() {
    const OLD = ['finvue_v9', 'finvue_v8_monthly', 'finvue_v7_stable']
    for (const key of OLD) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const d = JSON.parse(raw)
        // Map old assets → incomes
        incomes.value = (d.assets || []).map(a => ({
          id: a.id || uid(), label: a.name, amount: Number(a.value) || 0, month: a.month || currentMonth.value
        }))
        // Map old fixedExpenses → fixed
        fixed.value = (d.fixedExpenses || []).map(f => ({
          id: f.id || uid(), label: f.name, amount: Number(f.value) || 0, month: f.month || currentMonth.value, isPaid: false
        }))
        // Map old receivables / debtors
        debtors.value = (d.debtors || d.receivables || []).map(r => ({
          id: r.id || uid(), name: r.name, description: r.desc || '', amount: Number(r.value) || 0,
          dueDate: r.dueDate || '', isPaid: r.isPaid || false, month: r.month || currentMonth.value
        }))
        cards.value = (d.cards || []).map(c => ({
          id: c.id || uid(), name: c.name, closingDay: c.closingDay || 1
        }))
        transactions.value = (d.transactions || []).filter(t => t.type === 'credit').map(t => ({
          id: t.id || uid(), cardId: t.cardId, description: t.desc,
          amount: Number(t.value) || 0, date: t.date, installments: t.installments || '',
          owner: t.owner || 'Eu', ownerName: t.ownerName || '', isPaid: t.isPaid || false
        }))
        alert(`Dados migrados de ${key}!`)
        return
      } catch (e) { console.error(e) }
    }
  }

  // ── Auto-advance to next month if current month everything is paid ──────
  function autoAdvanceMonth() {
    const allFixedPaid = fixed.value.filter(f => f.month === currentMonth.value).every(f => f.isPaid)
    const allCardsPaid = cards.value.every(c => c.invoicePaid?.[currentMonth.value])
    const hasData = fixed.value.some(f => f.month === currentMonth.value) ||
                    cards.value.some(c => (c.invoiceTotal?.[currentMonth.value] ?? null) !== null)
    if (hasData && allFixedPaid && allCardsPaid) {
      const [y, m] = currentMonth.value.split('-').map(Number)
      const next = new Date(y, m, 1).toISOString().slice(0, 7)
      currentMonth.value = next
    }
  }

  // ── Month helpers ──────────────────────────────────────────────────────
  function changeMonth(step) {
    const [y, m] = currentMonth.value.split('-').map(Number)
    const d = new Date(y, m - 1 + step, 1)
    currentMonth.value = d.toISOString().slice(0, 7)
    persist()
  }

  const formattedMonth = computed(() => {
    const [y, m] = currentMonth.value.split('-')
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  })

  // ── Filtered lists ─────────────────────────────────────────────────────
  const monthIncomes = computed(() => incomes.value.filter(i => i.month === currentMonth.value))
  const monthFixed   = computed(() => fixed.value.filter(i => i.month === currentMonth.value))
  const monthDebtors = computed(() => debtors.value.filter(i => i.month === currentMonth.value))
  const monthTxns    = computed(() =>
    transactions.value.filter(t => t.date && t.date.startsWith(currentMonth.value))
  )

  // Debtors from card transactions (owner !== Eu)
  const cardDebtors  = computed(() => monthTxns.value.filter(t => t.owner !== 'Eu'))

  // ── Totals ─────────────────────────────────────────────────────────────
  const totalIncome = computed(() => monthIncomes.value.reduce((a, i) => a + i.amount, 0))
  const totalFixed  = computed(() => monthFixed.value.reduce((a, i) => a + i.amount, 0))

  // Per-card effective total: manual quickTotal wins over sum of transactions
  const cardTotals = computed(() =>
    cards.value.map(card => {
      const quickTotal = card.invoiceTotal?.[currentMonth.value] ?? null
      const amount = quickTotal !== null
        ? quickTotal
        : transactions.value
            .filter(t => t.cardId === card.id && t.date?.startsWith(currentMonth.value))
            .reduce((a, t) => a + t.amount, 0)
      return { id: card.id, name: card.name, amount, isPaid: card.invoicePaid?.[currentMonth.value] || false }
    }).filter(c => c.amount > 0)
  )

  const totalCards   = computed(() => cardTotals.value.reduce((a, c) => a + c.amount, 0))
  // A Receber: sempre mostra o total completo no saldo — isPaid é só indicativo visual
  const totalDebtors = computed(() =>
    monthDebtors.value.reduce((a, d) => a + d.amount, 0) +
    cardDebtors.value.reduce((a, t) => a + t.amount, 0)
  )

  // Fixed payment progress
  const fixedPaidCount = computed(() => monthFixed.value.filter(i => i.isPaid).length)
  const fixedAllPaid   = computed(() => monthFixed.value.length > 0 && fixedPaidCount.value === monthFixed.value.length)

  const balance = computed(() =>
    (totalIncome.value + totalDebtors.value) - (totalFixed.value + totalCards.value)
  )

  // ── CRUD ───────────────────────────────────────────────────────────────
  function addIncome(label, amount) {
    incomes.value.push({ id: uid(), label, amount: Number(amount), month: currentMonth.value })
    persist()
  }
  function removeIncome(id) { incomes.value = incomes.value.filter(i => i.id !== id); persist() }
  function updateIncome(id, patch) {
    const i = incomes.value.find(i => i.id === id)
    if (i) Object.assign(i, patch)
    persist()
  }

  function addFixed(label, amount) {
    fixed.value.push({ id: uid(), label, amount: Number(amount), month: currentMonth.value, isPaid: false })
    persist()
  }
  function removeFixed(id) { fixed.value = fixed.value.filter(i => i.id !== id); persist() }
  function updateFixed(id, patch) {
    const i = fixed.value.find(i => i.id === id)
    if (i) Object.assign(i, patch)
    persist()
  }
  function toggleFixedPaid(id) {
    const i = fixed.value.find(i => i.id === id)
    if (i) { i.isPaid = !i.isPaid; persist() }
  }

  function addDebtor({ name, description, amount, dueDate }) {
    debtors.value.push({ id: uid(), name, description, amount: Number(amount), dueDate, isPaid: false, month: currentMonth.value })
    persist()
  }
  function removeDebtor(id) { debtors.value = debtors.value.filter(i => i.id !== id); persist() }
  function toggleDebtorPaid(id) {
    const d = debtors.value.find(i => i.id === id)
    if (d) { d.isPaid = !d.isPaid; persist() }
  }

  function addCard(name, closingDay) {
    const card = { id: uid(), name, closingDay: Number(closingDay) || 1 }
    cards.value.push(card)
    persist()
    return card.id
  }
  function removeCard(id) {
    cards.value = cards.value.filter(c => c.id !== id)
    transactions.value = transactions.value.filter(t => t.cardId !== id)
    persist()
  }

  function addTransaction({ cardId, description, amount, date, installments, owner, ownerName }) {
    transactions.value.push({
      id: uid(), cardId, description, amount: Number(amount), date,
      installments: installments || '', owner: owner || 'Eu', ownerName: ownerName || '', isPaid: false
    })
    persist()
  }
  function removeTransaction(id) { transactions.value = transactions.value.filter(t => t.id !== id); persist() }
  function toggleTxnPaid(id) {
    const t = transactions.value.find(t => t.id === id)
    if (t) { t.isPaid = !t.isPaid; persist() }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ currentMonth: currentMonth.value, incomes: incomes.value, fixed: fixed.value, debtors: debtors.value, cards: cards.value, transactions: transactions.value }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `finvue_${Date.now()}.json`; a.click()
  }

  function importJSON(file) {
    const r = new FileReader()
    r.onload = e => {
      try {
        const d = JSON.parse(e.target.result)
        incomes.value = d.incomes || []; fixed.value = d.fixed || []
        debtors.value = d.debtors || []; cards.value = d.cards || []
        transactions.value = d.transactions || []
        if (d.currentMonth) currentMonth.value = d.currentMonth
        persist()
      } catch { alert('Arquivo inválido.') }
    }
    r.readAsText(file)
  }

  function togglePrivacy() { privacyMode.value = !privacyMode.value }
  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    persist()
  }

  // ── Report data: all months aggregated ─────────────────────────────────
  const reportData = computed(() => {
    // Gather all unique months across all data
    const monthSet = new Set()
    incomes.value.forEach(i => i.month && monthSet.add(i.month))
    fixed.value.forEach(f => f.month && monthSet.add(f.month))
    debtors.value.forEach(d => d.month && monthSet.add(d.month))
    cards.value.forEach(c => {
      if (c.invoiceTotal) Object.keys(c.invoiceTotal).forEach(m => m && monthSet.add(m))
    })
    transactions.value.forEach(t => t.date && monthSet.add(t.date.slice(0,7)))

    const months = [...monthSet].sort()

    return months.map(m => {
      const mIncomes  = incomes.value.filter(i => i.month === m).reduce((a,i) => a+i.amount, 0)
      const mFixed    = fixed.value.filter(f => f.month === m).reduce((a,f) => a+f.amount, 0)
      const mDebtors  = debtors.value.filter(d => d.month === m).reduce((a,d) => a+d.amount, 0)
      const mCards    = cards.value.reduce((sum, card) => {
        const qt = card.invoiceTotal?.[m] ?? null
        if (qt !== null) return sum + qt
        return sum + transactions.value
          .filter(t => t.cardId === card.id && t.date?.startsWith(m))
          .reduce((a,t) => a+t.amount, 0)
      }, 0)
      const mTotalOut = mFixed + mCards
      const mBalance  = (mIncomes + mDebtors) - mTotalOut

      // Per-card breakdown
      const cardBreakdown = cards.value.map(card => {
        const qt = card.invoiceTotal?.[m] ?? null
        const amt = qt !== null ? qt : transactions.value
          .filter(t => t.cardId === card.id && t.date?.startsWith(m))
          .reduce((a,t) => a+t.amount, 0)
        return { id: card.id, name: card.name, amount: amt }
      }).filter(c => c.amount > 0)

      return { month: m, income: mIncomes, fixed: mFixed, cards: mCards, debtors: mDebtors, balance: mBalance, cardBreakdown }
    })
  })

  return {
    // state
    currentMonth, formattedMonth, privacyMode,
    incomes, fixed, debtors, cards, transactions,
    // filtered
    monthIncomes, monthFixed, monthDebtors, monthTxns, cardDebtors,
    // totals
    totalIncome, totalFixed, totalCards, totalDebtors, balance, cardTotals, fixedPaidCount, fixedAllPaid,
    // actions
    load, changeMonth, autoAdvanceMonth,
    addIncome, removeIncome, updateIncome,
    addFixed, removeFixed, updateFixed, toggleFixedPaid,
    addDebtor, removeDebtor, toggleDebtorPaid,
    addCard, removeCard,
    addTransaction, removeTransaction, toggleTxnPaid,
    persist, exportJSON, importJSON, togglePrivacy, toggleDarkMode, darkMode, reportData,
  }
})