function parsePlacar(placar) {
    const partes = placar.split('-').map(p => parseInt(p.trim()));
    if (partes.length !== 2 || isNaN(partes[0]) || isNaN(partes[1])) return null;
    return { golsA: partes[0], golsB: partes[1] };
}

function mediaGols(jogos) {
    let total = 0, ambos = 0, count = 0;
    jogos.forEach(j => {
        const p = parsePlacar(j.value);
        if (p) {
            total += p.golsA + p.golsB;
            if (p.golsA > 0 && p.golsB > 0) ambos++;
            count++;
        }
    });
    if (count === 0) return { media: 0, ambos: 0 };
    return {
        media: total / count,
        ambos: ambos / count
    };
}

function calcular() {
    const jogosA = [...document.querySelectorAll('#timeA input')];
    const jogosB = [...document.querySelectorAll('#timeB input')];
    const h2h = [...document.querySelectorAll('#h2h input')];

    const mA = mediaGols(jogosA);
    const mB = mediaGols(jogosB);
    const mH2H = mediaGols(h2h);

    const mediaTotal = (mA.media + mB.media + mH2H.media) / 3;
    const ambosProb = ((mA.ambos + mB.ambos + mH2H.ambos) / 3) * 100;

    // Probabilidades estimadas
    const over15 = mediaTotal > 1.5 ? "Alta" : "Baixa";
    const over25 = mediaTotal > 2.5 ? "Moderada" : "Baixa";
    const under35 = mediaTotal < 3.5 ? "Alta" : "Baixa";
    const ambosTexto = ambosProb > 60 ? "Alta" : ambosProb > 40 ? "Moderada" : "Baixa";

    // Sugestão final
    let melhorOpcao = "";
    if (mediaTotal > 3) melhorOpcao = "+2.5 gols";
    else if (ambosProb > 60) melhorOpcao = "Ambos marcam";
    else if (mediaTotal > 1.5) melhorOpcao = "+1.5 gols";
    else melhorOpcao = "-3.5 gols";

    document.getElementById('resultados').innerHTML = `
    <h3>📊 Resultados:</h3>
    <p><strong>Média total de gols:</strong> ${mediaTotal.toFixed(2)}</p>
    <p><strong>Ambos marcam (%):</strong> ${ambosProb.toFixed(0)}%</p>
    <hr>
    <p>➡️ <strong>+1.5 gols:</strong> ${over15}</p>
    <p>➡️ <strong>+2.5 gols:</strong> ${over25}</p>
    <p>➡️ <strong>Ambos marcam:</strong> ${ambosTexto}</p>
    <p>➡️ <strong>-3.5 gols:</strong> ${under35}</p>
    <hr>
    <h3>🎯 Melhor opção: <span style="color:#22d3ee">${melhorOpcao}</span></h3>
  `;
}
