# 旅行先ルーレット

日本全国の都道府県・市区町村から、条件を絞ってランダムに旅行先やお出かけ先を決めるWebアプリです。ルーレット演出、Google Places API連携、おすすめスポット表示、お気に入り、履歴、共有に対応しています。

## 主な機能

- 都道府県ルーレット: 全国、地方、任意複数選択から抽選
- 市区町村ルーレット: 選択した都道府県内の候補から抽選
- モード選択: ノーマル旅、デート、家族旅行、ひとり旅、雨の日、グルメ重視など
- カテゴリ選択: 観光スポット、自然、温泉、カフェ、ランチ、スイーツなど
- Google Places APIを使ったカテゴリ別おすすめ表示
- 写真、評価、住所、Googleマップリンク表示
- APIキー未設定やAPI失敗時のGoogle検索リンク代替表示
- localStorageによるお気に入り保存と履歴保存
- Web Share APIまたはクリップボードコピーによる共有
- スマホ、PC対応のレスポンシブUI

## ファイル構成

```text
travel-roulette/
  public/
    index.html
    style.css
    script.js
    data/
      prefectures.js
      municipalities.js
  server.js
  package.json
  .env.example
  .gitignore
  README.md
```

## ローカルでの起動方法

```bash
npm install
npm start
```

起動後、ブラウザで次を開きます。

```text
http://localhost:3000
```

## Google Places APIキーの取得方法

1. Google Cloud Consoleでプロジェクトを作成します。
2. Billingを有効化します。
3. 「APIs & Services」から Places API を有効化します。
4. 「Credentials」でAPIキーを作成します。
5. 必要に応じてHTTPリファラーやIP、API制限を設定します。

## `.env` の作り方

`.env.example` を参考に、プロジェクト直下に `.env` を作成します。

```env
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
PORT=3000
```

APIキーは `server.js` のみが読み取ります。フロントエンドの `script.js` にはAPIキーを書かないでください。

## Renderでのデプロイ方法

1. GitHubにこのリポジトリをpushします。
2. RenderでNew Web Serviceを作成し、リポジトリを接続します。
3. Build Commandに `npm install` を設定します。
4. Start Commandに `npm start` を設定します。
5. Environment Variablesに `GOOGLE_PLACES_API_KEY` を追加します。
6. 必要なら `PORT` はRenderの自動設定に任せます。

## GitHub PagesだけではAPI版が動かない理由

GitHub Pagesは静的ホスティングのため、Node.js + Expressの `/api/recommendations` を実行できません。Google Places APIキーを安全に隠すにはサーバー側の処理が必要です。API連携版はRenderなどNode.jsを実行できる環境にデプロイしてください。

## APIキーの注意

- `.env` はGitHubに上げないでください。
- `.gitignore` に `.env` と `node_modules` を含めています。
- APIキーをHTML、CSS、JavaScriptのフロントエンドコードへ直書きしないでください。

## 市区町村データの網羅方針

`public/data/municipalities.js` は、都道府県ごとに市区町村名の配列を持つ構造です。全国すべての自治体を追加できる形式にしています。

現時点の初期データは未完全です。ただし、主要都市だけに偏らないよう、各都道府県に市・区・町・村や小規模自治体を含めています。完全網羅版にする場合は、総務省や自治体コードなどの公的データをもとに、この配列を全自治体分へ拡張してください。

## 今後の改善案

- 全国全自治体データの完全投入
- 現在地からの距離や移動時間による絞り込み
- 予算、季節、営業時間、評価件数によるフィルタ
- Google Places APIの詳細情報取得
- 旅行プランの自動生成
- お気に入りのエクスポート、インポート
- PWA対応
