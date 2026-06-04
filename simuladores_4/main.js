// main.js for rt_fractionation.html
const nInput = document.getElementById("nFractions");
const dInput = document.getElementById("dosePerFraction");
const nLabel = document.getElementById("nLabel");
const dLabel = document.getElementById("dLabel");

const canvas = document.getElementById("fractionCanvas");
const ctx = canvas.getContext("2d");

const warnBed = document.getElementById("warnBed");
const warnTumor = document.getElementById("warnTumor");

const ui = {
  curD: document.getElementById("curD"),
  curBedTumor: document.getElementById("curBedTumor"),
  curBedTissue: document.getElementById("curBedTissue"),
  curEqd2: document.getElementById("curEqd2"),
  refD: document.getElementById("refD"),
  refBedTumor: document.getElementById("refBedTumor"),
  refBedTissue: document.getElementById("refBedTissue"),
  refEqd2: document.getElementById("refEqd2")
};

const conventional = { n: 35, d: 2 };

function round1(v) {
  return (Math.round(v * 10) / 10).toFixed(1);
}

function planMetrics(n, d) {
  const D = n * d;
  const bedTumor = D * (1 + d / 10);
  const bedTissue = D * (1 + d / 3);
  const eqd2 = bedTumor / (1 + 2 / 10);
  return { D, bedTumor, bedTissue, eqd2 };
}

function updateCards(current, reference) {
  ui.curD.textContent = `${round1(current.D)} Gy`;
  ui.curBedTumor.textContent = `${round1(current.bedTumor)} Gy`;
  ui.curBedTissue.textContent = `${round1(current.bedTissue)} Gy`;
  ui.curEqd2.textContent = `${round1(current.eqd2)} Gy`;

  ui.refD.textContent = `${round1(reference.D)} Gy`;
  ui.refBedTumor.textContent = `${round1(reference.bedTumor)} Gy`;
  ui.refBedTissue.textContent = `${round1(reference.bedTissue)} Gy`;
  ui.refEqd2.textContent = `${round1(reference.eqd2)} Gy`;
}

function drawPlan(panelX, panelW, title, n, d, color) {
  const top = 26;
  const rowHeight = 24;
  const barHeight = 20;
  const rows = Math.ceil(n / 7);
  const slots = 7;
  const slotWidth = (panelW - 14) / slots;
  const barWidth = Math.max(2, (d / 20) * (slotWidth - 6));

  ctx.fillStyle = "#7a6799";
  ctx.font = "12px Space Mono";
  ctx.textAlign = "left";
  ctx.fillText(title, panelX, 14);

  for (let i = 0; i < n; i += 1) {
    const row = Math.floor(i / 7);
    const col = i % 7;
    if (row >= rows) continue;

    const x = panelX + col * slotWidth + 2;
    const y = top + row * rowHeight;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth, barHeight);
  }

  ctx.strokeStyle = "#e4d8ff";
  ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r += 1) {
    const y = top - 2 + r * rowHeight;
    ctx.beginPath();
    ctx.moveTo(panelX, y);
    ctx.lineTo(panelX + panelW, y);
    ctx.stroke();
  }
}

function drawChart(n, d) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const leftX = 14;
  const panelW = 270;
  const rightX = 314;

  drawPlan(leftX, panelW, "Actual", n, d, "#7b4de1");
  drawPlan(rightX, panelW, "Convencional", conventional.n, conventional.d, "#7a6799");
}

function updateWarnings(current, reference) {
  warnBed.style.display = current.bedTissue > reference.bedTissue ? "block" : "none";
  warnTumor.style.display = current.bedTumor < 40 ? "block" : "none";
}

function render() {
  const n = Number(nInput.value);
  const d = Number(dInput.value);
  nLabel.textContent = `${n} fracciones`;
  dLabel.textContent = `d = ${d.toFixed(1)} Gy/fraccion`;

  const current = planMetrics(n, d);
  const reference = planMetrics(conventional.n, conventional.d);

  updateCards(current, reference);
  drawChart(n, d);
  updateWarnings(current, reference);
}

nInput.addEventListener("input", render);
dInput.addEventListener("input", render);

render();
