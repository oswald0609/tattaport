# SHOTA INOUE — Portfolio

グラフィックデザイナー 井上翔太のポートフォリオサイト。

## ファイル構成

| ファイル | 用途 | デプロイ |
|---|---|---|
| `index.html` | メインページ | ✅ |
| `detail.html` | WORKS 詳細ページ | ✅ |
| `data.json` | コンテンツデータ（本番反映用） | ✅ |
| `images/` | 画像フォルダ（ZIP展開で生成） | ✅ |
| `cms.html` | コンテンツ編集ツール | ✅（編集用） |
| `.nojekyll` | Jekyll処理を無効化 | ✅ |

## サイトの仕組み

```
[訪問者]
   ↓
index.html / detail.html
   ↓ fetch
data.json  ← この内容が訪問者全員に表示される
```

**`data.json` がサイトの「本番データ」です。** ここを更新してgit pushすれば全員に反映されます。

CMS (`cms.html`) は編集用のローカルツールで、編集結果を JSON として書き出し、`data.json` を差し替える運用になります。

## 本番反映フロー（全員に同じ内容を見せる方法）

### 初回セットアップ

1. このリポジトリを GitHub に push
2. リポジトリの **Settings → Pages** で公開対象を `main` ブランチに指定
3. `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

### コンテンツ編集（毎回の作業）

1. ローカルで `cms.html` をブラウザで開く（必ずローカルサーバー経由で）
   ```bash
   python3 -m http.server 8000
   # → http://localhost:8000/cms.html を開く
   ```
2. CMS で作品やプロフィール画像を編集
3. CMS 右上の **Export ZIP** ボタンで ZIP をダウンロード
   - 中身：`data.json` + `images/work-xxx-1.jpg` などの画像ファイル一式
4. ZIP を解凍して、リポジトリのルートに **`data.json` と `images/` フォルダを上書き**
5. git push で本番反映

```bash
# 例：ZIPダウンロード後
cd ~/Downloads
unzip portfolio-bundle-2026-04-30.zip -d /path/to/portfolio-repo
cd /path/to/portfolio-repo
git add data.json images
git commit -m "Update content"
git push
```

### Export 形式について

| ボタン | 出力 | 用途 |
|---|---|---|
| **Export ZIP** | `data.json` + `images/*` の ZIP | **本番デプロイ用**（推奨） |
| **Export JSON** | `data.json` 単体（画像はBase64で内包） | バックアップ・別端末への移行用 |

ZIP方式は画像が物理ファイルとして配置されるため、リポジトリが軽くなり、ブラウザでも個別キャッシュが効きます。

### 別端末/別ブラウザで編集を続ける場合

CMSの **Import** ボタンで **ZIPファイル** または **JSONファイル** を読み込めます。ZIPの場合は画像も自動的に復元されます。

## ローカルで動作確認するには

```bash
# Python があれば
python3 -m http.server 8000

# Node.js があれば
npx serve .
```

ブラウザで `http://localhost:8000` を開きます。**直接 `index.html` をダブルクリックで開くと `fetch('data.json')` が CORS エラーで失敗します。必ずサーバー経由で開いてください。**

## CMS の機能

`cms.html` で編集できる内容：

- **Profile 画像**：複数枚アップロード可能。6秒ごとに自動切り替え
- **カテゴリ**：作成 / 名前変更 / 削除
- **作品**：タイトル / 説明文（一覧用 / 詳細用）/ Client / Year / Art Direction / Design / Direction / Tools
- **作品画像**：複数枚アップロード、ドラッグ＆ドロップで並び替え、列数指定（1/2/3列）
  - 1枚目が WORKS 一覧のサムネイル＆HOME背景スライド画像になります

## ブラウザ対応

最新版の Chrome / Safari / Firefox / Edge を想定。

## 技術スタック

- HTML / CSS / Vanilla JS（フレームワークなし）
- Google Fonts: MuseoModerno / Bricolage Grotesque / Noto Sans JP
- Canvas API（背景のドットエフェクト）
