// main.js extracted from radiomic_features.html
const initialImage = [
  [10, 10, 20, 20, 15, 15, 20, 20, 10, 10],
  [10, 30, 50, 60, 55, 55, 60, 50, 30, 10],
  [20, 50, 90, 120, 130, 130, 120, 90, 50, 20],
  [20, 60, 120, 180, 200, 200, 180, 120, 60, 20],
  [15, 55, 130, 200, 230, 230, 200, 130, 55, 15],
  [15, 55, 130, 200, 230, 230, 200, 130, 55, 15],
  [20, 60, 120, 180, 200, 200, 180, 120, 60, 20],
  [20, 50, 90, 120, 130, 130, 120, 90, 50, 20],
  [10, 30, 50, 60, 55, 55, 60, 50, 30, 10],
  [10, 10, 20, 20, 15, 15, 20, 20, 10, 10]
];

let image = initialImage.map((row) => [...row]);

const featureSelect = document.getElementById("featureSelect");
const pixelGrid = document.getElementById("pixelGrid");
const featureMeta = document.getElementById("featureMeta");
const formulaBox = document.getElementById("formulaBox");
const valueBox = document.getElementById("valueBox");
const resetBtn = document.getElementById("resetBtn");

const features = {
  mean: {
    title: "Mean Intensity",
    category: "First-order",
    formula: "mu = (1/N) * Sigma I(i,j)",
    calc: (arr) => {
      const values = arr.flat();
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
  },
  std: {
    title: "Std Deviation",
    category: "First-order",
    formula: "sigma = sqrt((1/N) * Sigma (I(i,j) - mu)^2)",
    calc: (arr) => {
      const values = arr.flat();
      const mu = values.reduce((a, b) => a + b, 0) / values.length;
      const varVal = values.reduce((acc, v) => acc + (v - mu) ** 2, 0) / values.length;
      return Math.sqrt(varVal);
    }
  },
  entropy: {
    title: "Entropy",
    category: "Texture",
    formula: "H = -Sigma p(k) * log2(p(k))  (8 bins)",
    calc: (arr) => {
      const values = arr.flat();
      const bins = Array(8).fill(0);
      for (const v of values) {
        const idx = Math.min(7, Math.floor(v / 32));
        bins[idx] += 1;
      }
      const n = values.length;
      let h = 0;
      for (const count of bins) {
        if (count === 0) continue;
        const p = count / n;
        h -= p * Math.log2(p);
      }
      return h;
    }
  },
  contrast: {
    title: "Contrast",
    category: "Texture",
    formula: "C = (1/N) * Sigma |I(i,j) - I(i,j+1)|",
    calc: (arr) => {
      let total = 0;
      let pairs = 0;
      for (let r = 0; r < arr.length; r += 1) {
        for (let c = 0; c < arr[r].length - 1; c += 1) {
          total += Math.abs(arr[r][c] - arr[r][c + 1]);
          pairs += 1;
        }
      }
      return pairs === 0 ? 0 : total / pairs;
    }
  },
  energy: {
    title: "Energy",
    category: "First-order",
    formula: "E = Sigma (I(i,j)/255)^2  (0-100)",
    calc: (arr) => {
      const values = arr.flat();
      return values.reduce((acc, v) => acc + (v / 255) ** 2, 0);
    }
  }
};

function paintCell(cell, value) {
  // set CSS variable used by stylesheet to render background
  cell.style.setProperty('--v', String(value));
  cell.textContent = String(value);
  cell.dataset.value = String(value);
  // toggle color class: light text for dark pixels, dark text otherwise
  if (value <= 140) {
    cell.classList.remove('dark');
    cell.classList.add('light');
  } else {
    cell.classList.remove('light');
    cell.classList.add('dark');
  }
}

function commitEdit(r, c, input) {
  const parsed = Number(input.value);
  const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(255, Math.round(parsed))) : image[r][c];
  image[r][c] = safe;
  renderGrid();
  updateFeaturePanel();
}

function openEditor(cell, r, c) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "255";
  input.step = "1";
  input.value = String(image[r][c]);
  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      input.blur();
    }
  });

  input.addEventListener("blur", () => commitEdit(r, c, input));
}

function renderGrid() {
  pixelGrid.innerHTML = "";
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 10; c += 1) {
      const cell = document.createElement("div");
      cell.className = "pixel";
      paintCell(cell, image[r][c]);
      cell.addEventListener("click", () => openEditor(cell, r, c));
      pixelGrid.appendChild(cell);
    }
  }
}

function updateFeaturePanel() {
  const key = featureSelect.value;
  const f = features[key];
  const val = f.calc(image);
  featureMeta.textContent = `${f.title} (${f.category})`;
  formulaBox.textContent = f.formula;
  valueBox.textContent = val.toFixed(2);
}

featureSelect.addEventListener("change", updateFeaturePanel);

resetBtn.addEventListener("click", () => {
  image = initialImage.map((row) => [...row]);
  renderGrid();
  updateFeaturePanel();
});

// initial render
renderGrid();
updateFeaturePanel();
