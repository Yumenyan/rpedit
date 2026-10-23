# Railcraft Studio

MTR 3 / NTE向けのブラウザ版リソースパックエディターです。ファイルの解析・3D描画・ZIP生成はブラウザ内で実行します。サーバーへのモデルのアップロードはありません。

## 起動

Node.js 20.17以降で、このフォルダから実行してください。

```sh
npm install
npm run dev
```

表示されたローカルURLをブラウザで開きます。開発用HTMLは `index.html`、本番用の静的ファイルは `npm run build` で生成する `dist/` です。ES Modulesとサンプルのfetchを使うため、HTMLの直接ダブルクリックではなくHTTPサーバー経由で使用してください。

```sh
npm run build
npm run preview
npm test
```

## 操作

1. 最初は提供されたClass 153のモデル・PNG・JSON・JSを表示します。
2. **読み込む**から `.bbmodel` または `.obj` と `.png` を選びます。JSON、JSも同時に選択できます。フォルダ読込では `assets/` 以下を補助アセットとして保持します。複数車両のレジストリからは編集する車両を選択します。
3. モデルまたは左の一覧からパーツを選び、右側で描画ステージ、表示条件、反転、ドアオフセット、複数配置、車両フィルター、MTR標準文字表示を編集します。同じパーツに異なる設定を追加・複製できます。
4. 下部の **動作プレビュー**で左右ドア、先頭からの車両番号、編成数、前進・後進の表示条件を切り替えます。プレビューは標準スライドドアを簡易再現します。
5. **LCD配置**でスロットを選択し、モデル面をクリックして配置します。面の法線に合わせて四角形を回転し、指定した距離（初期値0.002 m）を表面から浮かせます。LCDを直接ドラッグすると同じ平面内で移動します。
6. 右側で四隅、texArea、texSize、配置オフセットを調整できます。複数のposとoffsetsの直積を表示し、編集する組み合わせを選べます。オフセットの変更は同じスロットの全posに適用されます。
7. **保存**はモデル・設定・テクスチャ・補助ファイルを含む編集用 `.railcraft` ファイルを保存します。**ZIPを書き出す**は `YYYY-MM-DD_モデルID.zip` をダウンロードします。日付は日本時間です。

画面が狭い場合、ツールバーの右パネルボタンでプロパティを開きます。さらに狭い画面では左パネルも切り替えられます。

- ドラッグ: 回転、右ドラッグ: パン、ホイール: ズーム
- `F`: 選択パーツ／LCDにフォーカス、フォーカスボタンのShiftクリック: モデル全体
- `⌘/Ctrl + S`: プロジェクト保存、`⌘/Ctrl + K`: 検索、`⌘/Ctrl + Z`: 元に戻す
- 表示設定でプロパティ適用前の形状、OBJの表示単位、LCD確認用アトラス画像を設定できます。

## 単位と対応範囲

- Blockbench 4/5の **Modded Entity、cube要素**と階層グループに対応します。4の入れ子outliner、5のgroups参照を読み込み、ZIPでは5の参照を入れ子形式へ変換します。
- Blockbenchの座標とMTR `parts.positions` は1/16 mです。LCDの `slotCfg.pos` と `offsets` はmです。モデルは移動・中心寄せせず元の原点を保持します。
- OBJは名前付きobject/groupとUVを読み込みます。標準は1 unit = 1 m、単一PNGテクスチャを使います。MTL、複数マテリアル、Blockbench mesh・アニメーションは未対応です。
- OBJ表示単位、選択ハイライト、非表示、単独表示、ワイヤーフレーム、LCD確認用アトラスはプレビュー用で、モデルの書き換えは行いません。
- MTR標準文字表示のdisplayプロパティは編集・保持しますが、実際の文字描画、スクロール、NTE JavaScriptの実行はプレビューしません。描画ステージの完全なゲーム内照明再現も対象外です。
- 車両フィルターはMTRソースの優先度（個別番号 > `%n` / `%n+補正` > 未一致）で評価します。`-1`は最後尾です。ブラックリストの優先度がホワイトリストより大きいときのみ非表示になります。
- 読み込んだJSはAcornで構文解析し、静的リテラルの `slotCfg` のみ取り出します。関数呼び出しや動的な式を含むslotCfgは拒否します。出力はその初期化式だけを置換し、前後のコードを保持します。
- JSなしでLCDを作成した場合は設定用JSだけを生成します。表示させるには利用するNTE環境に応じたDisplayHelperとcreate/render/dispose処理が必要です。

## 出力

```text
pack.mcmeta
assets/mtr/mtr_custom_resources.json
assets/mtr/<id>/<id>.bbmodel  または <id>.obj
assets/mtr/<id>/<id>.png
assets/mtr/<id>/<id>.json
assets/mtr/<id>/init.js       JSがある場合
assets/...                   読み込んだ補助ファイル
```

既存のカスタムリソースJSON内の他車両や、編集していない車両メタデータは保持します。対象車両のmodel、texture_id、model_properties、編集対象script_filesを生成先に合わせます。

`pack_format` は初期値6です。使用するMinecraftのバージョンに合わせて車両・パック設定で変更してください。OBJ・JSを使う場合はNTE対応環境が必要です。

スクリプト中の静的なリソース参照の不足と、モデル内にないパーツ設定をZIP書き出し時に表示します。動的に組み立てた音声ID、レジストリへの依存、外部パックの依存は完全には検出できません。提供されたサンプルJSにはbluevision等の外部依存があるため、そのまま単体で完全動作するパックではありません。元パックのフォルダを読み込むか、別途依存パックを用意してください。Minecraft内での動作検証は別途必要です。

## 参照・サンプル

参照したMTR3ソース: [aphrodite281/Minecraft-Transit-Railway-3.x.x](https://github.com/aphrodite281/Minecraft-Transit-Railway-3.x.x)

- `common/src/main/java/mtr/client/IResourcePackCreatorProperties.java`: JSONのキー・初期値
- `common/src/main/java/mtr/client/ResourcePackCreatorProperties.java`: enumとZIP構造
- `common/src/main/java/mtr/client/DynamicTrainModel.java`: 配置・車両フィルター・描画条件
- `common/src/main/java/mtr/model/ModelTrainBase.java`: 描画ステージ

`public/examples/` はユーザー提供の参照ファイルと同フォルダのモデル・テクスチャのコピーです。元ファイルは変更していません。再配布時には素材の権利を確認してください。

テストは実サンプルJSの抽出・差分書き戻し、危険な式の拒否、フィルター優先度、ZIPの往復、Blockbench 5変換、OBJ読込、座標のスケール、面スナップの法線と距離を検証します。
