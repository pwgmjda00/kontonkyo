# ドパボタン 引き継ぎ

## 場所

- 新規作業ディレクトリ：`/workspace/dopa-button`
- 元の作業ディレクトリ `/workspace/kontonkyo` は変更していません。
- GitHub保存先：<https://github.com/pwgmjda00/kontonkyo/tree/main/dopa-button>
- 公開先：<https://pwgmjda00.github.io/kontonkyo/dopa-button/play/>

## 再開

```sh
cd /workspace/dopa-button
npm ci
python3 tools/validate_data.py
npm test
npm run build
node tests/browser.cjs
```

公開更新は [DEPLOYMENT.md](DEPLOYMENT.md) の非破壊同期を使用します。既存のルートページは書き換えません。新しいGit worktreeは不要です。

## 構成

- `src/game.ts`：PUSHひとつの状態機械、時間と入力トークン
- `src/probability.ts`：BigInt棄却サンプリングと独立抽選
- `src/probability.worker.ts` / `src/worker-client.ts`：UIと計算の分離
- `src/records.ts`：累計と上限付き履歴を分離
- `src/App.tsx` / `src/app.css`：3モード、BONUS3種、共有
- `src/Encyclopedia.tsx`：1026条件の検索・比較・履歴・プレビュー
- `src/sound.ts`：初期ミュートのオリジナルWeb Audio

## 検証と残件

- 添付バリデーター成功：1026件、18族、642 BONUS対象。
- 最小版のPages公開ジョブ成功を確認済み。完成版ソース・ビルドは `ced0bf252a84526acb771ffa7ee5730d76f9f96d` にpush済み。CI（データ検証・44件のVitest・本番ビルド）は成功。Pagesジョブも成功確認済み（https://github.com/pwgmjda00/kontonkyo/actions/runs/41145490593）。
- この環境のネットワーク規則が `pwgmjda00.github.io` と `api.github.com` にCONNECT403を返すため、公開URLへの直接HTTP確認は未実施。ドメイン許可追加の設定案は保存済み、実行環境への反映は未確認です。
- 実機登録は0件。一次資料未確認のため、公開のために推測した値は加えていません。
- 実機iPhone Safariは未検証。ブラウザー検証ではChromiumのタッチ端末相当を使用します。
- 本番では確率を変えるテスト用フラグはありません。ブラウザーテストのWorker差し替えはテスト用コンテキストだけで行います。

### ブラウザー検証

`node tests/browser.cjs` は本番ビルドのVite previewを自動起動し、隔離したChromiumコンテキストで14項目を検証します。実行結果は14項目成功、終了コード0でした。外部サーバーを確認する場合は `DOPA_BASE_URL` を指定できます。

- 320px表示、3モードの切替制限、初期ミュート
- 開始入力の持越し防止、GO/STOP成功・失敗、自動進行、PUSH再挑戦
- タッチとクリックの二重加点防止
- タブ非表示の停止、復帰カウントダウン
- BONUS停止・スキップ・復帰、実当選とシアターの分離、表示されない実当選の保存
- 通常・ドパの最高記録共有、ゲーミング別記録・実当選図鑑非解除
- 保存・再読み込み、図鑑プレビュー非解除、localStorage拒否時の継続
- 共有文面のスコア・モード・実際のURL・ハッシュタグ
- 差し替えていない本番Workerによる1026条件の実抽選と記録

レアな演出のUI確認ではテスト内だけでWorker応答を差し替え、確率エンジン自体の検証とは分けています。最後のWorker確認では本番Workerを使います。実機Safari/WebKitは未検証です。この環境にはPlaywright WebKitの実行ファイルがありません。

## 確率処理の実測

Chromiumの本番Workerで3成功を測定：計算0.6〜2.6ms、requestから応答12.7〜13.5ms、各成功で104〜105件の実当選を記録しました。この環境だけの測定で、iPhone実機の速度保証ではありません。
