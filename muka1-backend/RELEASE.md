# MUKA-1 512構文リリース

## 状態（2026-11-25）

8487839を起点に既存実装を改築。本番Worker/D1への反映とmainへの切替は、Cloudflare接続設定待ち。
現行URLは https://pwgmjda00.github.io/kontonkyo/muka1-preview/ 。開発版はこのURLへまだ反映していない。

## 互換性

- 共通データは `muka1-preview/catalog.js`。旧0〜255の本文・IDは保持。
- 追加1000255〜1000510。投稿の公開IDは従来の255+submission.id、投稿番号上限999999。
- 2026-11-26のJST日付から512件の固定リリース集合で抽選。それ以前の候補・順序は旧方式と一致。
- 公開が切替日に間に合わない場合、必ず切替を公開翌日以後へ変更して再検証する。過去に開催した日付の集合を変えない。
- 次の拡張はPHRASESへ安定IDを足し、CATALOG_RELEASESへ新しい日付と固定ID集合を追加する。既存集合を編集しない。
- 重複監査は `CATALOG-AUDIT.md`。新側29件の文言を改善。旧側に残る意味の近い表現は互換性優先で明記。
- votesテーブルの旧0〜255制約を拡張するが、既存行を丸ごと移し、件数検証を行う。投稿・承認・制限テーブルを削除しない。

## 検証

Node 24で `cd muka1-backend && npm ci && npm test`。
ローカルHTTPプレビューはリポジトリ直下で `python -m http.server 3000 --bind 0.0.0.0`。
ブラウザは `npx playwright install --with-deps chromium webkit` 後、`npm run test:browser`。
`MUKA_TEST_URL`でゲームのテスト先URLを変更可。APIはテスト中モックに置き換え、本番へテスト票を入れない。

- Node tests: カタログ7、core6、解析6、SQLite実DBでWorker統合1（複数API・移行のアサーションを含む）。
- 全128選択経路をcoreテストに加え、実ブラウザの7クリック操作で検証。
- 旧共有URL、追加IDと投稿ID、無効URL、UTM、JST/月/年/週境界、同票、0票、重複投票、投稿・承認、通信断。
- PNG生成・ダウンロード、ポスターQRの復号、Xの実際のintent URL、匿名解析停止、トークン非永続、390px横溢れなし。
- 実Cloudflare workerd+ローカルD1で旧票/承認をseedし、移行、確認SQL、二重適用、全国投票と解析再送を検証。
- WebKitのiPhone相当エミュレーションはiPhone実機ではない。実機Safariの共有シート、写真への保存、LINE/X実投稿、OGPキャッシュは別途実機確認が必要。

## 公開順序

1. 検証済み開発ブランチのままWorker/D1を先に更新する。Pagesはmain直結なのでmainへ先にpushしない。
2. 環境にCLOUDFLARE_API_TOKENとCLOUDFLARE_ACCOUNT_IDを設定。対象既存Workerの編集とD1のexport/query権限が必要。値はチャット・コード・URLへ記載しない。
3. `MUKA_BACKUP_DIR`にリポジトリ外の非公開ディレクトリを指定し `bash tools/deploy-remote.sh`。秘密値はログへ出さない。既存DBを名前で発見し、export+checksum成功後だけ移行・確認SQL・deployする。既存ADMIN_TOKENは取得・上書きしない。
4. GitHub Actionsを使用する場合は `Deploy MUKA-1 API` を検証済みブランチ指定で実行。GitHubのCLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID、MUKA1_D1_ID変数、MUKA1_ADMIN_TOKEN secretを使用。DB exportを既存GitHub secretで暗号化してartifactへ7日保存し、保存成功後のみ移行する。
5. `GET /health`のcatalog512、`/duel/daily`、`/ranking`、`/history`、`/festival`と旧票を確認してからmainをfast-forwardする。
6. Pagesビルド後、公開HTML・catalog.js・app.js・ogp.pngを取得し、作者トップの作品リンクと旧URLを確認。

## 障害と復旧

- バックアップ/移行/整合確認に失敗したらWorkerとPages切替を停止。
- 移行済みDBは旧Workerの0〜255票にも対応するため、Workerだけ旧版へ戻せる。データを巻き戻すために本番DBを削除・再作成しない。
- exportは非公開に保持。公開リポジトリにSQLバックアップや管理者キーを追加しない。
- 暗号化artifactの復号は、非公開端末で `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in BACKUP.sql.enc -out BACKUP.sql -pass env:ADMIN_TOKEN`。使用したGitHub secretと同じ鍵が必要。設定前に現行ADMIN_TOKENとの一致を推定しない。
- 全国API通信失敗時は取得不可と明示し、端末内の遊びだけ継続。0票を取得済みの結果として代用しない。
- 解析はANALYTICS_ENABLED=falseで停止可能。保持期間は生30日・日別90日、共有操作は投稿成功や実人数ではない。レート制限はWorker isolate内での緩和策であり、全世界で厳密な上限を保証しない。無料枠使用量はCloudflareの管理画面で監視する。

本作は架空構文による娯楽。実在人物を標的にしない。
