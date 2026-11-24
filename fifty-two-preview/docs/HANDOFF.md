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
