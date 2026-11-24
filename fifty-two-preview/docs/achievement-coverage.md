# 77作品の最高実績・JOKER連携台帳

更新: 2026-11-24。基点 `05640f6`。独立72作品＋index内5作品。図鑑・テストは除外。

既存の作品別実績は訪問・初操作・初勝利の3段階で、報酬対象は最上位の初勝利。勝敗やクリア条件を持たず得点を競う13作品は、規定の全行程を終える「初完走」と明示する。訪問や途中操作では報酬を発行しない。自己ベストの更新ごとに追加報酬を発行しない。通常/JOKERどちらでも作品につき一度。元のモード別得点と勝利数を維持する。

`engine/achievements.js` は77IDの許可リストと保存済み証拠を管理。勝利分岐から `recordWin(id)` を明示呼び出し、作品別 `fifty-two-achievement-<id>=1` に達成を保存してから `awardAchievementAsync` を直列実行する。JOKER側の状態が報酬の重複を防ぐ。保存失敗時は証拠から再試行できる。保存未完了の報酬は成功通知せず、未完了表示と再試行ボタンを出す。画面復帰時も未完了分だけ再試行する。獲得は現在の装備を変更しない。

通常/JOKER共通の旧証拠 W は `fifty-two-<ID>-wins` または `fifty-two-<ID>-joker-wins` の正の安全整数。以下の表で省略したキー接頭辞は `fifty-two-<ID>-`。旧記録から証明できない達成を捏造しない。0点完走が保存されなかった古い競技や結果保存のないゲームは遡及証明できないため、次の完走/勝利で保存する。

| ID | 作品 | 最高実績の確定条件 | 明示フック | 既存データ移行 |
| --- | --- | --- | --- | --- |
| `accordion` | アコーディオン | 初勝利：52枚を1山に圧縮 | `move` | W |
| `aces-up` | Aces Up | 初勝利：山札0、4列が各A1枚のみ | `check` | W |
| `alchemy` | 調合 | 初完走：12回選択後、結果を見るで調合終了 | `finish` | W |
| `auction` | 競売 | 初勝利：7回終了、得点優勢（同点なら残金優勢） | `submit` | W |
| `bakers-dozen` | ベイカーズ・ダズン | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `balance` | 天秤 | 初完走：10枚を左右へ配置完了 | `place` | W |
| `beleaguered-castle` | 包囲された城 | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `black-hole` | ブラックホール | 初勝利：52枚吸収 | `take` | W |
| `blackjack` | ブラックジャック | 初勝利：5ラウンド終了、勝数が敗数を上回る | `render` | 旧結果保存なし。新しい5戦勝利から証明保存 |
| `bluff` | 虚勢 | 初勝利：7回終了、mine > theirs | `play` | W |
| `borderline` | 境界 | 初完走：ライフ0または山札終了でスコア競技完了 | `complete` | W |
| `calculation` | カリキュレーション | 初勝利：組札4つが各13枚 | `check` | W |
| `canfield` | キャンフィールド | 初勝利：全組札が各13枚（4組52枚） | `check` | W |
| `clock` | 時計ソリティア | 初勝利：4枚目Kが出た時点で全52枚公開 | `step` | W |
| `contagion` | 感染 | 初勝利：全マス確定、me所有数 > cpu所有数 | `finish` | W |
| `coronation` | 戴冠 | 初勝利：7回終了、mine > theirs | `play` | W |
| `countdown` | カウントダウン | 初勝利：10手終了、残数value === 0（単なる終了は対象外） | `render` | best === 150（残数0の最高点のみ） |
| `crossfire` | クロスファイア | 初完走：16枚全配置（index === 16） | `render` | best / joker-best > 0（完成時のみ保存） |
| `cruel` | クルーエル | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `deadline` | デッドライン | 初完走：12ラウンドを終了 | `finishIfLast` | W |
| `echo` | 残響 | 初勝利：手札を全部使用（cleared）。手詰まりは対象外 | `finishIfNeeded` | W |
| `eclipse` | エクリプス | 初勝利：8手終了、所有枚数you > cpu | `play` | W |
| `eight-off` | エイト・オフ | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `elevens` | イレブンズ | 初勝利：52枚除去 | `finish` | W |
| `fault-line` | フォールトライン | 初完走：52枚配置して競技終了 | `render` | best > 0（52枚終了時のみ保存） |
| `flower-garden` | フラワーガーデン | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `forty-thieves` | フォーティ・シーブス | 初勝利：全組札が各13枚（8組104枚） | `check` | W |
| `fourteen-out` | フォーティーン・アウト | 初勝利：26ペア52枚除去 | `tap` | W |
| `freecell` | フリーセル | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `gaps` | ギャップス | 初勝利：4行の2〜K全48枚整列 | `check` | W |
| `ghost-hand` | ゴースト・ハンド | 初勝利：3セット各5戦終了、ys > cs | `myTap` | W |
| `gin-rummy` | ジンラミー | 初勝利：目標得点到達・総得点you > cpu | `render` | stats-v1 / stats-v1-joker の JSON.w > 0 |
| `golf` | ゴルフ | 初勝利：場の全35枚除去。山札切れ手詰まりは対象外 | `check` | W |
| `high-low` | HIGH / LOW | 初完走：予想を10回終えた得点競技完了 | `render` | 旧結果保存なし。新しい10回完走から証明保存 |
| `indian-poker` | インディアンポーカー | 初勝利：7回終了、mine > cpu | `render` | record-indian-poker-normal / joker の JSON.wins > 0 |
| `informant` | 密告 | 初完走：5ラウンド終了 | `render` | v1 / v1-joker の done・round5 |
| `judgment` | 審判 | 初勝利：fast3戦またはslow5戦終了、wins[0] > wins[1] | `render` | v1 / v1-joker の finished・規定戦数・wins[0] > wins[1] |
| `kings-road` | キングズ・ロード | 初勝利：生存hp > 0で城門位置24に到達。死亡は対象外 | `move` | W |
| `klondike` | クロンダイク | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `la-belle-lucie` | ラ・ベル・ルーシー | 初勝利：全組札が各13枚（4組52枚） | `check` | W |
| `last-word` | ラスト・ワード | 初勝利：who === you。CPU勝利・引分対象外 | `win` | W |
| `lighthouse` | 灯台 | 初完走：全手札使用または合法手と捨札回数が尽きたスコア競技終了 | `check` | W |
| `memory` | 神経衰弱 | 初勝利：全52枚一致確定、mine > cpu | `resolve` | W |
| `monte-carlo` | モンテカルロ | 初勝利：52枚除去 | `finish` | W |
| `nestor` | ネスター | 初勝利：52枚除去 | `tap` | W |
| `old-maid` | ババ抜き | 初勝利：終局時CPUにジョーカーが残る | `end` | W |
| `osmosis` | オスモシス | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `overdrive` | 限界突破 | 初勝利：全戦終了、mine > cpu | `render` | 旧結果保存なし。新しい総合勝利から証明保存 |
| `paradox-switch` | パラドックス・スイッチ | 初勝利：mask === 0（全16枚表） | `press` | W |
| `paradox` | 逆説 | 初勝利：7回終了、mine > theirs | `render` | v1 / v1-joker の done・round7・mine > theirs |
| `penguin` | ペンギン | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `poker-squares` | ポーカースクエア | 初完走：5×5の25枚すべて配置 | `render` | best / joker-best > 0（完成時のみ保存） |
| `pyramid` | ピラミッド | 初勝利：ピラミッド全28枚除去 | `check` | W |
| `redline` | レッドライン | 初勝利：7ラウンド終了、ys > cs | `finish` | W |
| `reverse-auction` | リバース・オークション | 初勝利：12回終了、ys > cs | `bid` | W |
| `royal-slide` | ロイヤル・スライド | 初勝利：配列がgoalに一致（全札整列） | `move` | W |
| `scorpion` | スコーピオン | 初勝利：同マークK〜Aの4組完成 | `check` | W |
| `seal` | 封印 | 初完走：手札を消費し切って目標候補0、スコア競技終了 | `nextTarget` | W |
| `seven-seals` | 七つの封印 | 初勝利：21枚配置後、7つの封印すべて解除。部分解除は対象外 | `place` | W |
| `sevens` | 七並べ | 初勝利：全順位確定、out[0] === 0（プレイヤー1位） | `advance` | W |
| `shift` | 転位 | 初完走：5問終了のスコア競技完了 | `render` | v1 / v1-joker の done・round5 |
| `simple-simon` | シンプル・サイモン | 初勝利：同マークK〜Aの4組回収 | `sweep` | W |
| `spider` | スパイダー | 初勝利：K〜Aの8組104枚回収 | `sweep` | W |
| `suit-code` | スート・コード | 初勝利：4つのマークがすべて一致（match === 4） | `submit` | W |
| `suit-dominion` | スート・ドミニオン | 初勝利：8手終了、支配得点y > c | `play` | W |
| `the-answer` | THE ANSWER 42 | 初勝利：全5問解答（answers >= 5）。途中詰みは対象外 | `render` | 曖昧なbestは移行しない。新しい確定勝利から証明保存 |
| `tripeaks` | トライピークス | 初勝利：3山全札除去 | `check` | W |
| `trump-jack` | トランプ・ジャック | 初勝利：13戦終了、ys > cs | `finishTrick` | W |
| `war` | 戦争 | 初勝利：全10戦終了、総合得点mine > cpu | `render` | 旧結果保存なし。新しい10戦勝利から証明保存 |
| `witness` | 目撃 | 初完走：5回終了 | `render` | v1 / v1-joker の done・round5 |
| `yukon` | ユーコン | 初勝利：全組札が各13枚（4組52枚） | `move` | W |
| `zero-sum` | ゼロサム | 初勝利：9ラウンド終了、ys > cs | `finish` | W |
| `tombstone` | 墓標 | 初勝利：全組札を完成、tombstoneWon(g)成立 | `finish / hubWon` | W＋検証済みfinished hub保存（通常/JOKER・旧共通/作品別） |
| `accomplice` | 共犯 | 初勝利：終局、points[0] >= points[1]（既存ルールで同点も勝利） | `finish / hubWon` | W＋検証済みfinished hub保存（通常/JOKER・旧共通/作品別） |
| `thirteenth-hour` | 13時 | 初勝利：fast26枚/slow52枚除去、山札と配置札が空 | `finish / hubWon` | W＋検証済みfinished hub保存（通常/JOKER・旧共通/作品別） |
| `four-kingdoms` | 四王国 | 初勝利：終局、kingdomScoresの自分得点 >= CPU（既存ルールで同点も勝利） | `finish / hubWon` | W＋検証済みfinished hub保存（通常/JOKER・旧共通/作品別） |
| `oblivion` | 忘却 | 初勝利：全カードの組が消去されcards全要素null | `finish / hubWon` | W＋検証済みfinished hub保存（通常/JOKER・旧共通/作品別） |

## 保存互換性と注意点

- index内5作品の証拠は構造・カード一意性・総数・固有勝利条件を共通ヘルパーで検証し、図鑑を直接開いた場合も移行する。進行中のセーブを書き換えず、過去の各モードのアーカイブを個別に読む。
- countdownのbestは非勝利でも保存されるため150以外は勝利とみなさない。the-answerのbestも途中詰みで保存されるため使わない。
- poker-squares / crossfire の古いnormal bestは以前JOKER対局で書き換わる問題があった。値から元モードを復元せず、完成証拠としてのみ扱う。今後の書込みは通常/JOKERで分離。
- lighthouse / seal / borderlineには対戦敗北の定義がなく、ルール上の終了条件で競技完了。勝利のある作品の敗北・引分・部分解除とは区別する。
- 報酬対象の判定・保存・移行はクリック監視に依存しない。非同期CPU・タイマーによる終局にも同じフックが走る。

## 検証チェックポイント

- `node fifty-two-preview/tests/collection-smoke.cjs`: 75 HTML / 72 standalone / 378 checks PASS（2026-11-24）。
- `node fifty-two-preview/tests/achievement-state.cjs`: 422 checks PASS。77IDの通常/JOKER旧勝利、作品ごとの重複防止、特殊旧キー、敗北記録の排除、保存失敗再試行、storageイベント循環抑止。
- `node fifty-two-preview/tests/achievement-coverage.cjs`: 全77作品×通常/JOKERの154ケース、860 assertions、0 failures。実際の終局分岐・未達/敗北・モード別勝利キー・報酬重複防止・再読込を確認。テスト配信時だけprivate closureへの評価窓口を挿入し、製品コードにテスト用フックはない。
- `node fifty-two-preview/tests/index-achievements.cjs`: 69ケースPASS。index5作品の勝利/敗北、J26実行時ヒント、旧保存・通常/JOKER別保存、図鑑直接オープン時の5作品移行、壊れた保存排除。
- CI・本番公開は `docs/HANDOFF.md` に実確認結果を記録する。
