const STORAGE_KEY = "findly-items-v1";
const CLAIMS_KEY = "findly-claims-v1";

const locationMap = {
  Library: { x: 210, y: 150 },
  Cafeteria: { x: 470, y: 170 },
  "Main Gate": { x: 95, y: 420 },
  Auditorium: { x: 690, y: 135 },
  "Computer Lab": { x: 360, y: 340 },
  "Sports Complex": { x: 740, y: 390 },
  "Parking Area": { x: 545, y: 445 },
};

const weights = {
  image: 0.42,
  category: 0.2,
  location: 0.2,
  time: 0.18,
};

let items = load(STORAGE_KEY, []);
let claims = load(CLAIMS_KEY, []);
let pendingImage = null;
let claimTargetId = null;

const form = document.querySelector("#itemForm");
const imageInput = document.querySelector("#image");
const preview = document.querySelector("#imagePreview");
const generatedDescription = document.querySelector("#generatedDescription");
const duplicateAlert = document.querySelector("#duplicateAlert");
const notificationList = document.querySelector("#notificationList");
const itemsList = document.querySelector("#itemsList");
const matchesList = document.querySelector("#matchesList");
const claimsList = document.querySelector("#claimsList");
const matchFilter = document.querySelector("#matchFilter");
const systemScore = document.querySelector("#systemScore");
const heatmap = document.querySelector("#heatmap");
const hotspotSummary = document.querySelector("#hotspotSummary");
const claimDialog = document.querySelector("#claimDialog");
const claimForm = document.querySelector("#claimForm");

document.querySelector("#dateTime").value = new Date().toISOString().slice(0, 16);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  pendingImage = await analyzeImage(file);
  preview.innerHTML = `<img src="${pendingImage.src}" alt="Uploaded item preview">`;
  generatedDescription.textContent = buildDescription(pendingImage, document.querySelector("#category").value);
  showDuplicateWarning(pendingImage);
});

document.querySelector("#category").addEventListener("change", () => {
  if (pendingImage) {
    generatedDescription.textContent = buildDescription(pendingImage, document.querySelector("#category").value);
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingImage) return;

  const item = {
    id: crypto.randomUUID(),
    type: valueOf("#type"),
    category: valueOf("#category"),
    location: valueOf("#location"),
    dateTime: valueOf("#dateTime"),
    image: pendingImage.src,
    signature: pendingImage.signature,
    dominantColor: pendingImage.dominantColor,
    description: generatedDescription.textContent,
    details: valueOf("#details"),
    question: valueOf("#question"),
    answerHash: normalize(valueOf("#answer")),
    createdAt: new Date().toISOString(),
    status: "open",
  };

  items.unshift(item);
  save(STORAGE_KEY, items);
  form.reset();
  document.querySelector("#dateTime").value = new Date().toISOString().slice(0, 16);
  preview.textContent = "Image preview";
  generatedDescription.textContent = "Upload an image to generate a useful description.";
  pendingImage = null;
  duplicateAlert.classList.add("hidden");
  showNotifications(item);
  renderAll();
  switchView("matches");
});

document.querySelector("#seedData").addEventListener("click", seedDemoData);

matchFilter.addEventListener("change", renderMatches);

claimForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = items.find((entry) => entry.id === claimTargetId);
  if (!item) return;

  claims.unshift({
    id: crypto.randomUUID(),
    itemId: item.id,
    itemTitle: `${item.category} at ${item.location}`,
    answerGiven: valueOf("#claimAnswer"),
    proof: valueOf("#claimProof"),
    passedQuestion: normalize(valueOf("#claimAnswer")) === item.answerHash,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  save(CLAIMS_KEY, claims);
  claimDialog.close();
  claimForm.reset();
  renderClaims();
  switchView("admin");
});

function switchView(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${name}View`).classList.add("active");
  if (name === "heatmap") drawHeatmap();
}

function valueOf(selector) {
  return document.querySelector(selector).value.trim();
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function analyzeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;
        const histogram = new Array(48).fill(0);
        let red = 0;
        let green = 0;
        let blue = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          red += pixels[i];
          green += pixels[i + 1];
          blue += pixels[i + 2];
          histogram[Math.floor(pixels[i] / 64)] += 1;
          histogram[4 + Math.floor(pixels[i + 1] / 64)] += 1;
          histogram[8 + Math.floor(pixels[i + 2] / 64)] += 1;
          const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          histogram[12 + Math.floor(brightness / 64)] += 1;
        }

        const total = size * size;
        const signature = histogram.map((value) => value / total);
        resolve({
          src: reader.result,
          signature,
          dominantColor: colorName(red / total, green / total, blue / total),
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function colorName(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;
  if (brightness < 55) return "black or dark";
  if (brightness > 210 && max - min < 35) return "white or light";
  if (max - min < 28) return "gray";
  if (r === max && g > 130) return "yellow or tan";
  if (r === max) return "red";
  if (g === max) return "green";
  return "blue";
}

function buildDescription(image, category) {
  const categoryText = category === "id" ? "ID card" : category;
  return `Likely ${image.dominantColor} ${categoryText} with visual features captured for image-similarity matching.`;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function distanceScore(a, b) {
  const first = locationMap[a.location];
  const second = locationMap[b.location];
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  return Math.max(0, 1 - distance / 760);
}

function timeScore(a, b) {
  const hours = Math.abs(new Date(a.dateTime) - new Date(b.dateTime)) / 36e5;
  return Math.max(0, 1 - hours / 168);
}

function matchScore(a, b) {
  const image = cosineSimilarity(a.signature, b.signature);
  const category = a.category === b.category ? 1 : 0.25;
  const location = distanceScore(a, b);
  const time = timeScore(a, b);
  const total = image * weights.image + category * weights.category + location * weights.location + time * weights.time;
  return {
    total: Math.round(total * 100),
    image: Math.round(image * 100),
    category: Math.round(category * 100),
    location: Math.round(location * 100),
    time: Math.round(time * 100),
  };
}

function findMatches(item = null) {
  const candidates = [];
  const baseItems = item ? [item] : items;
  baseItems.forEach((source) => {
    items
      .filter((target) => target.id !== source.id && target.type !== source.type)
      .forEach((target) => {
        const score = matchScore(source, target);
        if (score.total >= 45) {
          candidates.push({ source, target, score });
        }
      });
  });
  return candidates.sort((a, b) => b.score.total - a.score.total);
}

function showNotifications(item) {
  const matches = findMatches(item).filter((match) => match.score.total >= 62);
  notificationList.innerHTML = matches.length
    ? matches
        .map(
          (match) =>
            `<div class="notification">Possible match found: ${match.score.total}% with a ${match.target.category} report at ${match.target.location}.</div>`,
        )
        .join("")
    : `<div class="notification">Report saved. No strong automatic match yet.</div>`;
}

function showDuplicateWarning(image) {
  const duplicate = items
    .map((item) => ({ item, similarity: cosineSimilarity(image.signature, item.signature) }))
    .filter((entry) => entry.similarity > 0.92)
    .sort((a, b) => b.similarity - a.similarity)[0];

  if (!duplicate) {
    duplicateAlert.classList.add("hidden");
    return;
  }

  duplicateAlert.textContent = `Duplicate warning: this image looks ${Math.round(duplicate.similarity * 100)}% similar to an existing ${duplicate.item.type} report at ${duplicate.item.location}.`;
  duplicateAlert.classList.remove("hidden");
}

function renderItems() {
  itemsList.classList.toggle("empty-state", items.length === 0);
  itemsList.innerHTML = items.length
    ? items.map(renderItemCard).join("")
    : "No reports yet.";

  document.querySelectorAll("[data-claim]").forEach((button) => {
    button.addEventListener("click", () => openClaim(button.dataset.claim));
  });
}

function renderItemCard(item) {
  return `
    <article class="item-card">
      <img class="thumb" src="${item.image}" alt="${item.category}">
      <div>
        <h3>${capitalize(item.category)} at ${item.location}</h3>
        <p class="muted">${item.description}</p>
        <div class="card-meta">
          <span class="tag ${item.type}">${item.type}</span>
          <span class="tag">${formatDate(item.dateTime)}</span>
          <span class="tag">${item.status}</span>
        </div>
      </div>
      <button class="primary" data-claim="${item.id}">Claim</button>
    </article>
  `;
}

function renderMatches() {
  const selected = matchFilter.value;
  let matches = findMatches();
  if (selected !== "all") {
    matches = matches.filter((match) => match.source.id === selected || match.target.id === selected);
  }

  systemScore.textContent = findMatches().length;
  matchesList.classList.toggle("empty-state", matches.length === 0);
  matchesList.innerHTML = matches.length ? matches.map(renderMatchCard).join("") : "No matches yet. Add a lost and found report to see scoring.";
}

function renderMatchCard(match) {
  return `
    <article class="match-card">
      <img class="thumb" src="${match.source.image}" alt="${match.source.category}">
      <div>
        <h3>${capitalize(match.source.type)} ${match.source.category} matched with ${match.target.type} report</h3>
        <p class="muted">${match.source.location} to ${match.target.location} • ${formatDate(match.source.dateTime)}</p>
        <p class="breakdown">Image ${match.score.image}% • Category ${match.score.category}% • Location ${match.score.location}% • Time ${match.score.time}%</p>
      </div>
      <div class="score-meter">
        <strong>${match.score.total}%</strong>
        <div class="bar"><span style="width: ${match.score.total}%"></span></div>
      </div>
    </article>
  `;
}

function renderClaims() {
  claimsList.classList.toggle("empty-state", claims.length === 0);
  claimsList.innerHTML = claims.length
    ? claims.map(renderClaimCard).join("")
    : "No claims submitted.";

  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => updateClaim(button.dataset.approve, "approved"));
  });
  document.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", () => updateClaim(button.dataset.reject, "rejected"));
  });
}

function renderClaimCard(claim) {
  return `
    <article class="claim-card">
      <div></div>
      <div>
        <h3>${claim.itemTitle}</h3>
        <p class="muted">Question check: ${claim.passedQuestion ? "passed" : "failed"} • Proof: ${claim.proof || "not provided"}</p>
        <div class="card-meta">
          <span class="tag">${claim.status}</span>
          <span class="tag">${formatDate(claim.createdAt)}</span>
        </div>
      </div>
      <div>
        <button class="primary" data-approve="${claim.id}">Approve</button>
        <button class="ghost" data-reject="${claim.id}">Reject</button>
      </div>
    </article>
  `;
}

function updateClaim(id, status) {
  claims = claims.map((claim) => (claim.id === id ? { ...claim, status } : claim));
  if (status === "approved") {
    const claim = claims.find((entry) => entry.id === id);
    items = items.map((item) => (item.id === claim.itemId ? { ...item, status: "claimed" } : item));
    save(STORAGE_KEY, items);
  }
  save(CLAIMS_KEY, claims);
  renderAll();
}

function openClaim(id) {
  const item = items.find((entry) => entry.id === id);
  claimTargetId = id;
  document.querySelector("#claimQuestion").textContent = item.question;
  claimDialog.showModal();
}

function renderMatchFilter() {
  matchFilter.innerHTML = `<option value="all">All reports</option>${items
    .map((item) => `<option value="${item.id}">${capitalize(item.type)} ${item.category} at ${item.location}</option>`)
    .join("")}`;
}

function drawHeatmap() {
  const ctx = heatmap.getContext("2d");
  ctx.clearRect(0, 0, heatmap.width, heatmap.height);
  ctx.fillStyle = "#eef1f3";
  ctx.fillRect(0, 0, heatmap.width, heatmap.height);

  ctx.strokeStyle = "#cbd5df";
  ctx.lineWidth = 3;
  ctx.strokeRect(55, 55, 790, 410);
  ctx.fillStyle = "#d9e0e7";
  ctx.fillRect(315, 68, 12, 385);
  ctx.fillRect(70, 278, 760, 12);

  const counts = Object.keys(locationMap).map((name) => ({
    name,
    count: items.filter((item) => item.location === name).length,
    ...locationMap[name],
  }));
  const max = Math.max(1, ...counts.map((entry) => entry.count));

  counts.forEach((entry) => {
    const radius = 26 + (entry.count / max) * 54;
    const gradient = ctx.createRadialGradient(entry.x, entry.y, 6, entry.x, entry.y, radius);
    gradient.addColorStop(0, "rgba(217, 119, 6, 0.88)");
    gradient.addColorStop(1, "rgba(15, 118, 110, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(entry.x, entry.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#19212a";
    ctx.font = "700 15px system-ui";
    ctx.fillText(entry.name, entry.x - 42, entry.y + 5);
  });

  hotspotSummary.innerHTML = counts
    .sort((a, b) => b.count - a.count)
    .map((entry) => `<div class="hotspot"><strong>${entry.name}</strong><span>${entry.count} reports</span></div>`)
    .join("");
}

function renderAll() {
  renderMatchFilter();
  renderItems();
  renderMatches();
  renderClaims();
  drawHeatmap();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function seedDemoData() {
  const now = Date.now();
  const samples = [
    ["lost", "bag", "Library", "#1f2937", "black backpack with simple strap pattern", 1],
    ["found", "bag", "Computer Lab", "#263241", "dark backpack found near lab desk", 3],
    ["lost", "phone", "Cafeteria", "#111827", "black phone with reflective screen", 5],
    ["found", "phone", "Cafeteria", "#101820", "dark phone found below table", 6],
    ["lost", "id", "Main Gate", "#f8fafc", "light ID card with blue border", 12],
  ];

  items = samples.map(([type, category, location, color, description, hours], index) => {
    const signature = syntheticSignature(color);
    return {
      id: crypto.randomUUID(),
      type,
      category,
      location,
      dateTime: new Date(now - hours * 36e5).toISOString(),
      image: swatchImage(color, category),
      signature,
      dominantColor: description.split(" ")[0],
      description,
      details: "Demo report",
      question: "What unique mark identifies this item?",
      answerHash: "demo",
      createdAt: new Date(now - index * 12e5).toISOString(),
      status: "open",
    };
  });
  save(STORAGE_KEY, items);
  renderAll();
}

function syntheticSignature(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 32, 32);
  return new Array(48).fill(0).map((_, index) => (index % 4 === 0 ? 0.8 : 0.2));
}

function swatchImage(color, label) {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 240, 240);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "700 26px system-ui";
  ctx.fillText(label, 28, 126);
  return canvas.toDataURL("image/png");
}

renderAll();
