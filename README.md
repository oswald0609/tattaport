# SHOTA INOUE — Portfolio

グラフィックデザイナー 井上翔太のポートフォリオサイト。

## 構成

| ファイル | 説明 |
|---|---|
| `index.html` | メインのポートフォリオページ（HOME / WORKS / PROFILE / SKILL / CONTACT） |
| `detail.html` | WORKS の詳細ページ（`detail.html?id=xxx` の形式でアクセス） |
| `cms.html` | コンテンツ管理ページ（ローカル環境専用、デプロイ不要） |

## ローカル開発

このサイトは静的HTML/CSS/JSのみで構成されています。ローカルで動作確認するには、ブラウザで直接 `index.html` を開くか、簡易サーバーを立ち上げてください。

```bash
# Python があれば
python3 -m http.server 8000

# Node.js があれば
npx serve .
```

ブラウザで `http://localhost:8000` を開きます。

## CMS（コンテンツ管理）

`cms.html` をブラウザで開くと、WORKS データを編集できます。

### 編集できる内容

- **Profile 画像**：複数枚アップロード可能。6秒ごとに自動切り替え
- **カテゴリ**：作成・名前変更・削除
- **作品**：タイトル / 説明文 / Client / Year / Art Direction / Design / Direction / Tools
- **作品画像**：複数枚アップロード、ドラッグ＆ドロップで並び替え、列数指定（1/2/3列）。1枚目が WORKS 一覧のサムネイル＋HOMEのスライド画像になります

### データの保存先

CMS は `localStorage` を使用してブラウザ内にデータを保存します。**そのため、編集したデータは編集したブラウザでのみ反映されます。**

別の端末や本番環境にデータを反映するには：

1. CMS の **Export** ボタンで `portfolio-data-YYYY-MM-DD.json` をダウンロード
2. 反映したい環境のブラウザで `cms.html` を開き、**Import** で同ファイルを選択

### 本番反映の流れ（GitHub Pages の場合）

1. ローカルで `cms.html` を開いて編集
2. データは自動的に `localStorage` に保存される
3. 同じブラウザで `index.html` を開けば内容が反映される
4. 反映確認できたら、**Export** で JSON をダウンロードしてバックアップ

> ⚠ GitHub Pages にデプロイした本番URLでも、訪問者ごとに異なる `localStorage` を持ちます。CMS 編集者と訪問者は別々の領域を見ています。本番に静的に反映したい場合は、JSON データをコードに埋め込む運用に切り替える必要があります。

## デプロイ（GitHub Pages）

1. このフォルダをそのまま GitHub リポジトリに push
2. リポジトリの **Settings → Pages** で `main` ブランチを公開対象に指定
3. 数分後、`https://<username>.github.io/<repo-name>/` で公開される

## ブラウザ対応

最新版の Chrome / Safari / Firefox / Edge を想定しています。

## 技術スタック

- HTML / CSS / Vanilla JS（フレームワークなし）
- Google Fonts: MuseoModerno / Bricolage Grotesque / Noto Sans JP
- Canvas API（背景のドットエフェクト）
