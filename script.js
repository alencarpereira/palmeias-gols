// ---------- Helpers ----------
function getFloat(id) {
    const v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? 0 : v;
}

function getStr(id) {
    return document.getElementById(id).value || "";
}

function normalize(val, max) {
    if (max === 0) return 0;
    return Math.max(0, Math.min(1, val / max));
}

// ---------- Forças ----------
function calcForcaTime(golsFor, golsAgainst, winRate) {
    const ataque = normalize(golsFor, 3.0);
    const defesa = 1 - normalize(golsAgainst, 3.0);
    const vitoria = normalize(winRate, 100);
    return { ataque, defesa, vitoria };
}

// ---------- Probabilidades básicas ----------
function gerarProbabilidadesResultado(home, away, pesos) {
    const forçaCasa = home.ataque * pesos.ataque + home.defesa * pesos.defesa + home.vitoria * 0.1;
    const forçaFora = away.ataque * pesos.ataque + away.defesa * pesos.defesa + away.vitoria * 0.1;

    const diff = forçaCasa - forçaFora;
    let pCasa = 0.33 + diff * 0.35;
    let pFora = 0.33 - diff * 0.35;
    let pEmpate = 1 - (pCasa + pFora);

    pCasa = Math.max(0.03, Math.min(0.95, pCasa));
    pFora = Math.max(0.03, Math.min(0.95, pFora));
    pEmpate = Math.max(0.02, Math.min(0.94, pEmpate));

    const soma = pCasa + pEmpate + pFora;
    return { home: pCasa / soma, draw: pEmpate / soma, away: pFora / soma };
}

// ---------- Tipos de aposta heurísticos ----------
function probOver15(homeGoalsAvg, awayGoalsAvg) {
    const total = homeGoalsAvg + awayGoalsAvg;
    return normalize(total, 4);
}

function probOver25(homeGoalsAvg, awayGoalsAvg) {
    const total = homeGoalsAvg + awayGoalsAvg;
    return normalize(total - 0.5, 4);
}

function probUnder35(homeGoalsAvg, awayGoalsAvg) {
    const total = homeGoalsAvg + awayGoalsAvg;
    return Math.max(0, 1 - normalize(total, 4) * 1.1);
}

function probBothScore(homeGoalsAvg, awayGoalsAvg, homeGoalsAgainst, awayGoalsAgainst) {
    const forcaAtaque = normalize(homeGoalsAvg, 3) * normalize(awayGoalsAvg, 3);
    const vulnerabilidade = normalize(homeGoalsAgainst, 3) * normalize(awayGoalsAgainst, 3);
    return Math.min(1, forcaAtaque * 0.9 + vulnerabilidade * 0.6);
}

function probMore5Corners(homeCorners, awayCorners) {
    return normalize(homeCorners + awayCorners, 12);
}

// Empate Anula (Draw No Bet)
function probDrawNoBet(homeProb, awayProb, drawProb) {
    const denom = Math.max(0.0001, 1 - drawProb);
    return { home: homeProb / denom, away: awayProb / denom };
}

// Dupla Chance heurística
function probDoubleChance(homeProb, drawProb, awayProb, which) {
    if (which === 'homeOrDraw') return Math.min(1, homeProb + drawProb);
    if (which === 'awayOrDraw') return Math.min(1, awayProb + drawProb);
    return 0;
}

// ---------- Geração de palpites ----------
function gerarPalpitesOrdenados() {
    const homeName = getStr("homeName") || "Casa";
    const awayName = getStr("awayName") || "Fora";

    const homeGolsFor = getFloat("homeGolsFor");
    const homeGolsAgainst = getFloat("homeGolsAgainst");
    const awayGolsFor = getFloat("awayGolsFor");
    const awayGolsAgainst = getFloat("awayGolsAgainst");
    const homeCorners = getFloat("homeCorners");
    const awayCorners = getFloat("awayCorners");
    const homeWinRate = getFloat("homeWinRate");
    const awayWinRate = getFloat("awayWinRate");

    const pesos = {
        ataque: parseFloat(document.getElementById("pesoAtaque").value) || 0.6,
        defesa: parseFloat(document.getElementById("pesoDefesa").value) || 0.4,
    };

    const home = calcForcaTime(homeGolsFor, homeGolsAgainst, homeWinRate);
    const away = calcForcaTime(awayGolsFor, awayGolsAgainst, awayWinRate);

    const probsResultado = gerarProbabilidadesResultado(home, away, pesos);
    const probO15 = probOver15(homeGolsFor, awayGolsFor);
    const probO25 = probOver25(homeGolsFor, awayGolsFor);
    const probU35 = probUnder35(homeGolsFor, awayGolsFor);
    const probBTTS = probBothScore(homeGolsFor, awayGolsFor, homeGolsAgainst, awayGolsAgainst);
    const probCorners5 = probMore5Corners(homeCorners, awayCorners);
    const dnb = probDrawNoBet(probsResultado.home, probsResultado.away, probsResultado.draw);
    const dcHomeOrDraw = probDoubleChance(probsResultado.home, probsResultado.draw, probsResultado.away, 'homeOrDraw');
    const dcAwayOrDraw = probDoubleChance(probsResultado.home, probsResultado.draw, probsResultado.away, 'awayOrDraw');

    const palpites = [
        { tag: `${homeName} vence`, key: "homeWin", score: Math.round(probsResultado.home * 100) },
        { tag: "Empate", key: "draw", score: Math.round(probsResultado.draw * 100) },
        { tag: `${awayName} vence`, key: "awayWin", score: Math.round(probsResultado.away * 100) },
        { tag: "+1.5 gols", key: "over15", score: Math.round(probO15 * 100) },
        { tag: "+2.5 gols", key: "over25", score: Math.round(probO25 * 100) },
        { tag: "Under 3.5 gols", key: "under35", score: Math.round(probU35 * 100) },
        { tag: "Ambos marcam (BTTS)", key: "btts", score: Math.round(probBTTS * 100) },
        { tag: "+5 escanteios", key: "corners5", score: Math.round(probCorners5 * 100) },
        { tag: "DNB Casa", key: "dnbHome", score: Math.round(dnb.home * 100) },
        { tag: "DNB Fora", key: "dnbAway", score: Math.round(dnb.away * 100) },
        { tag: "Dupla Casa/Empate", key: "dcHomeDraw", score: Math.round(dcHomeOrDraw * 100) },
        { tag: "Dupla Fora/Empate", key: "dcAwayDraw", score: Math.round(dcAwayOrDraw * 100) },
    ];

    palpites.sort((a, b) => b.score - a.score);
    const chartData = palpites.slice(0, 6).map(p => ({ label: p.tag, value: p.score }));

    const diagnostics = {
        probsResultado, probO15, probO25, probU35, probBTTS, probCorners5, dnb, dcHomeOrDraw, dcAwayOrDraw,
        homeName, awayName, homeGolsFor, awayGolsFor, homeGolsAgainst, awayGolsAgainst, homeCorners, awayCorners
    };

    return { palpites, chartData, diagnostics };
}

// ---------- Exibição ----------
function mostrarResultados() {
    const { palpites, chartData, diagnostics } = gerarPalpitesOrdenados();
    const list = document.getElementById("palpitesList");
    list.innerHTML = "";

    palpites.slice(0, 6).forEach(p => {
        const li = document.createElement("li");
        li.className = "palpite-item";
        const explanation = explicacaoCurta(p.key, diagnostics);
        li.innerHTML = `<strong>${p.tag}</strong> — Confiança: ${p.score}%<small>${explanation}</small>`;
        list.appendChild(li);
    });

    const analysis = document.getElementById("analysisText");
    analysis.innerHTML =
        `<p><strong>Odds 1X2:</strong> Casa ${(diagnostics.probsResultado.home * 100).toFixed(1)}% — Empate ${(diagnostics.probsResultado.draw * 100).toFixed(1)}% — Fora ${(diagnostics.probsResultado.away * 100).toFixed(1)}%</p>` +
        `<p><strong>Over 1.5:</strong> ${(diagnostics.probO15 * 100).toFixed(0)}% · <strong>Over 2.5:</strong> ${(diagnostics.probO25 * 100).toFixed(0)}% · <strong>Under 3.5:</strong> ${(diagnostics.probU35 * 100).toFixed(0)}%</p>` +
        `<p><strong>BTTS:</strong> ${(diagnostics.probBTTS * 100).toFixed(0)}% · <strong>+5 escanteios:</strong> ${(diagnostics.probCorners5 * 100).toFixed(0)}%</p>` +
        `<p><strong>Empate Anula:</strong> Casa ${(diagnostics.dnb.home * 100).toFixed(0)}% · Fora ${(diagnostics.dnb.away * 100).toFixed(0)}%</p>` +
        `<p><strong>Dupla Chance:</strong> Casa/Empate ${(diagnostics.dcHomeOrDraw * 100).toFixed(0)}% · Fora/Empate ${(diagnostics.dcAwayOrDraw * 100).toFixed(0)}%</p>`;

    renderChart(chartData);
}

function explicacaoCurta(key, d) {
    switch (key) {
        case 'homeWin': return `Força Casa ≈ ${(d.probsResultado.home * 100).toFixed(0)}%.`;
        case 'awayWin': return `Força Fora ≈ ${(d.probsResultado.away * 100).toFixed(0)}%.`;
        case 'draw': return `Empate provável se forças equilibradas.`;
        case 'over15': return `Média gols: ${(d.homeGolsFor + d.awayGolsFor).toFixed(2)}.`;
        case 'over25': return `Média gols sugere >2.5.`;
        case 'under35': return `Total baixo esperado.`;
        case 'btts': return `Ambos marcam provável.`;
        case 'corners5': return `Soma escanteios: ${(d.homeCorners + d.awayCorners).toFixed(1)}.`;
        case 'dnbHome': return `Vantagem de força sem empate.`;
        case 'dnbAway': return `Vantagem de força sem empate.`;
        case 'dcHomeDraw': return `Cobre Casa ou Empate.`;
        case 'dcAwayDraw': return `Cobre Fora ou Empate.`;
        default: return '';
    }
}

// ---------- Chart.js ----------
let chartInstance = null;

function renderChart(data) {
    const canvas = document.getElementById("probChart");
    const ctx = canvas.getContext("2d");

    // Ajusta o canvas ao tamanho do container
    canvas.height = canvas.parentElement.clientHeight - document.getElementById("analysisText").clientHeight - 16;

    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);

    if (chartInstance) chartInstance.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255,127,80,0.8)');
    gradient.addColorStop(1, 'rgba(96,165,250,0.8)');

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Confiança (%)',
                data: values,
                backgroundColor: gradient,
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff' }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#e6eef8', font: { size: 12 } } },
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#e6eef8', font: { size: 12 } } }
            }
        }
    });
}

// ---------- Botões ----------
document.getElementById("generate").addEventListener("click", mostrarResultados);

document.getElementById("clear").addEventListener("click", () => {
    // Limpa todos os inputs
    const inputs = document.querySelectorAll("#statsForm input");
    inputs.forEach(input => input.value = "");

    // Limpa lista de palpites e análise
    document.getElementById("palpitesList").innerHTML = "";
    document.getElementById("analysisText").innerHTML = "";

    // Destroi gráfico
    if (chartInstance) chartInstance.destroy();
});

document.getElementById("fillExample").addEventListener("click", () => {
    document.getElementById("homeName").value = "Ponte Preta";
    document.getElementById("awayName").value = "Náutico";
    document.getElementById("homeGolsFor").value = 1.4;
    document.getElementById("homeGolsAgainst").value = 0.9;
    document.getElementById("homeCorners").value = 4.2;
    document.getElementById("homeWinRate").value = 60;
    document.getElementById("awayGolsFor").value = 1.1;
    document.getElementById("awayGolsAgainst").value = 1.2;
    document.getElementById("awayCorners").value = 3.8;
    document.getElementById("awayWinRate").value = 45;
});


