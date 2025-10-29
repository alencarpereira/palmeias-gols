// ---------- Helpers ----------
function getFloat(id, fallback = 0.33) {
    const v = parseFloat(document.getElementById(id).value);
    if (isNaN(v) || v <= 0) return fallback;
    return v;
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

// ---------- Ajustes com finalizações ----------
function ajusteAtaque(ataqueBase, shots, shotsOnTarget) {
    const shotScore = normalize(shots, 20); // referência máxima
    const shotOTScore = normalize(shotsOnTarget, 10);
    return Math.min(1, ataqueBase * 0.7 + shotScore * 0.2 + shotOTScore * 0.1);
}

// ---------- Penalidade por cartões ----------
function penalidadeCartoes(yellow, red) {
    return Math.min(0.2, yellow * 0.05 + red * 0.1);
}

// ---------- Odds para probabilidade ----------
function oddsToProb(odd) {
    if (!odd || odd <= 1) return 0.33; // fallback neutro
    return 1 / odd;
}

// ---------- Combina probabilidade dos dados + odds ----------
function combinarProbabilidade(probDados, probOdd) {
    const PESO_DADOS = 0.6;
    const PESO_ODDS = 0.4;
    return probDados * PESO_DADOS + probOdd * PESO_ODDS;
}

// ---------- Probabilidades básicas ----------
function gerarProbabilidadesResultado(home, away, pesos, odds) {
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

    // Converte odds em probabilidade e combina
    const oddCasa = oddsToProb(odds.home);
    const oddEmpate = oddsToProb(odds.draw);
    const oddFora = oddsToProb(odds.away);
    const totalOdd = oddCasa + oddEmpate + oddFora;

    const pCasaFinal = combinarProbabilidade(pCasa / soma, oddCasa / totalOdd);
    const pEmpateFinal = combinarProbabilidade(pEmpate / soma, oddEmpate / totalOdd);
    const pForaFinal = combinarProbabilidade(pFora / soma, oddFora / totalOdd);
    const totalFinal = pCasaFinal + pEmpateFinal + pForaFinal;

    return {
        home: pCasaFinal / totalFinal,
        draw: pEmpateFinal / totalFinal,
        away: pForaFinal / totalFinal
    };
}

// ---------- Tipos de aposta ----------
function probOver15(homeGoalsAvg, awayGoalsAvg, odd) {
    const total = homeGoalsAvg + awayGoalsAvg;
    const base = normalize(total, 4);
    const probOdd = oddsToProb(odd);
    return combinarProbabilidade(base, probOdd);
}

function probOver25(homeGoalsAvg, awayGoalsAvg, odd) {
    const total = homeGoalsAvg + awayGoalsAvg;
    const base = normalize(total - 0.5, 4);
    const probOdd = oddsToProb(odd);
    return combinarProbabilidade(base, probOdd);
}

function probUnder35(homeGoalsAvg, awayGoalsAvg, odd) {
    const total = homeGoalsAvg + awayGoalsAvg;
    const base = Math.max(0, 1 - normalize(total, 4) * 1.1);
    const probOdd = oddsToProb(odd);
    return combinarProbabilidade(base, probOdd);
}

function probBothScore(homeGoalsAvg, awayGoalsAvg, homeGoalsAgainst, awayGoalsAgainst, odd) {
    const forcaAtaque = normalize(homeGoalsAvg, 3) * normalize(awayGoalsAvg, 3);
    const vulnerabilidade = normalize(homeGoalsAgainst, 3) * normalize(awayGoalsAgainst, 3);
    const base = Math.min(1, forcaAtaque * 0.9 + vulnerabilidade * 0.6);
    const probOdd = oddsToProb(odd);
    return combinarProbabilidade(base, probOdd);
}

function probMore5Corners(homeCorners, awayCorners) {
    return normalize(homeCorners + awayCorners, 12);
}

// ---------- Geração de palpites ----------
function gerarPalpitesOrdenados() {
    const homeName = getStr("homeName") || "Casa";
    const awayName = getStr("awayName") || "Fora";

    // Estatísticas dos times
    const homeGolsFor = getFloat("homeGolsFor", 1);
    const homeGolsAgainst = getFloat("homeGolsAgainst", 1);
    const awayGolsFor = getFloat("awayGolsFor", 1);
    const awayGolsAgainst = getFloat("awayGolsAgainst", 1);
    const homeCorners = getFloat("homeCorners", 4);
    const awayCorners = getFloat("awayCorners", 4);
    const homeWinRate = getFloat("homeWinRate", 50);
    const awayWinRate = getFloat("awayWinRate", 50);

    // Finalizações e cartões
    const homeShots = getFloat("homeShots", 10);
    const homeShotsOnTarget = getFloat("homeShotsOnTarget", 5);
    const homeYellowCards = getFloat("homeYellowCards", 0);
    const homeRedCards = getFloat("homeRedCards", 0);
    const awayShots = getFloat("awayShots", 10);
    const awayShotsOnTarget = getFloat("awayShotsOnTarget", 5);
    const awayYellowCards = getFloat("awayYellowCards", 0);
    const awayRedCards = getFloat("awayRedCards", 0);

    // Odds
    const odds = {
        home: getFloat("oddCasa"),
        draw: getFloat("oddEmpate"),
        away: getFloat("oddFora"),
        over15: getFloat("oddMais15"),
        over25: getFloat("oddMais25"),
        under35: getFloat("oddMenos35"),
        both: getFloat("oddAmbosMarcam"),
    };

    const pesos = {
        ataque: parseFloat(document.getElementById("pesoAtaque").value) || 0.6,
        defesa: parseFloat(document.getElementById("pesoDefesa").value) || 0.4,
    };

    let home = calcForcaTime(homeGolsFor, homeGolsAgainst, homeWinRate);
    let away = calcForcaTime(awayGolsFor, awayGolsAgainst, awayWinRate);

    // Ajuste ataque por finalizações
    home.ataque = ajusteAtaque(home.ataque, homeShots, homeShotsOnTarget);
    away.ataque = ajusteAtaque(away.ataque, awayShots, awayShotsOnTarget);

    // Probabilidades
    const probsResultado = gerarProbabilidadesResultado(home, away, pesos, odds);
    const probO15 = probOver15(homeGolsFor, awayGolsFor, odds.over15);
    const probO25 = probOver25(homeGolsFor, awayGolsFor, odds.over25);
    const probU35 = probUnder35(homeGolsFor, awayGolsFor, odds.under35);
    const probBTTS = probBothScore(homeGolsFor, awayGolsFor, homeGolsAgainst, awayGolsAgainst, odds.both);
    const probCorners5 = probMore5Corners(homeCorners, awayCorners);

    const palpites = [
        { tag: `${homeName} vence`, key: "homeWin", score: Math.round(probsResultado.home * 100) },
        { tag: "Empate", key: "draw", score: Math.round(probsResultado.draw * 100) },
        { tag: `${awayName} vence`, key: "awayWin", score: Math.round(probsResultado.away * 100) },
        { tag: "+1.5 gols", key: "over15", score: Math.round(probO15 * 100) },
        { tag: "+2.5 gols", key: "over25", score: Math.round(probO25 * 100) },
        { tag: "Under 3.5 gols", key: "under35", score: Math.round(probU35 * 100) },
        { tag: "Ambos marcam (BTTS)", key: "btts", score: Math.round(probBTTS * 100) },
        { tag: "+5 escanteios", key: "corners5", score: Math.round(probCorners5 * 100) },
    ];

    // Penalidade por cartões: aplicada apenas a apostas 1X2
    const cartoesPenalidade = penalidadeCartoes(
        homeYellowCards + awayYellowCards,
        homeRedCards + awayRedCards
    );
    palpites.forEach(p => {
        if (["homeWin", "awayWin", "draw"].includes(p.key)) {
            p.score = Math.max(0, p.score - Math.round(cartoesPenalidade * 100));
        }
    });

    palpites.sort((a, b) => b.score - a.score);
    const chartData = palpites.slice(0, 6).map(p => ({ label: p.tag, value: p.score }));

    const diagnostics = { probsResultado, probO15, probO25, probU35, probBTTS, probCorners5, homeName, awayName };
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
        `<p><strong>BTTS:</strong> ${(diagnostics.probBTTS * 100).toFixed(0)}% · <strong>+5 escanteios:</strong> ${(diagnostics.probCorners5 * 100).toFixed(0)}%</p>`;

    renderChart(chartData);
}

function explicacaoCurta(key, d) {
    switch (key) {
        case 'homeWin': return `Força Casa ≈ ${(d.probsResultado.home * 100).toFixed(0)}%.`;
        case 'awayWin': return `Força Fora ≈ ${(d.probsResultado.away * 100).toFixed(0)}%.`;
        case 'draw': return `Forças equilibradas, chance de empate.`;
        case 'over15': return `Média gols combinada alta.`;
        case 'over25': return `Ataques produtivos indicam +2.5.`;
        case 'under35': return `Tendência a poucos gols.`;
        case 'btts': return `Ambos têm potencial ofensivo.`;
        case 'corners5': return `Pressão ofensiva gera escanteios.`;
        default: return '';
    }
}

// ---------- Chart.js ----------
let chartInstance = null;
function renderChart(data) {
    const canvas = document.getElementById("probChart");
    const ctx = canvas.getContext("2d");
    canvas.height = 300;

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
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100 },
                x: { ticks: { color: '#fff' } }
            }
        }
    });
}

// ---------- Botões ----------
document.getElementById("generate").addEventListener("click", mostrarResultados);

document.getElementById("clear").addEventListener("click", () => {
    document.querySelectorAll("#statsForm input").forEach(input => {
        if (!["homeName", "awayName"].includes(input.id)) input.value = "";
    });
    document.getElementById("palpitesList").innerHTML = "";
    document.getElementById("analysisText").innerHTML = "";
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

    document.getElementById("homeShots").value = 10;
    document.getElementById("homeShotsOnTarget").value = 5;
    document.getElementById("homeYellowCards").value = 1;
    document.getElementById("homeRedCards").value = 0;
    document.getElementById("awayShots").value = 8;
    document.getElementById("awayShotsOnTarget").value = 4;
    document.getElementById("awayYellowCards").value = 1;
    document.getElementById("awayRedCards").value = 0;

    document.getElementById("oddCasa").value = 1.80;
    document.getElementById("oddEmpate").value = 3.20;
    document.getElementById("oddFora").value = 4.00;
    document.getElementById("oddMais15").value = 1.40;
    document.getElementById("oddMais25").value = 1.90;
    document.getElementById("oddMenos35").value = 1.60;
    document.getElementById("oddAmbosMarcam").value = 1.85;
});



