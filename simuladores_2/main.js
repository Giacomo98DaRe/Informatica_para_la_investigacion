// main.js for roc_curve (simuladores_2)
const samples = [
  { label: 1, score: 0.92 }, { label: 1, score: 0.87 }, { label: 1, score: 0.83 },
  { label: 1, score: 0.78 }, { label: 1, score: 0.74 }, { label: 1, score: 0.68 },
  { label: 1, score: 0.61 }, { label: 1, score: 0.55 }, { label: 1, score: 0.49 },
  { label: 1, score: 0.38 }, { label: 0, score: 0.71 }, { label: 0, score: 0.63 },
  { label: 0, score: 0.54 }, { label: 0, score: 0.45 }, { label: 0, score: 0.39 },
  { label: 0, score: 0.31 }, { label: 0, score: 0.24 }, { label: 0, score: 0.18 },
  { label: 0, score: 0.12 }, { label: 0, score: 0.07 }
];

const positives = samples.filter((s) => s.label === 1).length;
const negatives = samples.filter((s) => s.label === 0).length;

const canvas = document.getElementById("rocCanvas");
const ctx = canvas.getContext("2d");
const thresholdInput = document.getElementById("threshold");
const thresholdLabel = document.getElementById("thresholdLabel");

const ui = {
  tp: document.getElementById("tp"),
  fp: document.getElementById("fp"),
  fn: document.getElementById("fn"),
  tn: document.getElementById("tn"),
  tprMetric: document.getElementById("tprMetric"),
  tnrMetric: document.getElementById("tnrMetric"),
  aucMetric: document.getElementById("aucMetric")
};

const margin = { left: 50, right: 22, top: 20, bottom: 44 };
const w = canvas.width - margin.left - margin.right;
const h = canvas.height - margin.top - margin.bottom;

const uniqueThresholds = [...new Set(samples.map((s) => s.score))].sort((a, b) => b - a);
const rocThresholds = [1.01, ...uniqueThresholds, -0.01];

function confusionAt(threshold) {
  let tp = 0; let fp = 0; let tn = 0; let fn = 0;
  for (const s of samples) {
    const pred = s.score >= threshold ? 1 : 0;
    if (pred === 1 && s.label === 1) tp += 1;
    if (pred === 1 && s.label === 0) fp += 1;
    if (pred === 0 && s.label === 0) tn += 1;
    if (pred === 0 && s.label === 1) fn += 1;
  }
  const tpr = tp / positives; const fpr = fp / negatives; const tnr = tn / negatives;
  return { tp, fp, tn, fn, tpr, fpr, tnr };
}

const rocPoints = rocThresholds
  .map((t) => confusionAt(t))
  .map((m) => ({ fpr: m.fpr, tpr: m.tpr }))
  .sort((a, b) => (a.fpr - b.fpr) || (a.tpr - b.tpr));

function auc(points) {
  let area = 0;
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1]; const p1 = points[i];
    area += (p1.fpr - p0.fpr) * (p0.tpr + p1.tpr) * 0.5;
  }
  return area;
}

const aucValue = auc(rocPoints);

function pxX(v) { return margin.left + v * w; }
function pxY(v) { return margin.top + (1 - v) * h; }

function drawAxes() {
  ctx.strokeStyle = "#cfeff0"; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const t = i / 5; const x = pxX(t); const y = pxY(t);
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + w, y); ctx.stroke();
  }
  ctx.strokeStyle = "#9fd8d0"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, margin.top + h); ctx.lineTo(margin.left + w, margin.top + h); ctx.stroke();
  ctx.fillStyle = "#5b8b8a"; ctx.font = "12px Space Mono"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let i = 0; i <= 5; i += 1) { ctx.fillText((i / 5).toFixed(1), pxX(i / 5), margin.top + h + 8); }
  ctx.save(); ctx.translate(15, margin.top + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("TPR (Sensibilidad)", 0, 0); ctx.restore();
  ctx.fillText("FPR (1 - Especificidad)", margin.left + w / 2, canvas.height - 20);
}

function drawDiagonal() { ctx.setLineDash([6,6]); ctx.strokeStyle = "#bfeae3"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pxX(0), pxY(0)); ctx.lineTo(pxX(1), pxY(1)); ctx.stroke(); ctx.setLineDash([]); }

function drawRocCurve() {
  const startX = pxX(0); const startY = pxY(0);
  ctx.fillStyle = "rgba(0,169,154,0.10)"; ctx.beginPath(); ctx.moveTo(startX, startY);
  for (const p of rocPoints) ctx.lineTo(pxX(p.fpr), pxY(p.tpr));
  ctx.lineTo(pxX(1), pxY(0)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#00a99a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(startX, startY);
  for (const p of rocPoints) ctx.lineTo(pxX(p.fpr), pxY(p.tpr)); ctx.stroke();
}

function drawCurrentPoint(metrics) {
  const x = pxX(metrics.fpr); const y = pxY(metrics.tpr);
  ctx.fillStyle = "#007f6f"; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  const text = `FPR: ${metrics.fpr.toFixed(2)} | TPR: ${metrics.tpr.toFixed(2)}`;
  ctx.font = "12px Space Mono"; const textWidth = ctx.measureText(text).width; const pad = 7; const bw = textWidth + pad * 2; const bh = 24;
  let bx = x + 12; let by = y - 30; if (bx + bw > canvas.width - 4) bx = x - bw - 12; if (by < 4) by = y + 10;
  ctx.fillStyle = "rgba(255,255,255,0.96)"; ctx.strokeStyle = "#dff3f0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#0f2430"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(text, bx + pad, by + bh / 2 + 0.5);
}

function render(){
  const threshold = Number(thresholdInput.value); const metrics = confusionAt(threshold);
  thresholdLabel.textContent = `Umbral de decision: ${threshold.toFixed(2)}`;
  ui.tp.textContent = metrics.tp; ui.fp.textContent = metrics.fp; ui.fn.textContent = metrics.fn; ui.tn.textContent = metrics.tn;
  ui.tprMetric.textContent = metrics.tpr.toFixed(2); ui.tnrMetric.textContent = metrics.tnr.toFixed(2); ui.aucMetric.textContent = aucValue.toFixed(3);
  ctx.clearRect(0,0,canvas.width,canvas.height); drawAxes(); drawDiagonal(); drawRocCurve(); drawCurrentPoint(metrics);
}

thresholdInput.addEventListener("input", render);
render();
