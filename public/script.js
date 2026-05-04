const MODES = ["ノーマル旅", "デート", "家族旅行", "ひとり旅", "友達とお出かけ", "雨の日", "のんびり", "アクティブ", "グルメ重視", "映えスポット重視"];
const TOURISM_CATEGORIES = ["観光スポット", "定番観光", "自然", "神社・お寺", "温泉", "博物館・美術館", "体験スポット", "夜景", "映えスポット"];
const FOOD_CATEGORIES = ["カフェ", "ランチ", "スイーツ", "ご当地グルメ", "ラーメン", "居酒屋", "パン屋"];
const STORAGE_KEYS = {
  favorites: "travelRouletteFavorites",
  history: "travelRouletteHistory"
};

let currentResult = null;
let lastPrefectureCondition = null;
let lastMunicipalityPrefecture = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSelectors();
  setupSharedControls();
  setupActions();
  renderEmptyResults();
  renderFavorites();
  renderHistory();
});

function setupTabs() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".tab-button").forEach((tab) => tab.classList.remove("active"));
      $$(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      $(`#tab-${button.dataset.tab}`).classList.add("active");
      if (button.dataset.tab === "favorites") renderFavorites();
      if (button.dataset.tab === "history") renderHistory();
    });
  });
}

function setupSelectors() {
  const regionSelect = $("#region-select");
  [...new Set(prefectures.map((pref) => pref.region))].forEach((region) => {
    regionSelect.append(new Option(region, region));
  });

  const customList = $("#custom-pref-list");
  prefectures.forEach((pref) => {
    customList.append(createCheckbox("custom-pref", pref.name, pref.name, false, "check-pill"));
  });

  const municipalityPrefSelect = $("#municipality-pref-select");
  prefectures.forEach((pref) => municipalityPrefSelect.append(new Option(pref.name, pref.name)));
  municipalityPrefSelect.value = "東京都";
  municipalityPrefSelect.addEventListener("change", updateMunicipalityCount);

  $("#pref-filter-type").addEventListener("change", updatePrefectureFilterFields);
  updatePrefectureFilterFields();
  updateMunicipalityCount();
}

function setupSharedControls() {
  ["pref", "municipality"].forEach((prefix) => {
    const root = $(`#${prefix}-shared-controls`);
    root.append(createModeControls(prefix));
    root.append(createCategoryControls(prefix));
  });
}

function createModeControls(prefix) {
  const wrap = document.createElement("div");
  wrap.className = "category-group";
  wrap.innerHTML = `<span class="category-title">モード</span>`;
  const grid = document.createElement("div");
  grid.className = "mode-grid";
  MODES.forEach((mode, index) => {
    const label = document.createElement("label");
    label.className = "option-chip";
    label.innerHTML = `<input type="radio" name="${prefix}-mode" value="${mode}" ${index === 0 ? "checked" : ""}><span>${mode}</span>`;
    grid.append(label);
  });
  wrap.append(grid);
  return wrap;
}

function createCategoryControls(prefix) {
  const wrap = document.createElement("div");
  wrap.className = "category-group";
  wrap.innerHTML = `<span class="category-title">表示カテゴリ</span>`;

  const tourism = document.createElement("div");
  tourism.className = "category-grid";
  TOURISM_CATEGORIES.forEach((category) => {
    tourism.append(createCategoryChip(prefix, category, category === "観光スポット"));
  });

  const food = document.createElement("div");
  food.className = "category-grid";
  FOOD_CATEGORIES.forEach((category) => {
    food.append(createCategoryChip(prefix, category, category === "カフェ"));
  });

  wrap.append(tourism, food);
  return wrap;
}

function createCategoryChip(prefix, category, checked) {
  const label = document.createElement("label");
  label.className = "option-chip";
  label.innerHTML = `<input type="checkbox" name="${prefix}-category" value="${category}" ${checked ? "checked" : ""}><span>${category}</span>`;
  return label;
}

function createCheckbox(name, value, text, checked, className) {
  const label = document.createElement("label");
  label.className = className;
  label.innerHTML = `<input type="checkbox" name="${name}" value="${value}" ${checked ? "checked" : ""}> ${text}`;
  return label;
}

function setupActions() {
  $("#spin-pref").addEventListener("click", () => spinPrefecture());
  $("#spin-municipality").addEventListener("click", () => spinMunicipality());
  $("#clear-history").addEventListener("click", clearHistory);
}

function updatePrefectureFilterFields() {
  const type = $("#pref-filter-type").value;
  $("#region-field").style.display = type === "region" ? "grid" : "none";
  $("#custom-pref-field").style.display = type === "custom" ? "grid" : "none";
}

function updateMunicipalityCount() {
  const pref = $("#municipality-pref-select").value;
  const count = (municipalities[pref] || []).length;
  $("#municipality-count").textContent = `${pref} の候補数: ${count}件。市・区・町・村を含む形式です。`;
}

function selectedMode(prefix) {
  return $(`input[name="${prefix}-mode"]:checked`).value;
}

function selectedCategories(prefix) {
  const categories = $$(`input[name="${prefix}-category"]:checked`).map((input) => input.value);
  return categories.length ? categories : ["観光スポット", "カフェ"];
}

function getPrefectureCandidates() {
  const type = $("#pref-filter-type").value;
  if (type === "region") {
    const region = $("#region-select").value;
    return prefectures.filter((pref) => pref.region === region);
  }
  if (type === "custom") {
    const selected = $$('input[name="custom-pref"]:checked').map((input) => input.value);
    return prefectures.filter((pref) => selected.includes(pref.name));
  }
  return prefectures;
}

async function spinPrefecture(options = {}) {
  const candidates = options.candidates || getPrefectureCandidates();
  if (!candidates.length) return showToast("候補を1つ以上選択してください");

  const mode = selectedMode("pref");
  const categories = selectedCategories("pref");
  const region = $("#region-select").value;
  lastPrefectureCondition = { type: $("#pref-filter-type").value, region };

  const panel = $("#pref-result-panel");
  const picked = await animateRoulette(panel, candidates.map((pref) => pref.name));
  const pref = prefectures.find((item) => item.name === picked);
  const result = {
    id: crypto.randomUUID(),
    type: "prefecture",
    prefecture: pref.name,
    municipality: "",
    region: pref.region,
    mode,
    categories,
    candidateNames: candidates.map((candidate) => candidate.name),
    spots: {},
    createdAt: new Date().toISOString()
  };
  await completeResult(panel, result);
}

async function spinMunicipality() {
  const pref = $("#municipality-pref-select").value;
  const candidates = municipalities[pref] || [];
  if (!candidates.length) return showToast("この都道府県の候補データがありません");

  lastMunicipalityPrefecture = pref;
  const panel = $("#municipality-result-panel");
  const picked = await animateRoulette(panel, candidates);
  const result = {
    id: crypto.randomUUID(),
    type: "municipality",
    prefecture: pref,
    municipality: picked,
    region: prefectures.find((item) => item.name === pref)?.region || "",
    mode: selectedMode("municipality"),
    categories: selectedCategories("municipality"),
    candidateNames: candidates,
    spots: {},
    createdAt: new Date().toISOString()
  };
  await completeResult(panel, result);
}

function animateRoulette(panel, names) {
  return new Promise((resolve) => {
    panel.innerHTML = `<div class="roulette-window spinning"><div class="roulette-name">${escapeHtml(randomItem(names))}</div></div>`;
    const nameEl = panel.querySelector(".roulette-name");
    let tick = 0;
    const totalTicks = 32;
    const timer = setInterval(() => {
      tick += 1;
      nameEl.textContent = randomItem(names);
      if (tick >= totalTicks) {
        clearInterval(timer);
        const picked = randomItem(names);
        nameEl.textContent = picked;
        panel.querySelector(".roulette-window").classList.remove("spinning");
        setTimeout(() => resolve(picked), 320);
      }
    }, Math.min(40 + tick * 5, 115));
  });
}

async function completeResult(panel, result, options = {}) {
  currentResult = result;
  renderResultShell(panel, result, true);
  if (!options.skipHistory) saveHistory(result);

  try {
    result.spots = await fetchRecommendations(result);
  } catch {
    result.spots = buildClientFallback(result);
  }
  currentResult = result;
  renderResultShell(panel, result, false);
}

async function fetchRecommendations(result) {
  const location = result.municipality ? `${result.prefecture}${result.municipality}` : result.prefecture;
  const params = new URLSearchParams({
    location,
    mode: result.mode,
    categories: result.categories.join(",")
  });
  const response = await fetch(`/api/recommendations?${params}`);
  if (!response.ok) throw new Error("recommendation request failed");
  const data = await response.json();
  return data.results || buildClientFallback(result);
}

function buildClientFallback(result) {
  const location = result.municipality ? `${result.prefecture} ${result.municipality}` : result.prefecture;
  return Object.fromEntries(result.categories.map((category) => [
    category,
    [{
      name: `${category}をGoogleで探す`,
      rating: null,
      address: "おすすめ取得に失敗しました。",
      mapUrl: `https://www.google.com/search?q=${encodeURIComponent(`${location} ${category}`)}`,
      photoUrl: "",
      fallback: true
    }]
  ]));
}

function renderResultShell(panel, result, loading) {
  const title = result.municipality ? `${result.prefecture} ${result.municipality}` : result.prefecture;
  panel.innerHTML = `
    <div class="roulette-window">
      <div>
        <div class="roulette-name">${escapeHtml(title)}</div>
      </div>
    </div>
    <div class="result-meta">
      <span class="meta-chip">モード: ${escapeHtml(result.mode)}</span>
      <span class="meta-chip">カテゴリ: ${escapeHtml(result.categories.join("、"))}</span>
      ${result.region ? `<span class="meta-chip">地方: ${escapeHtml(result.region)}</span>` : ""}
    </div>
    <div class="action-row">
      <button class="secondary-action accent" data-action="favorite">お気に入り保存</button>
      <button class="secondary-action" data-action="share">共有</button>
      <button class="secondary-action" data-action="reroll">もう一回抽選</button>
      <button class="secondary-action" data-action="same-condition">同じ条件でもう一回</button>
      ${result.type === "prefecture" ? `<button class="secondary-action" data-action="same-region">同じ地方でもう一回</button>` : ""}
      ${result.type === "municipality" ? `<button class="secondary-action" data-action="same-pref">同じ都道府県内でもう一回</button>` : ""}
      <button class="secondary-action" data-action="refresh">おすすめだけ再取得</button>
      ${result.categories.includes("カフェ") ? `<button class="secondary-action" data-action="refresh-cafe">カフェだけ再取得</button>` : ""}
    </div>
    <div id="${result.type}-recommendations">
      ${loading ? `<div class="loading"><span class="loader"></span>おすすめを取得中...</div>` : renderRecommendations(result.spots)}
    </div>
  `;
  attachResultActions(panel, result);
}

function renderRecommendations(spotsByCategory) {
  return Object.entries(spotsByCategory).map(([category, spots]) => `
    <section class="recommendation-section">
      <h3>${escapeHtml(category)}</h3>
      <div class="cards">
        ${spots.map(renderSpotCard).join("")}
      </div>
    </section>
  `).join("");
}

function renderSpotCard(spot) {
  const rating = spot.rating ? `評価 ${spot.rating}` : "評価なし";
  const photo = spot.photoUrl
    ? `<img class="spot-photo" src="${escapeAttr(spot.photoUrl)}" alt="${escapeAttr(spot.name)}">`
    : `<div class="spot-photo" role="img" aria-label="写真なし"></div>`;
  return `
    <article class="spot-card">
      ${photo}
      <div class="spot-body">
        <h4 class="spot-title">${escapeHtml(spot.name)}</h4>
        <p class="spot-meta">${escapeHtml(rating)}</p>
        <p class="spot-meta">${escapeHtml(spot.address || "住所情報なし")}</p>
        <a class="map-link" href="${escapeAttr(spot.mapUrl)}" target="_blank" rel="noopener">Googleマップで開く</a>
      </div>
    </article>
  `;
}

function attachResultActions(panel, result) {
  panel.querySelector('[data-action="favorite"]')?.addEventListener("click", () => saveFavorite(result));
  panel.querySelector('[data-action="share"]')?.addEventListener("click", () => shareResult(result));
  panel.querySelector('[data-action="reroll"]')?.addEventListener("click", () => result.type === "prefecture" ? spinPrefecture() : spinMunicipality());
  panel.querySelector('[data-action="same-condition"]')?.addEventListener("click", () => {
    if (result.type === "prefecture") {
      const candidates = prefectures.filter((pref) => (result.candidateNames || []).includes(pref.name));
      spinPrefecture({ candidates: candidates.length ? candidates : undefined });
      return;
    }
    $("#municipality-pref-select").value = result.prefecture;
    updateMunicipalityCount();
    spinMunicipality();
  });
  panel.querySelector('[data-action="same-region"]')?.addEventListener("click", () => {
    const candidates = prefectures.filter((pref) => pref.region === result.region);
    spinPrefecture({ candidates });
  });
  panel.querySelector('[data-action="same-pref"]')?.addEventListener("click", () => {
    $("#municipality-pref-select").value = result.prefecture;
    updateMunicipalityCount();
    spinMunicipality();
  });
  panel.querySelector('[data-action="refresh"]')?.addEventListener("click", () => completeResult(panel, { ...result, spots: {} }, { skipHistory: true }));
  panel.querySelector('[data-action="refresh-cafe"]')?.addEventListener("click", async () => {
    const cafeResult = { ...result, categories: ["カフェ"], spots: {} };
    renderResultShell(panel, cafeResult, true);
    cafeResult.spots = await fetchRecommendations(cafeResult).catch(() => buildClientFallback(cafeResult));
    renderResultShell(panel, cafeResult, false);
  });
}

function saveFavorite(result) {
  const favorites = readStorage(STORAGE_KEYS.favorites);
  const saved = { ...structuredClone(result), savedAt: new Date().toISOString() };
  writeStorage(STORAGE_KEYS.favorites, [saved, ...favorites]);
  renderFavorites();
  showToast("お気に入りに保存しました");
}

function saveHistory(result) {
  const history = readStorage(STORAGE_KEYS.history);
  const slim = {
    id: crypto.randomUUID(),
    type: result.type,
    prefecture: result.prefecture,
    municipality: result.municipality,
    region: result.region,
    mode: result.mode,
    categories: result.categories,
    createdAt: new Date().toISOString()
  };
  writeStorage(STORAGE_KEYS.history, [slim, ...history].slice(0, 50));
  renderHistory();
}

function renderFavorites() {
  const favorites = readStorage(STORAGE_KEYS.favorites);
  $("#favorite-count").textContent = `${favorites.length}件`;
  $("#favorites-list").innerHTML = favorites.length
    ? favorites.map((item) => renderSavedCard(item, "favorite")).join("")
    : `<p class="hint">お気に入りはまだありません。</p>`;
  attachSavedActions("favorite");
}

function renderHistory() {
  const history = readStorage(STORAGE_KEYS.history);
  $("#history-list").innerHTML = history.length
    ? history.map((item) => renderSavedCard(item, "history")).join("")
    : `<p class="hint">履歴はまだありません。</p>`;
  attachSavedActions("history");
}

function renderSavedCard(item, source) {
  const title = item.municipality ? `${item.prefecture} ${item.municipality}` : item.prefecture;
  const spots = item.spots ? renderRecommendations(item.spots) : "";
  return `
    <article class="saved-card" data-id="${escapeAttr(item.id)}">
      <h3>${escapeHtml(title)}</h3>
      <p class="spot-meta">モード: ${escapeHtml(item.mode)} / カテゴリ: ${escapeHtml(item.categories.join("、"))}</p>
      <p class="spot-meta">${formatDate(item.savedAt || item.createdAt)}</p>
      <div class="action-row">
        <button class="secondary-action" data-saved-action="fetch">もう一度おすすめを取得</button>
        <button class="secondary-action" data-saved-action="favorite">お気に入りに追加</button>
        <button class="secondary-action" data-saved-action="share">共有</button>
        <button class="secondary-action danger" data-saved-action="delete">${source === "favorite" ? "お気に入り削除" : "履歴から削除"}</button>
      </div>
      ${spots ? `<details><summary>詳細表示</summary>${spots}</details>` : ""}
    </article>
  `;
}

function attachSavedActions(source) {
  const key = source === "favorite" ? STORAGE_KEYS.favorites : STORAGE_KEYS.history;
  const root = source === "favorite" ? $("#favorites-list") : $("#history-list");
  root.querySelectorAll(".saved-card").forEach((card) => {
    const id = card.dataset.id;
    const item = readStorage(key).find((entry) => entry.id === id);
    if (!item) return;
    card.querySelector('[data-saved-action="fetch"]').addEventListener("click", () => restoreAndFetch(item));
    card.querySelector('[data-saved-action="favorite"]').addEventListener("click", () => saveFavorite({ ...item, spots: item.spots || {} }));
    card.querySelector('[data-saved-action="share"]').addEventListener("click", () => shareResult(item));
    card.querySelector('[data-saved-action="delete"]').addEventListener("click", () => {
      writeStorage(key, readStorage(key).filter((entry) => entry.id !== id));
      source === "favorite" ? renderFavorites() : renderHistory();
    });
  });
}

function restoreAndFetch(item) {
  const panel = item.type === "prefecture" ? $("#pref-result-panel") : $("#municipality-result-panel");
  document.querySelector(`[data-tab="${item.type === "prefecture" ? "prefecture" : "municipality"}"]`).click();
  completeResult(panel, { ...item, id: crypto.randomUUID(), spots: {} });
}

function clearHistory() {
  writeStorage(STORAGE_KEYS.history, []);
  renderHistory();
  showToast("履歴を削除しました");
}

async function shareResult(result) {
  const title = result.municipality ? `${result.prefecture} ${result.municipality}` : result.prefecture;
  const names = Object.values(result.spots || {}).flat().slice(0, 3).map((spot) => spot.name).join("、") || "おすすめ取得前";
  const text = `旅行先ルーレットで「${title}」が出ました！\nモード：${result.mode}\nおすすめ：${names}\n${location.origin}`;
  if (navigator.share) {
    await navigator.share({ title: "旅行先ルーレット", text }).catch(() => {});
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    showToast("共有文をコピーしました");
  } else {
    showToast("この環境では共有機能を利用できません");
  }
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function renderEmptyResults() {
  $("#pref-result-panel").innerHTML = `<div class="empty-state"><p>条件を選んでルーレットを回してください。</p></div>`;
  $("#municipality-result-panel").innerHTML = `<div class="empty-state"><p>都道府県を選んで市区町村ルーレットを回してください。</p></div>`;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
