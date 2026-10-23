# MTR RP Studio

MTR 3 / NTE向けのブラウザ版リソースパックエディターです。モデルや設定の解析、3Dプレビュー、ZIP生成はブラウザ内で行います。

## ローカルで起動

Node.js 20.17以降を用意し、このフォルダで実行します。

```sh
npm install
npm run dev
```

表示されたURLをブラウザで開きます。本番ビルドは `npm run build` で `dist/` に生成されます。

## GitHub Pagesへデプロイ

このリポジトリはGitHub ActionsからPagesに公開できます。

1. GitHubで `Yumenyan/rpedit` リポジトリを開き、**Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
2. `master`（または `main`）ブランチへこの変更をpushします。`.github/workflows/deploy.yml` が依存関係をインストールしてビルドし、Pagesへ公開します。Actionsタブで `Deploy to GitHub Pages` の完了を確認します。
3. 公開URLは [https://yumenyan.github.io/rpedit/](https://yumenyan.github.io/rpedit/) です。以後、対象ブランチへのpushごとに自動更新されます。手動実行する場合はActionsタブの `Deploy to GitHub Pages` から **Run workflow** を選びます。

ビルドは `GITHUB_REPOSITORY` を読み取ってプロジェクトPages用のベースパスを自動設定します。別のリポジトリへ移した場合も、ActionsからのビルドならURLの変更に合わせて動きます。ユーザーサイト（`<user>.github.io`）はルートパスで公開されます。

## 基本操作

プレビュー上部の **広く表示** で左右のパネルを隠してモデルを大きく表示できます。**元の表示** で戻ります。下部のアセットパネルは右端の矢印で折りたためます。

1. **モデルを読み込む**からBlockbench 4/5のModded Entity `.bbmodel`、または `.obj` とPNGテクスチャを開きます。JSON・JSも同時に読み込めます。フォルダ読み込みは補助アセットも保持します。
2. 左の一覧からパーツを選び、右側で描画ステージ、表示条件、ドア、配置、表示フィルターなどを設定します。パーツを追加・複製して、同じモデル部品を用途ごとに使い分けられます。
3. **LCD配置**に切り替えてスロットを選択します。モデルを読み込んだ後、**側面 / 前面・端面 / 屋根**を押すと、その方向で最も近いモデル表面にLCDをおおよそ配置します。モデル上をクリックすると面に沿わせて配置でき、LCDをドラッグすると同じ面上で移動します。
4. 右側のX・Y・Zボタンで1 / 5 / 10 / 50 mmずつ位置を調整します。数値欄へ直接入力したり、表面からの距離（初期値2 mm）を変えたりできます。完全に密着させるとゲーム内でちらつくことがあるので、少し浮かせて調整してください。
5. **ZIPを書き出す**と `YYYY-MM-DD_モデルID.zip` を保存します。日付は日本時間です。**保存**は再編集用の `.mtrstudio` プロジェクトを保存します。

ドラッグで回転、右ドラッグでパン、ホイールでズームします。ズームは速めに設定してあり、操作の追従を保つため回転の慣性を無効にしています。`F`で選択パーツまたはLCDにフォーカス、フォーカスボタンをShiftクリックするとモデル全体にフォーカスします。`⌘/Ctrl + S`でプロジェクト保存、`⌘/Ctrl + K`で検索、`⌘/Ctrl + Z`で元に戻します。

## 対応範囲と出力

Blockbenchのcube要素・階層グループ、およびOBJの名前付きobject/groupとUVに対応します。Blockbench座標とMTR `parts.positions` は1/16 m、LCDの `slotCfg.pos` と `offsets` はmです。読み込んだJSは実行せず、静的リテラルの `slotCfg` だけを解析・更新します。OBJのMTLや複数マテリアル、Blockbenchのmesh・アニメーション、MTR標準文字表示のゲーム内描画、NTE JavaScriptの実行はプレビュー対象外です。

ZIPの構成は次のとおりです。

```text
pack.mcmeta
assets/mtr/mtr_custom_resources.json
assets/mtr/<id>/<id>.bbmodel または <id>.obj
assets/mtr/<id>/<id>.png
assets/mtr/<id>/<id>.json
assets/mtr/<id>/init.js （JSがある場合）
assets/... （読み込んだ補助ファイル）
```

既存のカスタムリソースJSONに含まれる他車両と、編集していない車両メタデータは保持します。`pack_format`は初期値6です。利用するMinecraftのバージョンに合わせて変更してください。OBJ・JSにはNTE対応環境が必要です。Minecraft内の動作はゲームで確認してください。

MTRのプロパティ仕様は[参照元のMTR 3ソース](https://github.com/aphrodite281/Minecraft-Transit-Railway-3.x.x)に基づいています。JSON形式、描画段階、車両フィルターの挙動を同プロジェクトのソースに照らして実装しています。
