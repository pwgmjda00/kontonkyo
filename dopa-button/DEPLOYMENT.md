# 公開の再実行

既存の `pwgmjda00/kontonkyo` の GitHub Pages を使い、新しい `dopa-button/play/` だけを追加します。元のトップページは変更しません。新しいGitHubリポジトリの作成はしていません。

- 公開先: https://pwgmjda00.github.io/kontonkyo/dopa-button/play/
- ソース: https://github.com/pwgmjda00/kontonkyo/tree/main/dopa-button
- Pages は既存の `main` ブランチ公開設定を維持します。API認証や有料契約の追加は不要です。
- `pages.yml` はソースの検証・ビルド用です。既存のPages自動公開がコミット済みの `play/` を配信します。

```sh
cd /workspace/dopa-button
npm ci
npm test
npm run build
git -C /tmp/dopa-publish pull --ff-only
python3 tools/sync-pages.py --checkout /tmp/dopa-publish
git -C /tmp/dopa-publish diff --stat
git -C /tmp/dopa-publish add dopa-button .github/workflows/dopa-pages.yml
git -C /tmp/dopa-publish commit -m "Update Dopa Button"
git -C /tmp/dopa-publish push origin main
```

`/tmp/dopa-publish` がなければ、設定済みGit認証で `https://github.com/pwgmjda00/kontonkyo.git` をそこへcloneします。クローンの未保存変更がある場合は上書きせず確認してください。

公開処理はリポジトリの Actions にある「pages build and deployment」で確認します。成功後、公開URLのHTML・CSS・JSと実際のPUSH操作も確認してください。ワークフローの成功だけをHTTP確認済みとは扱いません。

この作業時点では環境のHTTPプロキシが `api.github.com` と `pwgmjda00.github.io` を403で拒否しています。既存HTTPS Gitプロキシ経由のpushと、`github.com` 上の公開Actions実行結果の読み取りは成功しています。通信設定が反映されたら公開URLの直接検証を再実行してください。認証値をチャットやコードに書く必要はありません。

## 確認済みリリース

- 完成版コミット: `ced0bf252a84526acb771ffa7ee5730d76f9f96d`
- [データ検証・単体テスト・ビルド成功](https://github.com/pwgmjda00/kontonkyo/actions/runs/41145490638)
- [GitHub Pages公開処理成功](https://github.com/pwgmjda00/kontonkyo/actions/runs/41145490593)
- 元のルートの `index.html` と `README.md` は、作業前の `7bfc91a` とGit blobが完全一致しています。
- 公開ジョブの成功を確認した一方、この環境から公開URLのHTTP応答・ブラウザー操作は確認できていません。プロキシの接続拒否と公開サーバーの応答を区別してください。
