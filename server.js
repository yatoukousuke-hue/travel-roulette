require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

app.use(express.static(path.join(__dirname, "public")));

const MODE_KEYWORDS = {
  "ノーマル旅": {
    "観光スポット": "{location} 観光スポット",
    "カフェ": "{location} カフェ",
    default: "{location} {category}"
  },
  "デート": {
    "観光スポット": "{location} デートスポット",
    "カフェ": "{location} 雰囲気のいいカフェ",
    default: "{location} デート {category}"
  },
  "家族旅行": {
    "観光スポット": "{location} 家族で楽しめる観光スポット",
    "カフェ": "{location} 子連れ カフェ",
    default: "{location} 家族旅行 {category}"
  },
  "ひとり旅": {
    "観光スポット": "{location} ひとり旅 観光",
    "カフェ": "{location} 一人で入りやすいカフェ",
    default: "{location} ひとり旅 {category}"
  },
  "友達とお出かけ": {
    "観光スポット": "{location} 友達 お出かけ スポット",
    "カフェ": "{location} 友達 カフェ",
    default: "{location} 友達 {category}"
  },
  "雨の日": {
    "観光スポット": "{location} 雨の日 観光",
    "カフェ": "{location} 屋内 カフェ",
    default: "{location} 雨の日 {category}"
  },
  "のんびり": {
    "観光スポット": "{location} のんびり 観光",
    "カフェ": "{location} ゆっくりできるカフェ",
    default: "{location} のんびり {category}"
  },
  "アクティブ": {
    "観光スポット": "{location} アクティビティ 観光",
    "カフェ": "{location} カフェ",
    default: "{location} アクティブ {category}"
  },
  "グルメ重視": {
    "観光スポット": "{location} 食べ歩き 観光",
    "カフェ": "{location} 人気 カフェ",
    default: "{location} 人気 {category}"
  },
  "映えスポット重視": {
    "観光スポット": "{location} 映えスポット",
    "カフェ": "{location} おしゃれ カフェ",
    default: "{location} 映え {category}"
  }
};

const CATEGORY_FALLBACKS = {
  "定番観光": "観光スポット",
  "自然": "自然 観光",
  "神社・お寺": "神社 寺",
  "温泉": "温泉",
  "博物館・美術館": "博物館 美術館",
  "体験スポット": "体験 スポット",
  "夜景": "夜景",
  "映えスポット": "映えスポット",
  "カフェ": "カフェ",
  "ランチ": "ランチ",
  "スイーツ": "スイーツ",
  "ご当地グルメ": "ご当地グルメ",
  "ラーメン": "ラーメン",
  "居酒屋": "居酒屋",
  "パン屋": "パン屋",
  "観光スポット": "観光スポット"
};

function buildKeyword(location, mode, category) {
  const modeMap = MODE_KEYWORDS[mode] || MODE_KEYWORDS["ノーマル旅"];
  const template = modeMap[category] || modeMap.default || "{location} {category}";
  return template
    .replace("{location}", location)
    .replace("{category}", CATEGORY_FALLBACKS[category] || category);
}

function mapUrl(name, address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address || ""}`)}`;
}

function fallbackItem(location, category, reason) {
  const query = `${location} ${CATEGORY_FALLBACKS[category] || category}`;
  return {
    name: `${category}をGoogleで探す`,
    rating: null,
    address: reason || "Google Places APIキー未設定、または取得に失敗しました。",
    mapUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    photoUrl: "",
    fallback: true
  };
}

async function fetchGooglePlaces(location, mode, category) {
  const keyword = buildKeyword(location, mode, category);
  const textSearchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  textSearchUrl.searchParams.set("query", keyword);
  textSearchUrl.searchParams.set("language", "ja");
  textSearchUrl.searchParams.set("region", "jp");
  textSearchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  const response = await fetch(textSearchUrl);
  if (!response.ok) {
    throw new Error(`Google Places API HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(data.error_message || `Google Places API status: ${data.status}`);
  }

  return (data.results || []).slice(0, 6).map((place) => {
    const photoRef = place.photos && place.photos[0] && place.photos[0].photo_reference;
    const photoUrl = photoRef
      ? `/api/photo?reference=${encodeURIComponent(photoRef)}&maxwidth=640`
      : "";
    return {
      name: place.name,
      rating: place.rating || null,
      address: place.formatted_address || "",
      mapUrl: mapUrl(place.name, place.formatted_address),
      photoUrl
    };
  });
}

app.get("/api/recommendations", async (req, res) => {
  const location = String(req.query.location || "").trim();
  const mode = String(req.query.mode || "ノーマル旅").trim();
  const categories = String(req.query.categories || "観光スポット,カフェ")
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);

  if (!location) {
    return res.status(400).json({ error: "location is required" });
  }

  const results = {};
  if (!GOOGLE_PLACES_API_KEY) {
    categories.forEach((category) => {
      results[category] = [fallbackItem(location, category, "GOOGLE_PLACES_API_KEY が未設定です。")];
    });
    return res.json({ location, mode, results, fallback: true });
  }

  await Promise.all(categories.map(async (category) => {
    try {
      const places = await fetchGooglePlaces(location, mode, category);
      results[category] = places.length
        ? places
        : [fallbackItem(location, category, "該当するスポットが見つかりませんでした。")];
    } catch (error) {
      results[category] = [fallbackItem(location, category, error.message)];
    }
  }));

  res.json({ location, mode, results });
});

app.get("/api/photo", async (req, res) => {
  const reference = String(req.query.reference || "");
  const maxwidth = String(req.query.maxwidth || "640");

  if (!GOOGLE_PLACES_API_KEY || !reference) {
    return res.status(404).send("Photo not available");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("photo_reference", reference);
  url.searchParams.set("maxwidth", maxwidth);
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  try {
    const response = await fetch(url, { redirect: "manual" });
    const location = response.headers.get("location");
    if (location) return res.redirect(location);
    return res.status(response.status).send("Photo not available");
  } catch {
    return res.status(502).send("Photo not available");
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Travel Roulette is running at http://localhost:${PORT}`);
});
