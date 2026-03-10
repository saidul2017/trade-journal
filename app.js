// ==================== DATA MANAGEMENT ====================
let trades = JSON.parse(localStorage.getItem('tradingJournal_trades')) || [];
let checklistState = JSON.parse(localStorage.getItem('tradingJournal_checklist')) || {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderTradeTable();
    updateDashboard();
    updateChecklistUI();
    setupCalculationListeners();
    setupTableEventDelegation();
});

// ==================== TAB NAVIGATION ====================
function switchTab(tabId, tabElement) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    tabElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'dashboard') {
        updateDashboard();
    }
}

// ==================== TRADE LOG FUNCTIONS ====================
function generateTradeId() {
    const maxId = trades.reduce((max, t) => {
        const num = parseInt(t.id.replace('TR-', ''));
        return num > max ? num : max;
    }, 0);
    return 'TR-' + String(maxId + 1).padStart(4, '0');
}

function getPipValue(pair) {
    if (pair === 'XAU/USD') return 10;
    if (pair.includes('JPY')) return 1000;
    return 100000;
}

function calculateRisk(entry, sl, pair) {
    return Math.abs(entry - sl) * getPipValue(pair);
}

function calculateRRR(entry, sl, tp) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    return risk === 0 ? 0 : reward / risk;
}

function calculatePL(direction, entry, exit, lot, pair) {
    const pipValue = getPipValue(pair);
    const pipDiff = direction === 'BUY' ? (exit - entry) : (entry - exit);
    return pipDiff * pipValue * lot * 0.01; // Simplified IDR calculation
}

function setupCalculationListeners() {
    const inputs = ['tradeEntry', 'tradeSL', 'tradeTP', 'tradeLot', 'tradeBalance', 'tradePair'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateCalculations);
        }
    });
}

function updateCalculations() {
    const entry = parseFloat(document.getElementById('tradeEntry').value) || 0;
    const sl = parseFloat(document.getElementById('tradeSL').value) || 0;
    const tp = parseFloat(document.getElementById('tradeTP').value) || 0;
    const lot = parseFloat(document.getElementById('tradeLot').value) || 0;
    const balance = parseFloat(document.getElementById('tradeBalance').value) || 0;
    const pair = document.getElementById('tradePair').value || 'EUR/USD';

    const riskPip = calculateRisk(entry, sl, pair);
    const riskIDR = riskPip * lot * 1350; // Simplified: 1 pip ≈ Rp 1,350 per 0.01 lot
    const riskPercent = balance > 0 ? (riskIDR / balance) * 100 : 0;
    const rrr = calculateRRR(entry, sl, tp);

    document.getElementById('calcRiskPip').textContent = riskPip.toFixed(1);
    document.getElementById('calcRiskIDR').textContent = 'Rp ' + riskIDR.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    document.getElementById('calcRiskPercent').textContent = riskPercent.toFixed(2) + '%';
    document.getElementById('calcRRR').textContent = rrr.toFixed(2);

    // Color coding
    const riskPercentEl = document.getElementById('calcRiskPercent');
    riskPercentEl.style.color = riskPercent <= 1 ? 'var(--success)' : riskPercent <= 2 ? 'var(--warning)' : 'var(--danger)';

    const rrrEl = document.getElementById('calcRRR');
    rrrEl.style.color = rrr >= 2 ? 'var(--success)' : rrr >= 1.5 ? 'var(--warning)' : 'var(--danger)';
}

function openAddTradeModal() {
    document.getElementById('addTradeModal').classList.add('active');
    document.getElementById('tradeDate').value = new Date().toISOString().slice(0, 16);
}

function closeAddTradeModal() {
    document.getElementById('addTradeModal').classList.remove('active');
    document.getElementById('addTradeForm').reset();
}

function saveTrade(e) {
    e.preventDefault();

    const pair = document.getElementById('tradePair').value;
    const entry = parseFloat(document.getElementById('tradeEntry').value);
    const sl = parseFloat(document.getElementById('tradeSL').value);
    const tp = parseFloat(document.getElementById('tradeTP').value);
    const lot = parseFloat(document.getElementById('tradeLot').value);
    const balance = parseFloat(document.getElementById('tradeBalance').value);

    const riskPip = calculateRisk(entry, sl, pair);
    const riskIDR = riskPip * lot * 1350;
    const riskPercent = (riskIDR / balance) * 100;
    const rrr = calculateRRR(entry, sl, tp);

    const trade = {
        id: generateTradeId(),
        date: document.getElementById('tradeDate').value,
        pair: pair,
        direction: document.getElementById('tradeDirection').value,
        strategy: document.getElementById('tradeStrategy').value,
        timeframe: document.getElementById('tradeTimeframe').value,
        session: document.getElementById('tradeSession').value,
        entry: entry,
        sl: sl,
        tp: tp,
        lot: lot,
        balance: balance,
        riskPip: riskPip,
        riskIDR: riskIDR,
        riskPercent: riskPercent,
        rrr: rrr,
        emotionBefore: document.getElementById('tradeEmotionBefore').value,
        notes: document.getElementById('tradeNotes').value,
        exit: null,
        pl: null,
        rMultiple: null,
        emotionAfter: null,
        checklist: null,
        deviation: 'Tidak Ada',
        reviewNotes: '',
        status: 'open'
    };

    trades.push(trade);
    saveTrades();
    renderTradeTable();
    closeAddTradeModal();
    showNotification('✅ Trade berhasil ditambahkan!', 'success');
}

function openEditTradeModal(tradeId) {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    document.getElementById('editTradeId').value = tradeId;
    document.getElementById('editExit').value = trade.exit || '';
    document.getElementById('editEmotionAfter').value = trade.emotionAfter || '';
    document.getElementById('editChecklist').value = trade.checklist === 'yes' ? 'yes' : 'no';
    document.getElementById('editDeviation').value = trade.deviation || 'Tidak Ada';
    document.getElementById('editReviewNotes').value = trade.reviewNotes || '';

    document.getElementById('editTradeModal').classList.add('active');
}

function closeEditTradeModal() {
    document.getElementById('editTradeModal').classList.remove('active');
}

function updateTrade(e) {
    e.preventDefault();

    const tradeId = document.getElementById('editTradeId').value;
    const tradeIndex = trades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return;

    const trade = trades[tradeIndex];
    const exit = parseFloat(document.getElementById('editExit').value);

    const pl = calculatePL(trade.direction, trade.entry, exit, trade.lot, trade.pair);
    const rMultiple = trade.riskIDR > 0 ? pl / trade.riskIDR : 0;

    trade.exit = exit;
    trade.pl = pl;
    trade.rMultiple = rMultiple;
    trade.emotionAfter = document.getElementById('editEmotionAfter').value;
    trade.checklist = document.getElementById('editChecklist').value;
    trade.deviation = document.getElementById('editDeviation').value;
    trade.reviewNotes = document.getElementById('editReviewNotes').value;
    trade.status = 'closed';

    trades[tradeIndex] = trade;
    saveTrades();
    renderTradeTable();
    closeEditTradeModal();
    showNotification('✅ Trade berhasil diupdate!', 'success');
}

function deleteTrade(tradeId) {
    if (!confirm('Yakin ingin menghapus trade ini?')) return;

    trades = trades.filter(t => t.id !== tradeId);
    saveTrades();
    renderTradeTable();
    showNotification('🗑️ Trade dihapus', 'success');
}

// ==================== XSS SANITIZATION ====================
function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

function renderTradeTable() {
    const tbody = document.getElementById('tradeTableBody');
    const emptyState = document.getElementById('emptyState');

    if (trades.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';

    tbody.innerHTML = trades.map(trade => {
        const riskClass = trade.riskPercent <= 1 ? 'risk-low' : trade.riskPercent <= 2 ? 'risk-medium' : 'risk-high';
        const rrrClass = trade.rrr >= 2 ? 'rrr-good' : trade.rrr < 1.5 ? 'rrr-bad' : '';
        const checklistClass = trade.checklist === 'yes' ? 'checklist-yes' : trade.checklist === 'no' ? 'checklist-no' : '';
        const plClass = trade.pl !== null ? (trade.pl >= 0 ? 'profit-positive' : 'profit-negative') : '';
        const directionClass = trade.direction === 'BUY' ? 'badge-buy' : 'badge-sell';

        return `
            <tr>
                <td><strong>${sanitizeHTML(trade.id)}</strong></td>
                <td>${new Date(trade.date).toLocaleDateString('id-ID')}</td>
                <td>${sanitizeHTML(trade.pair)}</td>
                <td><span class="badge ${directionClass}">${sanitizeHTML(trade.direction)}</span></td>
                <td>${sanitizeHTML(trade.strategy)}</td>
                <td>${trade.entry.toFixed(5)}</td>
                <td>${trade.sl.toFixed(5)}</td>
                <td>${trade.tp.toFixed(5)}</td>
                <td>${trade.lot}</td>
                <td class="${riskClass}">Rp ${trade.riskIDR.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                <td class="${riskClass}">${trade.riskPercent.toFixed(2)}%</td>
                <td class="${rrrClass}">${trade.rrr.toFixed(2)}</td>
                <td class="${plClass}">${trade.pl !== null ? 'Rp ' + trade.pl.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '-'}</td>
                <td>${trade.rMultiple !== null ? trade.rMultiple.toFixed(2) : '-'}</td>
                <td>${sanitizeHTML(trade.emotionBefore)}</td>
                <td class="${checklistClass}">${trade.checklist === 'yes' ? '✅ Ya' : trade.checklist === 'no' ? '❌ Tidak' : '-'}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${sanitizeHTML(trade.notes) || '-'}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" data-action="edit" data-id="${sanitizeHTML(trade.id)}">✏️</button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" data-action="delete" data-id="${sanitizeHTML(trade.id)}">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterTrades() {
    const search = document.getElementById('searchTrade').value.toLowerCase();
    const pairFilter = document.getElementById('filterPair').value;
    const directionFilter = document.getElementById('filterDirection').value;
    const resultFilter = document.getElementById('filterResult').value;

    const rows = document.querySelectorAll('#tradeTableBody tr');

    rows.forEach((row, index) => {
        const trade = trades[index];
        if (!trade) {
            row.style.display = 'none';
            return;
        }

        const id = trade.id.toLowerCase();
        const matchSearch = id.includes(search);
        const matchPair = !pairFilter || trade.pair === pairFilter;
        const matchDirection = !directionFilter || trade.direction === directionFilter;
        const matchResult = !resultFilter ||
            (resultFilter === 'win' && trade.pl !== null && trade.pl > 0) ||
            (resultFilter === 'loss' && trade.pl !== null && trade.pl < 0);

        row.style.display = matchSearch && matchPair && matchDirection && matchResult ? '' : 'none';
    });
}

function setupTableEventDelegation() {
    document.getElementById('tradeTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit') openEditTradeModal(id);
        else if (action === 'delete') deleteTrade(id);
    });
}

// ==================== DASHBOARD FUNCTIONS ====================
let charts = {};

function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateWeeklySummary();
}

function updateKPIs() {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const totalTrades = trades.length;

    const wins = closedTrades.filter(t => t.pl > 0);
    const losses = closedTrades.filter(t => t.pl < 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    const totalPL = closedTrades.reduce((sum, t) => sum + (t.pl || 0), 0);
    const avgRisk = trades.length > 0 ? trades.reduce((sum, t) => sum + t.riskPercent, 0) / trades.length : 0;

    const totalWin = wins.reduce((sum, t) => sum + t.pl, 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pl, 0));
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 999 : 0;

    const compliant = trades.filter(t => t.checklist === 'yes').length;
    const compliance = trades.length > 0 ? (compliant / trades.length) * 100 : 0;

    const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    closedTrades.forEach(t => {
        cumulative += t.pl;
        if (cumulative > peak) peak = cumulative;
        const drawdown = peak - cumulative;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    // Update UI
    document.getElementById('kpiTotalTrades').textContent = totalTrades;

    const winRateEl = document.getElementById('kpiWinRate');
    winRateEl.textContent = winRate.toFixed(1) + '%';
    winRateEl.className = 'kpi-value ' + (winRate >= 45 ? 'positive' : 'negative');

    const plEl = document.getElementById('kpiTotalPL');
    plEl.textContent = 'Rp ' + totalPL.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    plEl.className = 'kpi-value ' + (totalPL >= 0 ? 'positive' : 'negative');

    const riskEl = document.getElementById('kpiAvgRisk');
    riskEl.textContent = avgRisk.toFixed(2) + '%';
    riskEl.className = 'kpi-value ' + (avgRisk <= 1 ? 'positive' : avgRisk <= 2 ? 'neutral' : 'negative');

    const pfEl = document.getElementById('kpiProfitFactor');
    pfEl.textContent = profitFactor.toFixed(2);
    pfEl.className = 'kpi-value ' + (profitFactor >= 1.5 ? 'positive' : 'negative');

    const compEl = document.getElementById('kpiCompliance');
    compEl.textContent = compliance.toFixed(1) + '%';
    compEl.className = 'kpi-value ' + (compliance >= 90 ? 'positive' : compliance >= 70 ? 'neutral' : 'negative');

    const expEl = document.getElementById('kpiExpectancy');
    expEl.textContent = 'Rp ' + expectancy.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    expEl.className = 'kpi-value ' + (expectancy >= 0 ? 'positive' : 'negative');

    const ddEl = document.getElementById('kpiMaxDrawdown');
    ddEl.textContent = '-' + maxDrawdownPercent.toFixed(1) + '%';
}

function updateCharts() {
    // Destroy existing charts
    Object.values(charts).forEach(chart => chart.destroy());

    const closedTrades = trades.filter(t => t.status === 'closed');
    if (closedTrades.length === 0) return;

    // Equity Curve
    const equityCtx = document.getElementById('equityChart').getContext('2d');
    let cumulative = 0;
    const equityData = [0];
    closedTrades.forEach(t => {
        cumulative += t.pl;
        equityData.push(cumulative);
    });

    charts.equity = new Chart(equityCtx, {
        type: 'line',
        data: {
            labels: ['Start', ...closedTrades.map(t => t.id)],
            datasets: [{
                label: 'Equity',
                data: equityData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    // Emotion Distribution
    const emotionCtx = document.getElementById('emotionChart').getContext('2d');
    const emotions = {};
    trades.forEach(t => {
        emotions[t.emotionBefore] = (emotions[t.emotionBefore] || 0) + 1;
    });

    charts.emotion = new Chart(emotionCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(emotions),
            datasets: [{
                data: Object.values(emotions),
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8' }
                }
            }
        }
    });

    // Strategy Performance
    const strategyCtx = document.getElementById('strategyChart').getContext('2d');
    const strategies = {};
    closedTrades.forEach(t => {
        if (!strategies[t.strategy]) strategies[t.strategy] = { count: 0, total: 0 };
        strategies[t.strategy].count++;
        strategies[t.strategy].total += t.pl;
    });

    charts.strategy = new Chart(strategyCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(strategies),
            datasets: [{
                label: 'Total P/L',
                data: Object.values(strategies).map(s => s.total),
                backgroundColor: Object.values(strategies).map(s => s.total >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    // Risk vs R-Multiple Scatter
    const scatterCtx = document.getElementById('riskScatterChart').getContext('2d');
    const scatterData = closedTrades.map(t => ({
        x: t.riskPercent,
        y: t.rMultiple,
        pl: t.pl
    }));

    charts.scatter = new Chart(scatterCtx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Trades',
                data: scatterData,
                backgroundColor: scatterData.map(d => d.pl >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    title: { display: true, text: 'Risk %', color: '#94a3b8' },
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    title: { display: true, text: 'R-Multiple', color: '#94a3b8' },
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    // Day of Week Performance
    const dayCtx = document.getElementById('dayChart').getContext('2d');
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const dayData = days.map(() => ({ win: 0, loss: 0 }));

    closedTrades.forEach(t => {
        const day = new Date(t.date).getDay();
        const index = day === 0 ? 6 : day - 1;
        if (t.pl >= 0) dayData[index].win++;
        else dayData[index].loss++;
    });

    charts.day = new Chart(dayCtx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Win',
                    data: dayData.map(d => d.win),
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Loss',
                    data: dayData.map(d => d.loss),
                    backgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    // Session Performance
    const sessionCtx = document.getElementById('sessionChart').getContext('2d');
    const sessions = { Asia: 0, London: 0, 'New York': 0 };
    const sessionTrades = { Asia: 0, London: 0, 'New York': 0 };

    closedTrades.forEach(t => {
        sessions[t.session] = (sessions[t.session] || 0) + t.pl;
        sessionTrades[t.session] = (sessionTrades[t.session] || 0) + 1;
    });

    const sessionAvg = Object.keys(sessions).map(s =>
        sessionTrades[s] > 0 ? sessions[s] / sessionTrades[s] : 0
    );

    charts.session = new Chart(sessionCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(sessions),
            datasets: [{
                label: 'Avg P/L',
                data: sessionAvg,
                backgroundColor: sessionAvg.map(v => v >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function updateWeeklySummary() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekTrades = trades.filter(t => new Date(t.date) >= oneWeekAgo);
    const weekClosed = weekTrades.filter(t => t.status === 'closed');

    const weekWins = weekClosed.filter(t => t.pl > 0);
    const weekWinRate = weekClosed.length > 0 ? (weekWins.length / weekClosed.length) * 100 : 0;
    const weekPL = weekClosed.reduce((sum, t) => sum + (t.pl || 0), 0);

    // Find best pair
    const pairPerformance = {};
    weekClosed.forEach(t => {
        pairPerformance[t.pair] = (pairPerformance[t.pair] || 0) + t.pl;
    });
    const bestPair = Object.entries(pairPerformance).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    document.getElementById('weekTrades').textContent = weekTrades.length;
    document.getElementById('weekWinRate').textContent = weekWinRate.toFixed(1) + '%';
    document.getElementById('weekPL').textContent = 'Rp ' + weekPL.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    document.getElementById('weekBestPair').textContent = bestPair;
}

// ==================== CHECKLIST FUNCTIONS ====================
function toggleChecklist(element, id) {
    element.classList.toggle('checked');
    checklistState[id] = element.classList.contains('checked');
    localStorage.setItem('tradingJournal_checklist', JSON.stringify(checklistState));
    updateChecklistUI();
}

function updateChecklistUI() {
    // Restore checkbox states
    Object.entries(checklistState).forEach(([id, checked]) => {
        const el = document.querySelector(`[onclick*="${id}"]`);
        if (el && checked) {
            el.classList.add('checked');
        }
    });

    const total = 18;
    const checked = Object.values(checklistState).filter(v => v).length;
    const percentage = (checked / total) * 100;

    document.getElementById('checklistProgress').style.width = percentage + '%';
    document.getElementById('checklistPercentage').textContent = percentage.toFixed(0) + '%';
    document.getElementById('checklistCount').textContent = checked;

    const statusEl = document.getElementById('tradeStatus');
    const btnEl = document.getElementById('btnProceedTrade');

    if (percentage === 100) {
        statusEl.textContent = '✅ SEMUA LENGKAP - SIAP ENTRY';
        statusEl.className = 'trade-status ready';
        btnEl.style.display = 'block';
    } else {
        statusEl.textContent = `❌ BATALKAN TRADE - ${checked}/${total} Checklist Terpenuhi`;
        statusEl.className = 'trade-status not-ready';
        btnEl.style.display = 'none';
    }
}

function proceedToTrade() {
    closeAddTradeModal();
    openAddTradeModal();
    showNotification('✅ Checklist lengkap! Silakan input trade details.', 'success');
}

// ==================== DATA PERSISTENCE ====================
function saveTrades() {
    localStorage.setItem('tradingJournal_trades', JSON.stringify(trades));
}

function exportData() {
    const data = {
        trades: trades,
        checklist: checklistState,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-journal-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📥 Data berhasil diexport!', 'success');
}

function exportCSV() {
    if (trades.length === 0) {
        showNotification('⚠️ Tidak ada data untuk diexport!', 'warning');
        return;
    }

    const headers = [
        'ID', 'Tanggal', 'Pair', 'Arah', 'Strategi', 'Timeframe', 'Sesi',
        'Entry', 'SL', 'TP', 'Lot', 'Balance', 'Risk (pip)', 'Risk (IDR)',
        'Risk (%)', 'RRR', 'Exit', 'P/L (IDR)', 'R-Multiple',
        'Emosi Sebelum', 'Emosi Sesudah', 'Checklist', 'Deviasi',
        'Catatan', 'Catatan Review', 'Status'
    ];

    const rows = trades.map(t => [
        t.id,
        t.date,
        t.pair,
        t.direction,
        t.strategy,
        t.timeframe,
        t.session,
        t.entry,
        t.sl,
        t.tp,
        t.lot,
        t.balance,
        t.riskPip,
        t.riskIDR,
        t.riskPercent.toFixed(2),
        t.rrr.toFixed(2),
        t.exit !== null ? t.exit : '',
        t.pl !== null ? t.pl.toFixed(0) : '',
        t.rMultiple !== null ? t.rMultiple.toFixed(2) : '',
        t.emotionBefore,
        t.emotionAfter || '',
        t.checklist || '',
        t.deviation || '',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${(t.reviewNotes || '').replace(/"/g, '""')}"`,
        t.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-journal-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📊 CSV berhasil diexport!', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.trades) {
                    trades = data.trades;
                    saveTrades();
                }
                if (data.checklist) {
                    checklistState = data.checklist;
                    localStorage.setItem('tradingJournal_checklist', JSON.stringify(checklistState));
                }
                renderTradeTable();
                updateChecklistUI();
                showNotification('📤 Data berhasil diimport!', 'success');
            } catch (err) {
                showNotification('❌ File tidak valid!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (!confirm('⚠️ PERINGATAN: Semua data akan dihapus! Yakin?')) return;
    if (!confirm('⚠️ PERINGATAN SEKALI LAGI: Tindakan ini tidak dapat dibatalkan!')) return;

    trades = [];
    checklistState = {};
    saveTrades();
    localStorage.setItem('tradingJournal_checklist', JSON.stringify(checklistState));
    renderTradeTable();
    updateChecklistUI();
    updateDashboard();
    showNotification('🗑️ Semua data direset!', 'success');
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--warning)'};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modals on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});
