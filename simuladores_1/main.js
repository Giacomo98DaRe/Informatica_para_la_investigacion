// ── CONSTANTS ─────────────────────────────────────────────────────

const INVERSE_FEATURES = new Set(['GLCM Homogeneity','GLCM Correlation','Sphericity','Compactness']);

const CATEGORIES = {
  'First-order': ['Mean Intensity','Std Deviation','Entropy','Skewness','Kurtosis'],
  'Textura':     ['GLCM Contrast','GLCM Homogeneity','GLCM Correlation'],
  'Forma':       ['Sphericity','Volume (cm3)','Surface Area (cm2)','Compactness']
};

// Result: 6 resistencia / 3 estable / 3 respuesta → score 25% → NO RESPONDEDOR
// Resistencia: Mean Intensity, Std Deviation, Entropy, GLCM Contrast, GLCM Homogeneity, GLCM Correlation
// Estable:     Skewness, Kurtosis, Surface Area (cm2)
// Respuesta:   Sphericity, Volume (cm3), Compactness
const SAMPLE_DATA = {
  T0: {'Mean Intensity':847.3,'Std Deviation':124.6,'Entropy':3.42,'Skewness':1.24,'Kurtosis':4.87,
       'GLCM Contrast':18.74,'GLCM Homogeneity':0.612,'GLCM Correlation':0.841,
       'Sphericity':0.823,'Volume (cm3)':23.4,'Surface Area (cm2)':87.6,'Compactness':0.547},
  T1: {'Mean Intensity':861.4,'Std Deviation':127.2,'Entropy':3.50,'Skewness':1.240,'Kurtosis':4.875,
       'GLCM Contrast':19.42,'GLCM Homogeneity':0.603,'GLCM Correlation':0.829,
       'Sphericity':0.838,'Volume (cm3)':22.7,'Surface Area (cm2)':87.7,'Compactness':0.558},
  T2: {'Mean Intensity':874.8,'Std Deviation':129.8,'Entropy':3.57,'Skewness':1.244,'Kurtosis':4.882,
       'GLCM Contrast':20.08,'GLCM Homogeneity':0.594,'GLCM Correlation':0.818,
       'Sphericity':0.852,'Volume (cm3)':21.9,'Surface Area (cm2)':87.8,'Compactness':0.568},
  T3: {'Mean Intensity':890.6,'Std Deviation':132.7,'Entropy':3.63,'Skewness':1.247,'Kurtosis':4.888,
       'GLCM Contrast':20.54,'GLCM Homogeneity':0.584,'GLCM Correlation':0.808,
       'Sphericity':0.867,'Volume (cm3)':21.2,'Surface Area (cm2)':87.9,'Compactness':0.579},
  T4: {'Mean Intensity':906.6,'Std Deviation':135.8,'Entropy':3.69,'Skewness':1.250,'Kurtosis':4.900,
       'GLCM Contrast':21.03,'GLCM Homogeneity':0.575,'GLCM Correlation':0.799,
       'Sphericity':0.881,'Volume (cm3)':20.6,'Surface Area (cm2)':88.0,'Compactness':0.591}
};

const FEATURE_DESCRIPTIONS = {
  'Mean Intensity':     'Average signal intensity within the tumor volume. Reflects mean tissue density in MR-Linac images. A significant decrease typically indicates tumor regression.',
  'Std Deviation':      'Standard deviation of signal intensity. Quantifies heterogeneity of the signal distribution. Reduction suggests homogenization upon treatment response.',
  'Entropy':            'Irregularity of intensity distribution (Shannon entropy). High entropy = chaotic, heterogeneous pattern. Decrease signals texture regularization.',
  'Skewness':           'Asymmetry of the intensity histogram. High values indicate heavy tails. Tends to decrease with treatment response, but can remain stable.',
  'Kurtosis':           'Peakedness of the intensity distribution. Measures concentration of values around the mean. Modest decrease may indicate stable redistribution.',
  'GLCM Contrast':      'Local contrast between adjacent pixel pairs (GLCM). High contrast = irregular texture. An increase signals worsening heterogeneity (resistencia).',
  'GLCM Homogeneity':   'Local homogeneity of the GLCM. High values = smooth, uniform texture. INVERSE feature: an increase signals treatment response.',
  'GLCM Correlation':   'Linear correlation between adjacent pixel pairs (GLCM). High correlation = structured, repetitive patterns. INVERSE feature: increase signals response.',
  'Sphericity':         'How closely the tumor volume approximates a perfect sphere (0–1). INVERSE feature: increasing sphericity = more regular morphology = response.',
  'Volume (cm3)':       'Total Gross Tumor Volume (GTV) in cm³. Primary morphological parameter — a significant decrease is the clearest indicator of response.',
  'Surface Area (cm2)': 'Surface area of the tumor volume in cm². An increase while volume is stable suggests surface expansion, indicative of resistencia.',
  'Compactness':        'Ratio between volume and squared surface area. Measures how compact the tumor is. INVERSE feature: increase signals response.'
};

// ── STATE ─────────────────────────────────────────────────────────

let _lastData = null, _lastFilename = '', _lastResults = null;

// ── HELPERS ───────────────────────────────────────────────────────

function fmtVal(v) {
  return Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
}

// ── CLASSIFICATION ────────────────────────────────────────────────

function computeDelta(t0, tLast) { return ((tLast - t0) / Math.abs(t0)) * 100; }

function classify(name, delta) {
  if (INVERSE_FEATURES.has(name)) {
    if (delta >  3) return 'respuesta';
    if (delta < -3) return 'resistencia';
    return 'estable';
  } else {
    if (delta < -8) return 'respuesta';
    if (delta >  4) return 'resistencia';
    return 'estable';
  }
}

function getCategory(name) {
  for (const [cat, list] of Object.entries(CATEGORIES)) {
    if (list.includes(name)) return cat;
  }
  return 'Otro';
}

function sortFeatures(names) {
  const order = Object.values(CATEGORIES).flat();
  return names.slice().sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia < 0 && ib < 0) return 0;
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
}

// ── ANALYSIS ──────────────────────────────────────────────────────

function runAnalysis(data, filename) {
  _lastData = data; _lastFilename = filename || 'datos';
  const tps = Object.keys(data).sort();
  const t0key = tps[0], tLastKey = tps[tps.length - 1];
  const t0 = data[t0key], tLast = data[tLastKey];
  const features = sortFeatures(Object.keys(t0));

  const results = features.map(name => {
    const v0 = t0[name], vL = tLast[name];
    const delta = computeDelta(v0, vL);
    const cls = classify(name, delta);
    return { name, category: getCategory(name), v0, vL, delta, cls };
  });

  const nResp = results.filter(r => r.cls === 'respuesta').length;
  const nEst  = results.filter(r => r.cls === 'estable').length;
  const nRes  = results.filter(r => r.cls === 'resistencia').length;
  const score = Math.round((nResp / results.length) * 100);
  const label = score >= 60 ? 'RESPONDEDOR' : score >= 30 ? 'RESPUESTA PARCIAL' : 'NO RESPONDEDOR';
  const color = score >= 60 ? 'var(--green)' : score >= 30 ? 'var(--orange)' : 'var(--red)';

  _lastResults = { results, nResp, nEst, nRes, score, label, color, t0key, tLastKey, tps };
  showPipeline();
}

// ── PIPELINE (step-by-step) ───────────────────────────────────────

function showPipeline() {
  const { results, nResp, nEst, nRes, score, label, color, t0key, tLastKey, tps } = _lastResults;
  const n = results.length;

  document.getElementById('phase-upload').style.display   = 'none';
  document.getElementById('phase-pipeline').style.display = 'block';
  document.getElementById('pipeline-filename').textContent = _lastFilename;

  document.getElementById('pc1-text').innerHTML =
    `<code>${n} features</code> indexadas · <code>${tps.length} timepoints</code> detectados (${tps.join(' → ')})`;

  document.getElementById('pc2-text').innerHTML =
    `Fórmula aplicada: <code>Δ% = (T<sub>último</sub> − T<sub>0</sub>) / |T<sub>0</sub>| × 100</code><br>` +
    `Comparando <code>${t0key}</code> (basal) con <code>${tLastKey}</code> (último timepoint)`;

  document.getElementById('pc3-text').innerHTML =
    `Features directas: respuesta si Δ% &lt; −8% · resistencia si Δ% &gt; +4%<br>` +
    `Features inversas (Homogeneity, Correlation, Sphericity, Compactness): respuesta si Δ% &gt; +3%<br>` +
    `Resultado: <strong>${nResp} respuesta · ${nEst} estable · ${nRes} resistencia</strong>`;

  const pc4 = document.getElementById('pc4');
  pc4.className = 'pipe-card p-hidden ' +
    (score >= 60 ? 'highlight' : score >= 30 ? 'highlight-warn' : 'highlight-err');
  document.getElementById('pc4-title').textContent = `4 · Score de respuesta: ${score}%`;
  document.getElementById('pc4-text').innerHTML =
    `Score = ${nResp} features de respuesta / ${n} features totales × 100 = <strong style="color:${color}">${score}%</strong><br>` +
    `Clasificación final: <strong style="color:${color}">${label}</strong>`;

  ['pc1','pc2','pc3','pc4'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('visible');
    if (id !== 'pc1') el.classList.add('p-hidden');
  });

  requestAnimationFrame(() => requestAnimationFrame(() =>
    document.getElementById('pc1').classList.add('visible')
  ));
}

function advancePipeline(step) {
  const card = document.getElementById('pc' + step);
  card.classList.remove('p-hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    card.classList.add('visible');
    setTimeout(() => card.scrollIntoView({ behavior:'smooth', block:'nearest' }), 50);
  }));
}

// ── RESULTS ───────────────────────────────────────────────────────

function showResults() {
  const { results, nResp, nEst, nRes, score, label, color, t0key, tLastKey, tps } = _lastResults;

  document.getElementById('phase-pipeline').style.display = 'none';
  document.getElementById('phase-results').style.display  = 'block';
  document.getElementById('btn-nuevo').style.display      = 'block';

  document.getElementById('results-subtitle').textContent =
    `${tps.length} timepoints analizados (${t0key} → ${tLastKey}) · ${_lastFilename}`;

  // score panel
  document.getElementById('score-number').textContent = score + '%';
  document.getElementById('score-number').style.color = color;
  document.getElementById('score-label').textContent  = label;
  document.getElementById('score-label').style.color  = color;
  document.getElementById('score-bar').style.width    = score + '%';
  document.getElementById('score-bar').style.background = color;
  document.getElementById('cnt-resp').textContent = nResp;
  document.getElementById('cnt-est').textContent  = nEst;
  document.getElementById('cnt-res').textContent  = nRes;
  document.getElementById('score-note').textContent =
    `Score = features de respuesta / total · ${nResp}/${results.length}`;

  // feature table
  const tbody = document.getElementById('results-tbody');
  tbody.innerHTML = '';
  let lastCat = null;

  results.forEach(r => {
    if (r.category !== lastCat) {
      lastCat = r.category;
      const sep = document.createElement('tr');
      sep.className = 'cat-row';
      sep.innerHTML = `<td colspan="6">${r.category}</td>`;
      tbody.appendChild(sep);
    }
    const sign = r.delta >= 0 ? '+' : '';
    const dCls = r.delta < -0.01 ? 'delta-neg' : r.delta > 0.01 ? 'delta-pos' : 'delta-neu';
    const bCls = r.cls === 'respuesta' ? 'badge-resp' : r.cls === 'resistencia' ? 'badge-res' : 'badge-est';
    const safeDesc = (FEATURE_DESCRIPTIONS[r.name] || '').replace(/"/g, '&quot;');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="feature-cell">
        <span>${r.name}</span>
        <span class="info-icon" data-tooltip="${safeDesc}">i</span>
      </div></td>
      <td>${r.category}</td>
      <td class="val-mono">${fmtVal(r.v0)}</td>
      <td class="val-mono">${fmtVal(r.vL)}</td>
      <td class="${dCls}">${sign}${r.delta.toFixed(1)}%</td>
      <td><span class="badge ${bCls}">${r.cls}</span></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.info-icon').forEach(icon => {
    icon.addEventListener('mouseenter', () => showTooltip(icon));
    icon.addEventListener('mouseleave',  hideTooltip);
  });

  // bar chart
  document.getElementById('chart-wrap').innerHTML = buildChart(results);

  // populate feature dropdown and render first trend chart
  const sel = document.getElementById('feature-select');
  sel.innerHTML = '';
  results.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.name;
    opt.textContent = r.name;
    sel.appendChild(opt);
  });
  updateTrendChart();
}

// ── SVG BAR CHART ─────────────────────────────────────────────────

function buildChart(results) {
  const lm = 158, rm = 54, tm = 42, bm = 44, rowH = 24, bH = 13;
  const W = 460, chartW = W - lm - rm;
  const H = tm + results.length * rowH + bm;
  const cx = lm + chartW / 2;
  const maxDelta = Math.max(...results.map(r => Math.abs(r.delta)), 10);
  const scale = (chartW / 2) / maxDelta;

  const p = [];
  p.push(`<svg id="chart-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;font-family:Outfit,sans-serif">`);
  p.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);

  p.push(`<text x="${W/2}" y="18" text-anchor="middle" font-size="10" fill="#6880a8">Δ% respecto al timepoint basal · clasificación por feature</text>`);

  p.push(`<rect x="${lm}" y="${tm}" width="${chartW/2}" height="${results.length*rowH}" fill="#fdf0f0" opacity="0.35"/>`);
  p.push(`<rect x="${cx}" y="${tm}" width="${chartW/2}" height="${results.length*rowH}" fill="#f0faf5" opacity="0.35"/>`);

  p.push(`<text x="${lm+chartW*0.25}" y="${tm-6}" text-anchor="middle" font-size="8.5" fill="#d43838">← Δ% negativo</text>`);
  p.push(`<text x="${lm+chartW*0.75}" y="${tm-6}" text-anchor="middle" font-size="8.5" fill="#18a858">Δ% positivo →</text>`);

  p.push(`<line x1="${cx}" y1="${tm-2}" x2="${cx}" y2="${H-bm+2}" stroke="#d8e2f5" stroke-width="1.5" stroke-dasharray="4,3"/>`);

  results.forEach((r, i) => {
    const y   = tm + i * rowH;
    const midY = y + rowH / 2;
    const len  = Math.abs(r.delta) * scale;
    const color = r.cls === 'respuesta' ? '#18a858' : r.cls === 'resistencia' ? '#d43838' : '#6880a8';
    const barX  = r.delta < 0 ? cx - len : cx;
    const sign  = r.delta >= 0 ? '+' : '';
    const label = `${sign}${r.delta.toFixed(1)}%`;

    if (i % 2 === 0) p.push(`<rect x="${lm}" y="${y}" width="${chartW}" height="${rowH}" fill="#f5f7fb" opacity="0.5"/>`);

    const shortName = r.name.length > 20 ? r.name.slice(0,18)+'…' : r.name;
    p.push(`<text x="${lm-6}" y="${midY+4}" text-anchor="end" font-size="10" fill="#1a2440">${shortName}</text>`);

    if (len > 0.5) p.push(`<rect x="${barX}" y="${midY-bH/2}" width="${len}" height="${bH}" rx="3" fill="${color}" opacity="0.82"/>`);

    if (len > 30) {
      p.push(`<text x="${barX+len/2}" y="${midY+3.5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="#fff" font-weight="500">${label}</text>`);
    } else {
      const lx = r.delta < 0 ? cx - len - 3 : cx + len + 3;
      const anchor = r.delta < 0 ? 'end' : 'start';
      p.push(`<text x="${lx}" y="${midY+3.5}" text-anchor="${anchor}" font-family="JetBrains Mono,monospace" font-size="8" fill="${color}" font-weight="500">${label}</text>`);
    }
  });

  p.push(`<text x="${cx}" y="${H-bm+14}" text-anchor="middle" font-size="9" fill="#6880a8">0%</text>`);

  const ly = H - 14;
  const items = [['respuesta','#18a858'],['estable','#6880a8'],['resistencia','#d43838']];
  const lgW = 240, lgX = (W - lgW) / 2;
  items.forEach(([lbl, col], i) => {
    const x = lgX + i * (lgW / 3);
    p.push(`<rect x="${x}" y="${ly-8}" width="10" height="10" rx="2" fill="${col}" opacity="0.82"/>`);
    p.push(`<text x="${x+14}" y="${ly}" font-size="9" fill="#6880a8">${lbl}</text>`);
  });

  p.push('</svg>');
  return p.join('');
}

// ── SVG TREND (LINE) CHART ────────────────────────────────────────

function buildTrendChart(featureName) {
  const { tps, results } = _lastResults;
  const values = tps.map(tp => (_lastData[tp] || {})[featureName]);
  if (values.some(v => v === undefined)) return '';

  const W = 520, H = 190;
  const lm = 58, rm = 24, tm = 24, bm = 36;
  const cW = W - lm - rm, cH = H - tm - bm;

  const minV = Math.min(...values), maxV = Math.max(...values);
  const pad  = (maxV - minV) * 0.25 || Math.abs(maxV) * 0.1 || 0.1;
  const vMin = minV - pad, vMax = maxV + pad;

  const toX = i => lm + (tps.length > 1 ? (i / (tps.length - 1)) * cW : cW / 2);
  const toY = v => tm + cH - ((v - vMin) / (vMax - vMin)) * cH;
  const pts  = values.map((v, i) => [toX(i), toY(v)]);

  const cls   = (results.find(r => r.name === featureName) || {}).cls || 'estable';
  const color = cls === 'respuesta' ? '#18a858' : cls === 'resistencia' ? '#d43838' : '#6880a8';

  const p = [];
  p.push(`<svg id="trend-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;font-family:Outfit,sans-serif">`);
  p.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);

  // horizontal grid lines + y-axis labels
  const gridN = 4;
  for (let gi = 0; gi <= gridN; gi++) {
    const y = tm + (gi / gridN) * cH;
    const v = vMax - (gi / gridN) * (vMax - vMin);
    p.push(`<line x1="${lm}" y1="${y.toFixed(1)}" x2="${lm+cW}" y2="${y.toFixed(1)}" stroke="#d8e2f5" stroke-width="1"/>`);
    p.push(`<text x="${(lm-6).toFixed(1)}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#6880a8">${fmtVal(v)}</text>`);
  }

  // x-axis ticks + timepoint labels
  tps.forEach((tp, i) => {
    const x = toX(i).toFixed(1);
    p.push(`<line x1="${x}" y1="${(tm+cH).toFixed(1)}" x2="${x}" y2="${(tm+cH+4).toFixed(1)}" stroke="#d8e2f5" stroke-width="1"/>`);
    p.push(`<text x="${x}" y="${H-7}" text-anchor="middle" font-size="10" fill="#1a2440" font-weight="500">${tp}</text>`);
  });

  // area fill
  if (pts.length > 1) {
    const areaD = `M ${pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} ` +
      `L ${pts[pts.length-1][0].toFixed(1)},${(tm+cH).toFixed(1)} L ${pts[0][0].toFixed(1)},${(tm+cH).toFixed(1)} Z`;
    p.push(`<path d="${areaD}" fill="${color}" opacity="0.09"/>`);

    const lineD = `M ${pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')}`;
    p.push(`<path d="${lineD}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`);
  }

  // dots + value labels
  pts.forEach(([x, y], i) => {
    p.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${color}" stroke="#fff" stroke-width="2"/>`);
    const labelY = (y - 12) < tm + 2 ? y + 18 : y - 10;
    // anchor first label left, last label right, others centered — avoids overlap with y-axis
    let anchor, lx;
    if (i === 0)              { anchor = 'start'; lx = x + 4; }
    else if (i === pts.length - 1) { anchor = 'end';   lx = x - 4; }
    else                      { anchor = 'middle'; lx = x; }
    p.push(`<text x="${lx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" ` +
      `font-family="JetBrains Mono,monospace" font-size="8.5" fill="${color}" font-weight="500">${fmtVal(values[i])}</text>`);
  });

  p.push('</svg>');
  return p.join('');
}

function updateTrendChart() {
  const sel = document.getElementById('feature-select');
  if (!sel || !_lastData || !_lastResults) return;
  document.getElementById('trend-chart-wrap').innerHTML = buildTrendChart(sel.value);
}

// ── TOOLTIP ───────────────────────────────────────────────────────

const tooltip = document.getElementById('feature-tooltip');

function showTooltip(icon) {
  tooltip.textContent = icon.dataset.tooltip;
  tooltip.style.display = 'block';
  const r = icon.getBoundingClientRect();
  const ttW = tooltip.offsetWidth, ttH = tooltip.offsetHeight;
  let left = r.left + r.width / 2 - ttW / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - ttW - 8));
  let top = r.top - ttH - 10;
  if (top < 8) top = r.bottom + 10;
  tooltip.style.left = left + 'px';
  tooltip.style.top  = top  + 'px';
}
function hideTooltip() { tooltip.style.display = 'none'; }

// ── FILE LOADING ──────────────────────────────────────────────────

document.getElementById('file-input').addEventListener('change', function(e) {
  const f = e.target.files[0];
  if (f) loadExcel(f);
  this.value = '';
});

const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) loadExcel(f);
});

function loadExcel(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array' });
    const data = {};
    wb.SheetNames.forEach(name => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header:1 });
      const d = {};
      rows.slice(1).forEach(r => { if (r[0] && r[1] !== undefined) d[r[0]] = +r[1]; });
      if (Object.keys(d).length) data[name] = d;
    });
    if (!Object.keys(data).length) { alert('No se pudieron leer datos. Verifica el formato.'); return; }
    _lastData = data;
    _lastFilename = file.name;
    const info = document.getElementById('loaded-file');
    info.textContent = '✓ ' + file.name;
    info.style.display = 'block';
    document.getElementById('btn-analyze').disabled = false;
  };
  reader.readAsArrayBuffer(file);
}

function startAnalysis() {
  if (_lastData) runAnalysis(_lastData, _lastFilename);
}

// ── DOWNLOAD ──────────────────────────────────────────────────────

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJSON() {
  if (!_lastResults) return;
  const { results, score, label, t0key, tLastKey, nResp, nEst, nRes, tps } = _lastResults;
  const payload = {
    file: _lastFilename,
    analysis: { timepoints: tps, baseline: t0key, last: tLastKey },
    score: { value: score, label },
    counts: { respuesta: nResp, estable: nEst, resistencia: nRes },
    features: results.map(r => ({
      name: r.name, category: r.category,
      baseline: r.v0, last: r.vL,
      deltaPct: parseFloat(r.delta.toFixed(2)),
      classification: r.cls
    }))
  };
  downloadBlob(JSON.stringify(payload, null, 2), 'application/json', 'informe_delta_radiomics.json');
}

function downloadChartSVG() {
  const svg = document.getElementById('chart-svg');
  if (!svg) return;
  downloadBlob(svg.outerHTML, 'image/svg+xml', 'grafico_delta_radiomics.svg');
}

function downloadTrendSVG() {
  const svg = document.getElementById('trend-svg');
  if (!svg) return;
  const sel = document.getElementById('feature-select');
  const safeName = (sel.value || 'feature').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  downloadBlob(svg.outerHTML, 'image/svg+xml', `evolucion_${safeName}.svg`);
}

// ── RESET ─────────────────────────────────────────────────────────

function resetToUpload() {
  document.getElementById('phase-pipeline').style.display = 'none';
  document.getElementById('phase-results').style.display  = 'none';
  document.getElementById('btn-nuevo').style.display      = 'none';
  document.getElementById('phase-upload').style.display   = 'block';
  document.getElementById('results-tbody').innerHTML      = '';
  document.getElementById('chart-wrap').innerHTML         = '';
  document.getElementById('trend-chart-wrap').innerHTML   = '';
  document.getElementById('feature-select').innerHTML     = '';
  document.getElementById('loaded-file').style.display   = 'none';
  document.getElementById('btn-analyze').disabled         = true;
  _lastData = null; _lastFilename = ''; _lastResults = null;
}
