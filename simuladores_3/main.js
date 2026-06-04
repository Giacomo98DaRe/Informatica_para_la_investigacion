// main.js for kfold_validation (simuladores_3)
const TOTAL_SAMPLES = 60;
const samples = Array.from({ length: TOTAL_SAMPLES }, (_, i) => ({ id: i }));

const kRange = document.getElementById("kRange");
const kLabel = document.getElementById("kLabel");
const foldInfo = document.getElementById("foldInfo");
const samplesGrid = document.getElementById("samplesGrid");
const nextFoldBtn = document.getElementById("nextFoldBtn");
const foldSizeEl = document.getElementById("foldSize");
const iterationsEl = document.getElementById("iterations");

let k = Number(kRange.value);
let currentFold = 1;

function assignFold(index) { return (index % k) + 1; }
function countValidation() { return samples.reduce((acc, _, i) => acc + (assignFold(i) === currentFold ? 1 : 0), 0); }

function updateInfo() {
  const validationCount = countValidation();
  const trainingCount = TOTAL_SAMPLES - validationCount;
  foldInfo.textContent = `Fold ${currentFold}/${k} - Validacion: ${validationCount} muestras | Entrenamiento: ${trainingCount} muestras`;
  kLabel.textContent = `k = ${k} fold`;
  foldSizeEl.textContent = `~${Math.round(TOTAL_SAMPLES / k)}`;
  iterationsEl.textContent = String(k);
}

function renderSamples(animate) {
  if (!samplesGrid.children.length) {
    for (let i = 0; i < TOTAL_SAMPLES; i += 1) {
      const sq = document.createElement("div");
      sq.className = "sample";
      samplesGrid.appendChild(sq);
    }
  }
  Array.from(samplesGrid.children).forEach((el, i) => {
    if (animate) el.classList.add("fade");
    if (assignFold(i) === currentFold) el.classList.add("validation"); else el.classList.remove("validation");
  });
  if (animate) { void samplesGrid.offsetWidth; Array.from(samplesGrid.children).forEach((el) => el.classList.remove("fade")); }
  updateInfo();
}

kRange.addEventListener("input", () => { k = Number(kRange.value); currentFold = 1; renderSamples(true); });
nextFoldBtn.addEventListener("click", () => { currentFold = currentFold < k ? currentFold + 1 : 1; renderSamples(true); });

renderSamples(false);
