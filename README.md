# SHOTA INOUE — Portfolio

グラフィックデザイナー 井上翔太のポートフォリオサイト。

## ファイル構成

| ファイル | 用途 |
|---|---|
| `index.html` | メインページ |
| `detail.html` | WORKS 詳細ページ |
| `data.json` | コンテンツデータ（本番に反映されるもの） |
| `images/` | 画像フォルダ |
| `cms.html` | コンテンツ編集ツール |

## サイトの仕組み

訪問者が見るのは `index.html` と `detail.html` の2つ。
中身（作品の情報や画像）は `data.json` と `images/` から読み込まれます。

つまり、**`data.json` と `images/` を更新すれば、訪問者全員に新しい内容が表示されます。**

`cms.html` は編集者用のツールで、編集結果を ZIP として出力できます。

---

## 編集の流れ

### 準備（最初の1回だけ）

1. **VSCode をインストール**
   https://code.visualstudio.com からダウンロード

2. **拡張機能「Live Server」を入れる**
   - VSCodeを開く
   - 左側の四角いアイコン（Extensions）をクリック
   - 検索ボックスに `Live Server` と入力
   - 一番上の「Live Server」を選んで「Install」

### 毎回の作業

1. **VSCodeでフォルダを開く**
   - 「File」→「Open Folder」でこのフォルダを選択

2. **CMSを起動**
   - `cms.html` を右クリック → **「Open with Live Server」**
   - ブラウザが自動で開きます

3. **CMSで編集する**
   - 作品の追加・編集・画像のアップロードなど

4. **ZIPでエクスポート**
   - CMS右上の **「Export ZIP」** ボタンをクリック
   - `portfolio-bundle-日付.zip` がダウンロードされます

5. **ZIPを解凍**
   - ダウンロードしたファイルをダブルクリックで解凍
   - 中に `data.json` と `images` フォルダが入っています

6. **GitHubに反映**
   - GitHubのリポジトリページを開く
   - `data.json` をクリック → 鉛筆アイコン → 中身を全消し → 解凍した`data.json`の中身を貼り付け → 「Commit changes」
   - `images` フォルダも更新：
     - 「Add file」→「Upload files」
     - 解凍した `images` フォルダの中身を全部ドラッグ&ドロップ
     - 「Commit changes」

7. **数分後にサイトが更新されます ✅**

### 別端末で続きを編集する場合

CMSの **Import** ボタンで、以前ダウンロードしたZIPファイル または JSONファイル を読み込めます。画像も含めて完全に復元されます。

### Import ボタンの用途

- **新しいPCでCMSを開いた時**：以前のZIPを Import すれば、これまでの編集状態を完全復元
- **データを誤って消してしまった時**：バックアップしておいたZIPを Import で戻せる
- **本番のZIPを編集続きから始めたい時**：前回エクスポートしたZIPを Import → 最新状態から続きを編集

CMSの編集データはブラウザに自動保存されますが、ブラウザを変えたりキャッシュをクリアするとリセットされるので、定期的に **Export ZIP** でバックアップを取るのがおすすめです。

### CMS で編集できる内容

- **Logo**：1枚アップロード。オープニング・ナビ・フッター・ファビコンに反映
- **Profile 画像**：複数枚アップロード可能。6秒ごとに自動切り替え
- **カテゴリ**：作成 / 名前変更 / 削除
- **作品**：タイトル / 説明文（一覧用 / 詳細用）/ Client / Year / Art Direction / Design / Direction / Tools
- **作品画像**：複数枚アップロード、ドラッグ＆ドロップで並び替え、列数指定（1/2/3列）
  - 1枚目が WORKS 一覧のサムネイル＆HOME背景スライド画像になります

---

## ⚠️ 注意

- `cms.html` を**直接ダブルクリックで開くとうまく動きません**。必ず VSCode の Live Server から開いてください。
- 編集中の内容はブラウザに自動保存されますが、**別の端末や別のブラウザでは見えません**。複数の端末で編集する場合は ZIP エクスポート → インポートで持ち運んでください。

---

## 技術スタック

- HTML / CSS / Vanilla JS（フレームワークなし）
- Google Fonts: MuseoModerno / Bricolage Grotesque / Noto Sans JP
- Canvas API（背景のドットエフェクト）
- JSZip（ZIP生成・解凍）
