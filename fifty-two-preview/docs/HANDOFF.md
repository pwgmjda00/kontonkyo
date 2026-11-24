# FIFTY-TWO / JOKER 77 開発台帳

## 確定仕様・入口
`../AGENTS.md` を必読。対象は当ディレクトリのみ。77作品（独立72+index5）の最高実績初達成で未所持JOKER1枚、既存達成も移行、作品単位で重複不可。毎日3択1枚、永久所持、任意着脱、通常/JOKER記録を分離。既存機能とセーブを維持。

## チェックポイント 2026-11-24 / 着手
- 添付 `FIFTY-TWO_HANDOFF.txt` 全文読了。添付ZIPは別作品のindex.htmlのみで適用しない。
- GitHubとcloneでmainのHEAD `05640f6dcbb5e6e994f2263c6d088f17bb714498` を確認。開始時worktree clean。
- 作業ブランチ `codex/fifty-two-achievement-link`。PR未作成。
- 接続GitHubで最新コミットとopen PRを確認（対象のopen PRなし）。combined status APIは空配列であり、CI成功の証拠とは扱わない。
- 必須4ファイルの運用を開始。coverage表は棚卸し担当が作成中。
- 実装中: 77作品明示勝利フック+既存記録移行、index5作品とJ26修正、JOKER状態の単一レコード化と日次履歴・保存失敗改善。
- まだテスト未実行、公開反映未確認。既存CIの全コマンドおよび追加回帰を実行予定。
- 環境: network付きexecでclone成功。通常sandboxのネットワークはproxy接続失敗。依存取得/pushにはnetwork付きexecを使う。認証情報は記録しない。

## 次の具体的作業
1. 担当ごとの実装を統合しcoverage表77行を確認。
2. 全既存テスト＋追加の勝利/敗北/移行/重複/日付戻し/保存失敗を実行し、不具合修正。
3. 台帳更新・差分レビュー・commit/push・PR・CI確認・merge・Pages実公開確認。

## チェックポイント 2026-11-24 / CI基準確認・実装中
- 実際のGitHub Actions履歴で、基点05640f6はsmoke/Gin/Pages成功、mobile browser失敗を確認。引き継ぎの「CI2件成功」だけで全成功とはしない。
- mobile失敗の主因: gameplay-smokeの古い日替わり装備fixture（forceJokerでJ22等がundefined）。永久所持仕様に沿うfixtureへ更新中。検証項目は維持する。
- `node --test fifty-two-preview/tests/gin-rummy.test.cjs` 成功（11.46秒）。benchmark 3は重複実行整理で中断、最終検証で再実行必須。
- Playwright 1.58.2をroot node_modulesに一時導入（コミット対象外）。Chromium取得済み、`PLAYWRIGHT_BROWSERS_PATH=/tmp/fifty-two-playwright-browsers` を使う。
- GitHub Pages設定はmain /ルートのlegacy build、基点はbuilt。今回変更の公開は未実施。
- 77作品のHTML、engine/achievements.js、collection.js、index、JOKER状態/UIを担当別に実装中。新テストを既存CI実行入口に接続予定。

## チェックポイント 2026-11-24 / 統合検証1
- `tests/browser-smoke.cjs`: 75/75ページ、モバイル起動/実績メニュー/検索/overflow検査成功。
- `tests/index-achievements.cjs`: 46ケース成功（5作品の通常/JOKER×勝敗×live/legacy=40、J26×5、四王国captureセーブ互換）。四王国で侵略時にカードが消失して復元拒否になる既存バグも修正。
- `tests/joker-multitab.cjs`: 実2タブの同日日次競合、同作品/別作品報酬、装備保持、再読込、無限storageイベント防止、quota失敗、同タブ移行UI、320px成功。
- JOKERは `fifty-two-joker-state-v3` へ単一原子書込（version/revision/owned/equipped/claimed/achievements）。v2保持・安全移行、破損/未来versionは上書き拒否。全日付履歴保持。77所持完了表示。後続取得は装備・明示解除を保持し、最初の1枚のみ自動装備。
- UI/実績経路はasync Web Locksで同一originの複数タブ直列化。非対応ブラウザー/旧sync APIのlocalStorage leaseはCAS非対応のためbest effort。v2に残らない過去日付履歴は復元不能。オフライン端末なので未取得の未来日付の真偽は検証不能。
- 全77勝利/未達成の実遷移テスト、既存gameplay/JOKER layout回帰は実行中。index過去セーブの図鑑直接訪問移行を追加調整中。最終テスト・コミット・PR・公開はまだ未完了。
- 引き継ぎ4ファイルの初期チェックポイントを `7345495` にコミット。実装差分はまだworktree内（77作品HTML、engine、collection、tests、JOKER実装ドキュメント）。作業継続中のため最終実装コミット/公開は未実施。

## チェックポイント 2026-11-24 / 統合検証2
- `tests/gameplay-smoke.cjs`: 97ケース PASS。
- `tests/joker-layout.cjs` 本体: 219ケース PASS（追加子テストはまだ最終確認待ち）。
- Gin benchmark3: 5設定×3=15対局、exit0。`tests/gin-rummy-benchmark.cjs 3`。Gin単体は既述PASS。
- Node JOKER操作9、永続化8、実績状態418の各チェック成功。旧7択文言/fixture、インベントリの未接続表記を修正。
- 直接jokers.htmlからindex5作品の旧セーブを検証する共通 `engine/hub-achievements.mjs` を追加。indexテストは直接訪問移行と破損doneフラグ排除で拡張中。
- レビューで保存対局の再読込時に装備が切り替わる抜け道を確認。shared bridgeの開始時装備snapshot永続化と回帰テストを追加中。
- 実績報酬の保存失敗を「受取未完了」と表示し、proofから再試行するUIを追加中。
- 全72独立作品×2モード終局テストはfixture調整中（test-only lexical export、製品の終局判定/APIを置換しない）。未完走/敗北を勝利にしない。全成功とはまだ報告しない。

## チェックポイント 2026-11-24 / 公開前検証
- 全77作品×通常/JOKER=154シナリオの `tests/achievement-coverage.cjs`: **860 assertions / 0 failures**。勝利/完走・敗北/未達、報酬一度、モード横断重複防止、再読込、勝利数分離を確認。
  - テスト専用HTTPサーバーのメモリ内で製品スクリプトに状態操作入口を追加し、終局直前のfixtureから本来の判定・遷移を実行。全作品を配札から全手順通して攻略した証明ではない。既存UI gameplay97と併用。
- `tests/index-achievements.cjs`: 最新69ケース PASS。5作品直接図鑑移行、偽doneフラグ排除、J26、capture保存、装備snapshot復元を含む。
- `tests/joker-multitab.cjs`: 最新の報酬保存失敗→未完了表示→再試行成功もPASS。
- `tests/collection-smoke.cjs`: PASS、追加永続化8・実績状態422も既存CI入口から成功。`tests/joker-inventory.cjs`: 77/77接続・72/72明示フック、`tests/joker-actions.cjs`:9 PASS。`git diff --check` 成功。
- `engine/joker-score-mode.js` は `fifty-two-joker-round-v1-<game>` に開始時装備（null含む）を保存。保存対局を再読込しても保持し、新しい局だけ最新装備に更新。新たな `tests/joker-session.cjs` 回帰4ケース成功（CIはjoker-layoutから呼ぶ）。旧セッションは過去装備不明のため最初の読込時装備を一度採用。
- ブラウザー75/75とjoker-layout219+追加子テストの最終一括再実行中。実装をコミットしGitHub CIへ進む。

## チェックポイント 2026-11-24 / PR #31・最終ローカル成功
- 実装コミット `c3d26292a07becd22490096a3d145c59356cb4f3`、push成功。mainは引き続き基点05640f6であることをfetch確認。
- PR: https://github.com/pwgmjda00/kontonkyo/pull/31 （MERGEABLE）。GitHub CIは開始済み、成功待ち。マージ・今回の公開はまだ未実施。
- 最終 `tests/browser-smoke.cjs`:75/75 PASS。最終 `tests/joker-layout.cjs` 一括:本体219、index69、multitab（pending retry含む）、saved-session4、全77統合860、すべてPASS。既存CIから追加テストが実行される。
- 最後のsource変更は装備snapshot・pending保存エラー処理。変更後の静的/状態/全ページ/操作型回帰を完了。テストログは/tmp内（短期環境用、長期証拠はGitHub CI）。
- root node_modules/は一時依存でコミット対象外。他作品の追跡ファイル変更なし。

## 次の具体的作業（現時点）
1. この台帳追記とJOKER-IMPLEMENTATION.mdの検証説明をcommit/pushする。
2. PR #31の最新HEADに対するsmoke/mobile/GinのすべてのCI成功を確認し、失敗ならログから修正。成功後expected headを指定してマージする。
3. Pagesのmainデプロイと実公開URLを確認。公開ファイルの内容/ハッシュ、図鑑の取得・実績移行・スマホ動作を確認し、結果をこの台帳へ残す。
