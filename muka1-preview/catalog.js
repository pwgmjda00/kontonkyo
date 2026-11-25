// Stable IDs are public URL/database keys. Never renumber, recycle, or reorder a released manifest.
// Future growth: append PHRASES and a new date manifest; keep older manifests unchanged.
export const CATALOG_CUTOVER = "2026-11-26";
export const PHRASES = Object.freeze([
  Object.freeze({ id: 0, text: "努力できない人って結局甘えてるだけ。" }),
  Object.freeze({ id: 1, text: "反論してくる時点で効いてるんだろうね。" }),
  Object.freeze({
    id: 2,
    text: "怒らないで聞いてほしいんだけど、君にも原因あるよね？",
  }),
  Object.freeze({ id: 3, text: "本当に賢い人は自分を賢いとは思わない。" }),
  Object.freeze({ id: 4, text: "嫌なら見なきゃいいだけじゃない？" }),
  Object.freeze({ id: 5, text: "幸せな人はSNSで愚痴らないよ。" }),
  Object.freeze({
    id: 6,
    text: "別に否定してないよ。考え方が幼いって言ってるだけ。",
  }),
  Object.freeze({
    id: 7,
    text: "私、裏表ないから思ったこと全部言っちゃうんだよね。",
  }),
  Object.freeze({ id: 8, text: "普通に考えたら分かると思うけど。" }),
  Object.freeze({ id: 9, text: "成功した人の言葉には重みがあるんだよ。" }),
  Object.freeze({ id: 10, text: "そういうところだよ、君の悪いところ。" }),
  Object.freeze({ id: 11, text: "人それぞれだけど、私は絶対無理。" }),
  Object.freeze({ id: 12, text: "正論って嫌われるんだよね。" }),
  Object.freeze({ id: 13, text: "心に余裕がある人は怒らないよ。" }),
  Object.freeze({ id: 14, text: "知らないなら黙ってればいいのに。" }),
  Object.freeze({ id: 15, text: "自分磨きしてから恋愛したら？" }),
  Object.freeze({ id: 16, text: "言い訳を考える暇があるなら行動すれば？" }),
  Object.freeze({
    id: 17,
    text: "私は誰にでも平等だから、嫌いな人にも優しいよ。",
  }),
  Object.freeze({ id: 18, text: "まあ、分かる人にだけ分かればいい。" }),
  Object.freeze({ id: 19, text: "君のためを思って言ってるんだけど。" }),
  Object.freeze({ id: 20, text: "その程度で傷つくならネット向いてないよ。" }),
  Object.freeze({ id: 21, text: "私ならもっと上手くやるけどね。" }),
  Object.freeze({ id: 22, text: "別にマウント取ってないよ。事実だから。" }),
  Object.freeze({ id: 23, text: "価値観の違いって便利な言葉だよね。" }),
  Object.freeze({
    id: 24,
    text: "謝ってほしいなら、まず謝りたくなる態度を取ってほしい。",
  }),
  Object.freeze({
    id: 25,
    text: "私は結果じゃなくて過程を見てるよ。結果が出てないだけで。",
  }),
  Object.freeze({ id: 26, text: "大人になれば私の言ってる意味が分かるよ。" }),
  Object.freeze({
    id: 27,
    text: "聞かれたから答えただけなのに、なんで怒るの？",
  }),
  Object.freeze({ id: 28, text: "私の周りにはそんな人いないけどな。" }),
  Object.freeze({ id: 29, text: "期待してないから怒ってないよ。" }),
  Object.freeze({ id: 30, text: "本当に忙しい人は忙しいって言わない。" }),
  Object.freeze({ id: 31, text: "自分の機嫌くらい自分で取ろうよ。" }),
  Object.freeze({ id: 32, text: "そんなつもりで言ったんじゃないのに。" }),
  Object.freeze({ id: 33, text: "君は優しいから、損するタイプだよね。" }),
  Object.freeze({
    id: 34,
    text: "別に勝ち負けじゃないよ。私は間違ってないけど。",
  }),
  Object.freeze({ id: 35, text: "それ、わざわざ言う必要あった？" }),
  Object.freeze({
    id: 36,
    text: "私は気にしないけど、普通の人は気にすると思う。",
  }),
  Object.freeze({ id: 37, text: "何も言わないのも優しさなんだよ。" }),
  Object.freeze({ id: 38, text: "昔の私を見てるみたいで心配。" }),
  Object.freeze({ id: 39, text: "理解できないことを否定するのはよくないよ。" }),
  Object.freeze({ id: 40, text: "別に怒ってないよ。呆れてるだけ。" }),
  Object.freeze({ id: 41, text: "君の意見も尊重するよ。採用はしないけど。" }),
  Object.freeze({ id: 42, text: "私だったらそんなことで悩まないな。" }),
  Object.freeze({ id: 43, text: "質問する前に自分で考えた？" }),
  Object.freeze({ id: 44, text: "褒めてるのに何で嫌がるの？" }),
  Object.freeze({ id: 45, text: "それは優しさじゃなくて依存だよ。" }),
  Object.freeze({ id: 46, text: "忙しいのはみんな同じだからね。" }),
  Object.freeze({ id: 47, text: "常識って教わらないと分からないものなの？" }),
  Object.freeze({ id: 48, text: "私も昔はそういう時期あったよ。" }),
  Object.freeze({ id: 49, text: "謝罪は受け取るけど反省は伝わらないね。" }),
  Object.freeze({ id: 50, text: "別に期待してなかったから大丈夫。" }),
  Object.freeze({ id: 51, text: "その発想はなかったわ。いろんな意味で。" }),
  Object.freeze({ id: 52, text: "私は事実しか言わないタイプだから。" }),
  Object.freeze({ id: 53, text: "君の自由だけど、結果も自己責任だよ。" }),
  Object.freeze({ id: 54, text: "気にしすぎ。誰も君のこと見てないよ。" }),
  Object.freeze({ id: 55, text: "言葉より行動で示してほしいな。まず君が。" }),
  Object.freeze({ id: 56, text: "みんな言わないだけで思ってるよ。" }),
  Object.freeze({ id: 57, text: "それを個性って呼べるの羨ましい。" }),
  Object.freeze({ id: 58, text: "悪気がないなら何してもいいと思ってる？" }),
  Object.freeze({
    id: 59,
    text: "私は争いが嫌いだから、これ以上反論しないで。",
  }),
  Object.freeze({ id: 60, text: "普通の人ならそこで気づくよ。" }),
  Object.freeze({
    id: 61,
    text: "自分に正直なのはいいことだよ。程度によるけど。",
  }),
  Object.freeze({ id: 62, text: "私の時間も有限なんだけど。" }),
  Object.freeze({ id: 63, text: "話が通じる人とだけ話したいな。" }),
  Object.freeze({ id: 64, text: "それ、私に言われても困るんだけど。" }),
  Object.freeze({
    id: 65,
    text: "君のために時間を割いてるんだから感謝してよ。",
  }),
  Object.freeze({
    id: 66,
    text: "努力は裏切らないよ。やり方が悪かったんじゃない？",
  }),
  Object.freeze({
    id: 67,
    text: "私は謝れる人間だから、君にもそうなってほしい。",
  }),
  Object.freeze({ id: 68, text: "別に聞いてないけど、参考にはなったよ。" }),
  Object.freeze({ id: 69, text: "気持ちは分かるけど、分かるだけだよ。" }),
  Object.freeze({ id: 70, text: "そこまで説明しないと伝わらないんだ。" }),
  Object.freeze({ id: 71, text: "私なら黙って結果を出すかな。" }),
  Object.freeze({ id: 72, text: "自由にしていいよ。後悔しないならね。" }),
  Object.freeze({ id: 73, text: "そんなに真剣に受け取るとは思わなかった。" }),
  Object.freeze({
    id: 74,
    text: "私の意見に賛成しろとは言ってない。理解してって言ってるの。",
  }),
  Object.freeze({
    id: 75,
    text: "無理しなくていいよ。向いてないこともあるし。",
  }),
  Object.freeze({ id: 76, text: "君がそう思うならそれでいいんじゃない。" }),
  Object.freeze({ id: 77, text: "それくらい自分で調べられる時代だよ。" }),
  Object.freeze({ id: 78, text: "私は誰の味方でもないよ。正しい方の味方。" }),
  Object.freeze({ id: 79, text: "大丈夫、誰もそこまで期待してないから。" }),
  Object.freeze({
    id: 80,
    text: "私、間違ってたらちゃんと謝るよ。今回は違うけど。",
  }),
  Object.freeze({ id: 81, text: "話を聞いてほしいだけなら最初に言ってよ。" }),
  Object.freeze({ id: 82, text: "君のために言うのも今日で最後にするね。" }),
  Object.freeze({
    id: 83,
    text: "自分らしく生きればいいよ。迷惑かけない範囲で。",
  }),
  Object.freeze({ id: 84, text: "そんなに嫌なら距離を置けばいいのに。" }),
  Object.freeze({
    id: 85,
    text: "私のこと嫌いでもいいよ。見る目ないなとは思うけど。",
  }),
  Object.freeze({ id: 86, text: "何がそんなに難しいのか分からない。" }),
  Object.freeze({ id: 87, text: "意識してないのに好かれるから困る。" }),
  Object.freeze({ id: 88, text: "私も完璧じゃないけど、最低限はできるよ。" }),
  Object.freeze({ id: 89, text: "反省してる人は反省してるって言わないよ。" }),
  Object.freeze({
    id: 90,
    text: "それは相談じゃなくて同意が欲しいだけでしょ。",
  }),
  Object.freeze({
    id: 91,
    text: "私、察してほしいとか思わないから。察してよ。",
  }),
  Object.freeze({ id: 92, text: "そこまでして認められたいんだね。" }),
  Object.freeze({ id: 93, text: "悪いけど、私の中ではもう終わった話。" }),
  Object.freeze({
    id: 94,
    text: "君のペースでいいよ。待つとは言ってないけど。",
  }),
  Object.freeze({
    id: 95,
    text: "正直に言っただけで嫌われるの、理不尽だよね。",
  }),
  Object.freeze({ id: 96, text: "すっぴん失礼します🥺（加工済み）" }),
  Object.freeze({
    id: 97,
    text: "友達少ないんじゃなくて、選んでるだけなんだよね。",
  }),
  Object.freeze({ id: 98, text: "え、まだ現金使ってる人いるんだ。" }),
  Object.freeze({
    id: 99,
    text: "私のフォロワーさんなら分かってくれると思うけど。",
  }),
  Object.freeze({
    id: 100,
    text: "なんか知らない人から長文来てて草。読んでないけど。",
  }),
  Object.freeze({ id: 101, text: "これ言うとまたアンチ増えちゃうかな笑" }),
  Object.freeze({ id: 102, text: "低浮上になります。（本日17件目の投稿）" }),
  Object.freeze({
    id: 103,
    text: "本垢では言えないけど、ここにいる人は信用してる。",
  }),
  Object.freeze({ id: 104, text: "え待って、私なんかした？笑" }),
  Object.freeze({ id: 105, text: "仲良くない人からのいいね怖い。" }),
  Object.freeze({
    id: 106,
    text: "これ分かる人とは仲良くなれそう。分からない人はごめんね。",
  }),
  Object.freeze({
    id: 107,
    text: "フォロワー整理します。残りたい人は反応ください。",
  }),
  Object.freeze({
    id: 108,
    text: "あえて誰とは言わないけど、本人には伝わってほしいな。",
  }),
  Object.freeze({
    id: 109,
    text: "誕生日なのに通知少なくて人間関係見直してる。",
  }),
  Object.freeze({ id: 110, text: "私が男だったら絶対私と付き合う。" }),
  Object.freeze({
    id: 111,
    text: "こういうツイートに反応しない人、覚えてるからね。",
  }),
  Object.freeze({
    id: 112,
    text: "Twitterやめます。理由は聞かないでください。（翌朝おはようツイート）",
  }),
  Object.freeze({
    id: 113,
    text: "この界隈、私が来た頃はもっと平和だったんだけどな。",
  }),
  Object.freeze({
    id: 114,
    text: "伸びたので宣伝します。特に宣伝するものはないです。",
  }),
  Object.freeze({ id: 115, text: "寝てない自慢じゃないけど今日も睡眠2時間。" }),
  Object.freeze({
    id: 116,
    text: "有益な情報を無料で発信してることに感謝してほしい。",
  }),
  Object.freeze({
    id: 117,
    text: "通知切ってるので返信遅いです。（全リプに即返信）",
  }),
  Object.freeze({ id: 118, text: "初絡みでタメ口はちょっと無理かも。" }),
  Object.freeze({
    id: 119,
    text: "反論は受け付けません。これは私の個人的な意見なので。",
  }),
  Object.freeze({
    id: 120,
    text: "彼氏が買ってくれた。値段は載せないけどタグ見れば分かると思う。",
  }),
  Object.freeze({
    id: 121,
    text: "誰とは言わないけどブロックしました。察してください。",
  }),
  Object.freeze({ id: 122, text: "最近フォロワーの質が落ちてきた気がする。" }),
  Object.freeze({
    id: 123,
    text: "昔から推してた身としては新規さんに複雑な気持ち。",
  }),
  Object.freeze({
    id: 124,
    text: "論破するつもりなかったんだけど相手消えちゃった笑",
  }),
  Object.freeze({ id: 125, text: "ご報告。しばらく鍵にします。" }),
  Object.freeze({
    id: 126,
    text: "今日も誰にも頼まれてないけど人生について語ります。",
  }),
  Object.freeze({
    id: 127,
    text: "引用するならせめて私より面白いこと言ってね。",
  }),
  Object.freeze({
    id: 128,
    text: "新人さんへ。まずは界隈のルールを覚えてから発言してください。",
  }),
  Object.freeze({
    id: 129,
    text: "この程度でバズるなら私の過去ツイ全部バズっていいはず。",
  }),
  Object.freeze({ id: 130, text: "DM全部見てます。返す人は選んでます。" }),
  Object.freeze({
    id: 131,
    text: "お金ないって言ってる人、コンビニ行くのやめたら？",
  }),
  Object.freeze({ id: 132, text: "今日のランチは庶民的に千円で済ませた。" }),
  Object.freeze({
    id: 133,
    text: "自慢に聞こえたらごめん。普通の日常なんだけど。",
  }),
  Object.freeze({
    id: 134,
    text: "私の投稿を参考にするのはいいけど一言欲しいな。",
  }),
  Object.freeze({
    id: 135,
    text: "FF外から失礼します。あなたのために言います。",
  }),
  Object.freeze({ id: 136, text: "これ以上は有料級なのでここまで。" }),
  Object.freeze({ id: 137, text: "最近の若い子って検索もできないんだね。" }),
  Object.freeze({
    id: 138,
    text: "この服、去年から着てるんだけど今年流行ってるらしい。",
  }),
  Object.freeze({
    id: 139,
    text: "私の推しを軽い気持ちで好きって言わないでほしい。",
  }),
  Object.freeze({ id: 140, text: "友達の結婚式、正直私の方が泣いてた。" }),
  Object.freeze({
    id: 141,
    text: "みんなに好かれようとしてないのに好かれるから困る。",
  }),
  Object.freeze({ id: 142, text: "質問箱に質問来ないので自分で質問します。" }),
  Object.freeze({ id: 143, text: "いいねよりちゃんと感想が欲しいんだよね。" }),
  Object.freeze({
    id: 144,
    text: "無加工です。光の加減でちょっと違って見えるだけ。",
  }),
  Object.freeze({ id: 145, text: "仕事できる人って返信も早いよね。" }),
  Object.freeze({
    id: 146,
    text: "あの件については私からは何も言いません。以上です。",
  }),
  Object.freeze({
    id: 147,
    text: "このツイートは後で消すので拡散しないでください。",
  }),
  Object.freeze({ id: 148, text: "私が紹介した途端に売り切れてて笑った。" }),
  Object.freeze({
    id: 149,
    text: "フォローありがとうございます。フォロバは気分です。",
  }),
  Object.freeze({ id: 150, text: "趣味に本気になれない人とは話が合わない。" }),
  Object.freeze({ id: 151, text: "私の周りの経営者はみんなそう言ってる。" }),
  Object.freeze({
    id: 152,
    text: "炎上覚悟で言います。朝ごはんはパン派です。",
  }),
  Object.freeze({
    id: 153,
    text: "ごめん、通知多すぎて一人ずつ返せない。（いいね3件）",
  }),
  Object.freeze({
    id: 154,
    text: "同担拒否じゃないけど私の前で推しの話しないで。",
  }),
  Object.freeze({
    id: 155,
    text: "今日も仕事頑張ったので誰か褒めて。できれば具体的に。",
  }),
  Object.freeze({
    id: 156,
    text: "リプする勇気ないなら無理にフォローしなくていいよ。",
  }),
  Object.freeze({
    id: 157,
    text: "案件じゃないです。本当に好きなものしか紹介しません。",
  }),
  Object.freeze({
    id: 158,
    text: "この投稿の意味が分かった人だけいいねして。",
  }),
  Object.freeze({
    id: 159,
    text: "私の誕生日まであと一ヶ月。そろそろ予定空けといてね。",
  }),
  Object.freeze({
    id: 160,
    text: "別にバズりたいわけじゃないけど、なんでこれ伸びないの？",
  }),
  Object.freeze({
    id: 161,
    text: "フォロワー減った。合わない人が自然に淘汰されてる。",
  }),
  Object.freeze({
    id: 162,
    text: "趣味垢なので趣味の合わない方はフォローしないでください。",
  }),
  Object.freeze({
    id: 163,
    text: "おはようございます。挨拶返せる人だけ好きです。",
  }),
  Object.freeze({
    id: 164,
    text: "今日の自炊、適当に作っただけなのにお店レベルだった。",
  }),
  Object.freeze({
    id: 165,
    text: "私がいない飲み会の写真を載せる意味って何？",
  }),
  Object.freeze({
    id: 166,
    text: "全然怒ってないので、何が悪かったか自分で考えてください。",
  }),
  Object.freeze({
    id: 167,
    text: "私の推し、売れてほしいけど有名にはなってほしくない。",
  }),
  Object.freeze({
    id: 168,
    text: "ネタバレ嫌ならネット見るなっていうのは違うと思うので全員配慮して。",
  }),
  Object.freeze({
    id: 169,
    text: "ゲームは楽しむものだから。勝率は載せとくけど。",
  }),
  Object.freeze({
    id: 170,
    text: "初心者歓迎です。最低限の知識は身につけてきてね。",
  }),
  Object.freeze({
    id: 171,
    text: "無課金でもここまで来れた。課金してる人は何してるの？",
  }),
  Object.freeze({
    id: 172,
    text: "攻略見ない派です。詰まったので答えだけ教えてください。",
  }),
  Object.freeze({
    id: 173,
    text: "作品に罪はないけど、その作品好きな人とは距離置く。",
  }),
  Object.freeze({
    id: 174,
    text: "これ好きって言っとけばセンスいいと思われそう。",
  }),
  Object.freeze({
    id: 175,
    text: "映画の感想、理解できなかった人には難しかったかもね。",
  }),
  Object.freeze({
    id: 176,
    text: "読書好きです。今年はまだ一冊も読めてないけど。",
  }),
  Object.freeze({
    id: 177,
    text: "音楽はマイナーな方が好き。有名になったら聴かなくなる。",
  }),
  Object.freeze({
    id: 178,
    text: "忙しすぎてSNS見る暇ない。さて今日の出来事をスレッドにします。",
  }),
  Object.freeze({
    id: 179,
    text: "お祝いリプは全部スクショしてます。来なかった人も把握してます。",
  }),
  Object.freeze({
    id: 180,
    text: "いいね欄見たけど、そういうの好きなんだね。",
  }),
  Object.freeze({
    id: 181,
    text: "私のことを知らない人に説明するの面倒だから固定読んで。",
  }),
  Object.freeze({
    id: 182,
    text: "今日は愚痴らないって決めた。まず昨日の話なんだけど。",
  }),
  Object.freeze({ id: 183, text: "一人の時間が好き。誰か通話しない？" }),
  Object.freeze({
    id: 184,
    text: "相談乗ります。アドバイス聞かない人は来ないで。",
  }),
  Object.freeze({
    id: 185,
    text: "気軽に絡んでね。距離感おかしい人は即ブロックします。",
  }),
  Object.freeze({
    id: 186,
    text: "誰か暇な人いない？今から私の話だけ聞いてほしい。",
  }),
  Object.freeze({
    id: 187,
    text: "私のツイートに似てるけど偶然ってことにしとくね。",
  }),
  Object.freeze({
    id: 188,
    text: "写真撮るまで食べないでって何回言えば分かるの？",
  }),
  Object.freeze({
    id: 189,
    text: "旅行先ではスマホを見ない派です。（現地から連続投稿）",
  }),
  Object.freeze({
    id: 190,
    text: "わざわざ言わないけど、私はちゃんと募金してます。",
  }),
  Object.freeze({
    id: 191,
    text: "人の幸せを喜べる人でありたい。あの人以外は。",
  }),
  Object.freeze({
    id: 192,
    text: "返信不要です。既読くらいはつけてください。",
  }),
  Object.freeze({
    id: 193,
    text: "私の誤字を指摘する前に内容を理解してほしい。",
  }),
  Object.freeze({
    id: 194,
    text: "これに反応した人、あとで個別に話があります。",
  }),
  Object.freeze({
    id: 195,
    text: "昨日の投稿消したけどスクショ持ってる人は消してね。",
  }),
  Object.freeze({
    id: 196,
    text: "別に仲間外れとは思ってないけど集合写真は保存した。",
  }),
  Object.freeze({
    id: 197,
    text: "友達の成功報告、素直に喜べる余裕がある自分でよかった。",
  }),
  Object.freeze({
    id: 198,
    text: "この程度の料理で褒められる旦那、羨ましい。",
  }),
  Object.freeze({
    id: 199,
    text: "彼氏の愚痴言ったら別れろって言われた。そういうことじゃない。",
  }),
  Object.freeze({
    id: 200,
    text: "恋人に求める条件は普通であること。条件は固定にまとめました。",
  }),
  Object.freeze({
    id: 201,
    text: "人見知りなのでそちらから話題を提供してください。",
  }),
  Object.freeze({ id: 202, text: "敬語やめよ！でも呼び捨てはまだ早いかな。" }),
  Object.freeze({ id: 203, text: "私の投稿にだけ反応しない理由が知りたい。" }),
  Object.freeze({
    id: 204,
    text: "サブ垢作りました。見つけてもフォローしないでね。",
  }),
  Object.freeze({
    id: 205,
    text: "鍵垢の内容を想像で語るのやめてもらえます？",
  }),
  Object.freeze({ id: 206, text: "今日から健康生活。ご褒美にケーキ買った。" }),
  Object.freeze({ id: 207, text: "節約のためにセールで五万円使った。" }),
  Object.freeze({
    id: 208,
    text: "忙しいので短文でお願いします。私の返信は長くなります。",
  }),
  Object.freeze({
    id: 209,
    text: "無料で描いてもらった絵、ちょっと修正お願いしていいかな。",
  }),
  Object.freeze({
    id: 210,
    text: "趣味でやってるだけなので評価は気にしません。感想ください。",
  }),
  Object.freeze({
    id: 211,
    text: "依頼受付中です。予算が合わない方は相談しないでください。",
  }),
  Object.freeze({
    id: 212,
    text: "AI使えば誰でもできるでしょ。私は使い方知らないけど。",
  }),
  Object.freeze({
    id: 213,
    text: "手作りの温かみって大事。配送は明日までにお願いします。",
  }),
  Object.freeze({ id: 214, text: "レビュー星四つ。特に不満はありません。" }),
  Object.freeze({ id: 215, text: "店員さんに顔覚えられたからもう行けない。" }),
  Object.freeze({
    id: 216,
    text: "行列に並ぶ人の気が知れない。（整理券取得済み）",
  }),
  Object.freeze({ id: 217, text: "旅行の計画は任せるよ。そこ以外でお願い。" }),
  Object.freeze({ id: 218, text: "何でも食べるよ。今言った三つ以外なら。" }),
  Object.freeze({
    id: 219,
    text: "割り勘でいいよ。私そんなに食べてないけど。",
  }),
  Object.freeze({ id: 220, text: "遅刻する人嫌い。今家出た。" }),
  Object.freeze({
    id: 221,
    text: "集合時間より早く来る人って圧かけてるよね。",
  }),
  Object.freeze({
    id: 222,
    text: "誘ってくれれば行ったのに。予定は空いてなかったけど。",
  }),
  Object.freeze({
    id: 223,
    text: "プレゼントは気持ちが大事。欲しいものリストはこちら。",
  }),
  Object.freeze({ id: 224, text: "サプライズ苦手だから事前に内容教えてね。" }),
  Object.freeze({
    id: 225,
    text: "私のために無理しないで。無理してくれたら嬉しいけど。",
  }),
  Object.freeze({
    id: 226,
    text: "返信遅くても気にしない人が好き。返信まだ？",
  }),
  Object.freeze({
    id: 227,
    text: "既読無視は気にしないけどオンラインなのは見えてる。",
  }),
  Object.freeze({
    id: 228,
    text: "人間関係リセットしたら誰も追いかけてこなかった。",
  }),
  Object.freeze({ id: 229, text: "今日は誰とも話したくない。誰か察して。" }),
  Object.freeze({ id: 230, text: "愚痴垢なので愚痴に愚痴を言わないで。" }),
  Object.freeze({
    id: 231,
    text: "私は中立です。反対意見はミュートしました。",
  }),
  Object.freeze({
    id: 232,
    text: "議論しましょう。まず私の前提を全部認めてください。",
  }),
  Object.freeze({ id: 233, text: "ソースは？私は体感で話してるけど。" }),
  Object.freeze({
    id: 234,
    text: "論点ずらさないで。ちなみに全然関係ない話なんだけど。",
  }),
  Object.freeze({
    id: 235,
    text: "長文お疲れ様です。三行にして出直してください。",
  }),
  Object.freeze({
    id: 236,
    text: "誤解を招いたなら謝ります。誤解した方にも責任はあります。",
  }),
  Object.freeze({ id: 237, text: "謝罪文を出したのでこの件は終了です。" }),
  Object.freeze({
    id: 238,
    text: "私も被害者なのでこれ以上責めないでください。",
  }),
  Object.freeze({
    id: 239,
    text: "切り抜きで判断しないで。元動画は消しました。",
  }),
  Object.freeze({
    id: 240,
    text: "正しい情報を広めたいので訂正は各自で調べてください。",
  }),
  Object.freeze({ id: 241, text: "デマには気をつけて。知らんけど。" }),
  Object.freeze({
    id: 242,
    text: "専門家じゃないけど専門家より現場を知ってます。",
  }),
  Object.freeze({
    id: 243,
    text: "数字じゃ測れない価値がある。ちなみにフォロワーは一万人。",
  }),
  Object.freeze({
    id: 244,
    text: "フォロワー数で判断する人嫌い。あなた何人？",
  }),
  Object.freeze({ id: 245, text: "有名人に認知されたので実質古参です。" }),
  Object.freeze({ id: 246, text: "案件ください。ステマは嫌いです。" }),
  Object.freeze({
    id: 247,
    text: "PRだけど本音です。悪いところは契約上言えません。",
  }),
  Object.freeze({
    id: 248,
    text: "無料公開は今日まで。昨日も今日まででした。",
  }),
  Object.freeze({ id: 249, text: "限定販売です。好評につき毎週再販します。" }),
  Object.freeze({
    id: 250,
    text: "本当に欲しい人に届いてほしいので抽選条件は引用とフォローです。",
  }),
  Object.freeze({ id: 251, text: "当選報告がない方は次回から対象外です。" }),
  Object.freeze({
    id: 252,
    text: "このアカウントは平和主義です。嫌いな人一覧は固定にあります。",
  }),
  Object.freeze({
    id: 253,
    text: "優しい世界にしたいので合わない人は全員消えてほしい。",
  }),
  Object.freeze({ id: 254, text: "SNSに疲れたので別のSNS始めました。" }),
  Object.freeze({ id: 255, text: "ここまで読んだ人は暇なんですね。" }),
  Object.freeze({
    id: 1000255,
    text: "プロフィールに繊細って書く前に通知を切れば？",
  }),
  Object.freeze({
    id: 1000256,
    text: "別に怒ってないけど、次から気をつけてね",
  }),
  Object.freeze({
    id: 1000257,
    text: "君のために嫌われ役を買って出てるんだよ",
  }),
  Object.freeze({
    id: 1000258,
    text: "今は理解できなくてもいつか感謝すると思う",
  }),
  Object.freeze({ id: 1000259, text: "そう受け取る自由もあるからね" }),
  Object.freeze({
    id: 1000260,
    text: "説明書に付箋まで貼ったので次は読むところからお願いします",
  }),
  Object.freeze({
    id: 1000261,
    text: "その提案、匿名アンケートなら賛成ゼロだと思うよ",
  }),
  Object.freeze({
    id: 1000262,
    text: "君が納得するまで待つ義理はないんだけど",
  }),
  Object.freeze({ id: 1000263, text: "その反応も含めて想定内です" }),
  Object.freeze({ id: 1000264, text: "大人ならここで引くと思うんだけど" }),
  Object.freeze({
    id: 1000265,
    text: "負けた側がルールを語り始めるの、毎回面白いね",
  }),
  Object.freeze({ id: 1000266, text: "言葉を選んだ結果がこれなんだよね" }),
  Object.freeze({ id: 1000267, text: "自分で気づいてほしかったな" }),
  Object.freeze({
    id: 1000268,
    text: "図解も作ったけど、次は紙芝居が必要かな",
  }),
  Object.freeze({ id: 1000269, text: "期待してたからこそ残念です" }),
  Object.freeze({ id: 1000270, text: "今の君にはまだ早い話だったね" }),
  Object.freeze({ id: 1000271, text: "私だったら恥ずかしくて投稿できない" }),
  Object.freeze({
    id: 1000272,
    text: "その悩み、私の研修資料なら三枚目で解決してる",
  }),
  Object.freeze({ id: 1000273, text: "あえて答えは教えません" }),
  Object.freeze({ id: 1000274, text: "怒るほどの相手でもないので" }),
  Object.freeze({
    id: 1000275,
    text: "読者を選ぶ文章なので低評価は想定内です",
  }),
  Object.freeze({ id: 1000276, text: "この話が刺さる人には刺さるんだろうな" }),
  Object.freeze({ id: 1000277, text: "理解力の差は仕方ないよね" }),
  Object.freeze({ id: 1000278, text: "そこに疑問を持てるようになるといいね" }),
  Object.freeze({ id: 1000279, text: "君にもいつか見える景色だよ" }),
  Object.freeze({ id: 1000280, text: "説明する時間の方がもったいない" }),
  Object.freeze({
    id: 1000281,
    text: "無料相談の続きは私の講座で受け付けてます",
  }),
  Object.freeze({ id: 1000282, text: "気づいた人から抜け出してるよ" }),
  Object.freeze({ id: 1000283, text: "私はもうその段階を卒業しました" }),
  Object.freeze({ id: 1000284, text: "議論できるレベルになったらまた話そう" }),
  Object.freeze({ id: 1000285, text: "わざと簡単な言葉にしてあげてる" }),
  Object.freeze({ id: 1000286, text: "これを難しいと感じるのも個性だよ" }),
  Object.freeze({ id: 1000287, text: "寝てないのに元気すぎて逆に困る" }),
  Object.freeze({ id: 1000288, text: "適当にやった方が評価されるのなんで" }),
  Object.freeze({
    id: 1000289,
    text: "普通に歩いてるだけなのにまた道聞かれた",
  }),
  Object.freeze({ id: 1000290, text: "無欲な人ほど結果がついてくるらしい" }),
  Object.freeze({
    id: 1000291,
    text: "勉強してないのに受かったから申し訳ない",
  }),
  Object.freeze({
    id: 1000292,
    text: "顔じゃなくて中身を見てほしいんだけどな",
  }),
  Object.freeze({ id: 1000293, text: "また仕事を任されてしまった" }),
  Object.freeze({ id: 1000294, text: "友達多いと休日が休日じゃない" }),
  Object.freeze({ id: 1000295, text: "私の普通が誰かの努力らしい" }),
  Object.freeze({ id: 1000296, text: "お金に興味ないのに貯まっていく" }),
  Object.freeze({ id: 1000297, text: "褒められるの苦手だからやめてほしい" }),
  Object.freeze({
    id: 1000298,
    text: "頑張ってるつもりないから努力家扱い困る",
  }),
  Object.freeze({
    id: 1000299,
    text: "地味な服でも目立つってどうすればいいの",
  }),
  Object.freeze({ id: 1000300, text: "相談されすぎて自分の相談する暇ない" }),
  Object.freeze({ id: 1000301, text: "人脈とか意識したことないんだけどね" }),
  Object.freeze({ id: 1000302, text: "自分では凡人だと思ってるんだけど" }),
  Object.freeze({ id: 1000303, text: "私は優しすぎるのが欠点なんだと思う" }),
  Object.freeze({ id: 1000304, text: "人を嫌いになれない自分が嫌になる" }),
  Object.freeze({
    id: 1000305,
    text: "席を譲るときだけ周りに聞こえる声になっちゃう",
  }),
  Object.freeze({ id: 1000306, text: "見返りを求めない自分でよかった" }),
  Object.freeze({ id: 1000307, text: "今日も誰にも知られずいいことをした" }),
  Object.freeze({ id: 1000308, text: "人の幸せを願える自分でありたい" }),
  Object.freeze({ id: 1000309, text: "私が我慢すれば丸く収まるから" }),
  Object.freeze({ id: 1000310, text: "人の悪口を言う時間があるなら花を買う" }),
  Object.freeze({ id: 1000311, text: "嫌いな人にも幸せになってほしい派です" }),
  Object.freeze({ id: 1000312, text: "誰かを傷つける言葉だけは使いたくない" }),
  Object.freeze({ id: 1000313, text: "感謝できる人間でよかったと毎日思う" }),
  Object.freeze({ id: 1000314, text: "優しさを利用されても優しくありたい" }),
  Object.freeze({ id: 1000315, text: "人の成功を素直に喜べないって悲しいね" }),
  Object.freeze({ id: 1000316, text: "私は敵にも敬意を払うようにしてる" }),
  Object.freeze({ id: 1000317, text: "いい人でいることに疲れる日もある" }),
  Object.freeze({ id: 1000318, text: "誰かのために生きるって贅沢だよね" }),
  Object.freeze({
    id: 1000319,
    text: "不機嫌で出社するなら朝礼で理由も発表してほしい",
  }),
  Object.freeze({ id: 1000320, text: "忙しいって言葉は優先順位の告白だよ" }),
  Object.freeze({ id: 1000321, text: "時間がないんじゃなくて作ってないだけ" }),
  Object.freeze({ id: 1000322, text: "やる気を待ってるうちは何も変わらない" }),
  Object.freeze({ id: 1000323, text: "才能の話をする前に一万回やってみた？" }),
  Object.freeze({ id: 1000324, text: "できない理由を探す才能はあるんだね" }),
  Object.freeze({ id: 1000325, text: "今日の選択が五年後の君を作る" }),
  Object.freeze({ id: 1000326, text: "休むことと逃げることは違うからね" }),
  Object.freeze({ id: 1000327, text: "環境のせいにできるうちは楽だよね" }),
  Object.freeze({
    id: 1000328,
    text: "努力が報われないんじゃなくて方向が違う",
  }),
  Object.freeze({ id: 1000329, text: "本気なら眠いとか言ってられない" }),
  Object.freeze({ id: 1000330, text: "失敗した回数が足りないだけでは" }),
  Object.freeze({ id: 1000331, text: "人生を変えたい人がその生活してるの？" }),
  Object.freeze({
    id: 1000332,
    text: "返信が速い人だけを集めたら会議が不要になりました",
  }),
  Object.freeze({ id: 1000333, text: "できる人はやり方を聞く前にやってる" }),
  Object.freeze({ id: 1000334, text: "行動した人にしか見えない景色がある" }),
  Object.freeze({
    id: 1000335,
    text: "会議で反対ゼロだったので全員の総意として出します",
  }),
  Object.freeze({ id: 1000336, text: "普通の人はそこまで気にしないと思う" }),
  Object.freeze({ id: 1000337, text: "世間は君が思うほど優しくないよ" }),
  Object.freeze({ id: 1000338, text: "私だけが感じてる違和感じゃないはず" }),
  Object.freeze({ id: 1000339, text: "これに共感できない人がいるのが驚き" }),
  Object.freeze({ id: 1000340, text: "周りの人も困ってると思うよ" }),
  Object.freeze({ id: 1000341, text: "大多数はわざわざ反論しないだけ" }),
  Object.freeze({ id: 1000342, text: "みんな忙しいから指摘してないんだよ" }),
  Object.freeze({ id: 1000343, text: "私が代表して言わせてもらいます" }),
  Object.freeze({ id: 1000344, text: "これが今の若い人の総意だと思う" }),
  Object.freeze({ id: 1000345, text: "まともな感覚の人なら分かるはず" }),
  Object.freeze({ id: 1000346, text: "世の中そんなに暇じゃないんですよ" }),
  Object.freeze({ id: 1000347, text: "みんな大人だから合わせてくれてるだけ" }),
  Object.freeze({ id: 1000348, text: "言いにくいことを言ってくれる人は貴重" }),
  Object.freeze({ id: 1000349, text: "反対意見が少ないのが答えだよね" }),
  Object.freeze({ id: 1000350, text: "声に出さない人の気持ちも考えてほしい" }),
  Object.freeze({
    id: 1000351,
    text: "コメント欄は感想受付です。検証の持ち込みはご遠慮ください",
  }),
  Object.freeze({ id: 1000352, text: "炎上覚悟で当たり前のことを言います" }),
  Object.freeze({ id: 1000353, text: "異論は認めるけど納得はしない" }),
  Object.freeze({
    id: 1000354,
    text: "誰のことか分かった人はそっと拍手してください",
  }),
  Object.freeze({
    id: 1000355,
    text: "特定の誰かを指してるわけではありません",
  }),
  Object.freeze({ id: 1000356, text: "誤解を恐れずに言うと誤解する方の問題" }),
  Object.freeze({ id: 1000357, text: "不快になったなら自分の課題かも" }),
  Object.freeze({ id: 1000358, text: "批判じゃなくて純粋な疑問なんです" }),
  Object.freeze({ id: 1000359, text: "これを攻撃と捉える人もいるんだろうな" }),
  Object.freeze({ id: 1000360, text: "あくまで一般論なので悪しからず" }),
  Object.freeze({ id: 1000361, text: "反論する前に一度冷静になってください" }),
  Object.freeze({ id: 1000362, text: "全員に理解されようとは思ってません" }),
  Object.freeze({ id: 1000363, text: "言いたいことは分かるけど私は違うかな" }),
  Object.freeze({ id: 1000364, text: "例外の話をしても仕方ないので" }),
  Object.freeze({ id: 1000365, text: "私の意見が絶対とは言わないけどね" }),
  Object.freeze({ id: 1000366, text: "これ以上は各自で考えていただければ" }),
  Object.freeze({
    id: 1000367,
    text: "相談への回答、私の成功体験スライドで説明するね",
  }),
  Object.freeze({ id: 1000368, text: "私ならもっと早く気づいてたかも" }),
  Object.freeze({ id: 1000369, text: "それで済んでるならまだいい方だよ" }),
  Object.freeze({ id: 1000370, text: "私の話を聞いたら元気出ると思う" }),
  Object.freeze({ id: 1000371, text: "大変だったね、私には耐えられないな" }),
  Object.freeze({
    id: 1000372,
    text: "悩みの相談、成長記録として保存しておいていい？",
  }),
  Object.freeze({ id: 1000373, text: "気持ちは分かるけど私なら選ばない" }),
  Object.freeze({ id: 1000374, text: "私も似た経験あるけど乗り越えたよ" }),
  Object.freeze({
    id: 1000375,
    text: "相談は聞くよ。解決までの所要時間を先に教えて",
  }),
  Object.freeze({
    id: 1000376,
    text: "その話、珍しいので次の飲み会で紹介していい？",
  }),
  Object.freeze({ id: 1000377, text: "その環境でよく頑張ってるね" }),
  Object.freeze({ id: 1000378, text: "私だったらすぐ環境を変えるけど" }),
  Object.freeze({
    id: 1000379,
    text: "つらいよね、私は考え方変えたら楽になった",
  }),
  Object.freeze({
    id: 1000380,
    text: "悩みがあるってことはまだ余裕があるんだよ",
  }),
  Object.freeze({
    id: 1000381,
    text: "分かるよ、でもそれって結局自分次第だよね",
  }),
  Object.freeze({ id: 1000382, text: "話聞いてあげるからまず落ち着いて" }),
  Object.freeze({ id: 1000383, text: "その話、結論から言ってもらえる？" }),
  Object.freeze({
    id: 1000384,
    text: "了解です、念のため全員に共有しておきます",
  }),
  Object.freeze({ id: 1000385, text: "前にもお伝えした認識ですが" }),
  Object.freeze({ id: 1000386, text: "こちらとしては特に問題ないです" }),
  Object.freeze({
    id: 1000387,
    text: "認識が揃っていないようなので再掲します",
  }),
  Object.freeze({ id: 1000388, text: "一旦持ち帰っていただいていいですか" }),
  Object.freeze({ id: 1000389, text: "私の説明不足でしたね、失礼しました" }),
  Object.freeze({ id: 1000390, text: "普通にやれば終わる作業なんですけど" }),
  Object.freeze({ id: 1000391, text: "その件は既に私の方で対応済みです" }),
  Object.freeze({ id: 1000392, text: "そこは各自の判断でお願いしたいです" }),
  Object.freeze({ id: 1000393, text: "確認だけなら今できると思うのですが" }),
  Object.freeze({ id: 1000394, text: "急ぎではないので今日中で大丈夫です" }),
  Object.freeze({
    id: 1000395,
    text: "細かい話はいいのでまず形にしてください",
  }),
  Object.freeze({
    id: 1000396,
    text: "私がやった方が早いので今回は引き取ります",
  }),
  Object.freeze({
    id: 1000397,
    text: "できない場合は事前に言ってほしかったです",
  }),
  Object.freeze({
    id: 1000398,
    text: "質問の意図をもう少し明確にしてください",
  }),
  Object.freeze({ id: 1000399, text: "最近は何でもハラスメントになるんだね" }),
  Object.freeze({ id: 1000400, text: "昔はこれくらい笑って済ませてたよ" }),
  Object.freeze({ id: 1000401, text: "便利になりすぎて人間が弱くなった" }),
  Object.freeze({ id: 1000402, text: "本物を知らない世代には仕方ないか" }),
  Object.freeze({ id: 1000403, text: "昔の作品を見てから評価してほしい" }),
  Object.freeze({ id: 1000404, text: "今の子は失敗する機会すら奪われてる" }),
  Object.freeze({
    id: 1000405,
    text: "あの頃はスマホなんてなくても楽しかった",
  }),
  Object.freeze({ id: 1000406, text: "何でも言語化するのも考えものだね" }),
  Object.freeze({ id: 1000407, text: "最近の音楽は全部同じに聞こえる" }),
  Object.freeze({ id: 1000408, text: "昔のネットの方が居心地よかったな" }),
  Object.freeze({ id: 1000409, text: "新しいものがいいとは限らないよ" }),
  Object.freeze({ id: 1000410, text: "昔はこんな説明書なくても遊べた" }),
  Object.freeze({ id: 1000411, text: "今は優しさの意味が変わったらしい" }),
  Object.freeze({ id: 1000412, text: "便利さと引き換えに何か失ったよね" }),
  Object.freeze({ id: 1000413, text: "あの時代を知ってる人には伝わると思う" }),
  Object.freeze({ id: 1000414, text: "流行に乗らないのが私なりの流行です" }),
  Object.freeze({ id: 1000415, text: "その店まだ行ったことないの？" }),
  Object.freeze({ id: 1000416, text: "有名になる前から知ってたんだけどな" }),
  Object.freeze({ id: 1000417, text: "初心者にはちょうどいい作品だと思う" }),
  Object.freeze({ id: 1000418, text: "その作者なら初期の方が圧倒的にいい" }),
  Object.freeze({ id: 1000419, text: "それを名作と呼ぶなら他も見てほしい" }),
  Object.freeze({ id: 1000420, text: "人気が出てから雰囲気変わったよね" }),
  Object.freeze({
    id: 1000421,
    text: "売れ始めたので、この作品は初心者向けの棚へ移しました",
  }),
  Object.freeze({ id: 1000422, text: "それは入口であって本質ではないよ" }),
  Object.freeze({ id: 1000423, text: "そこまで好きなら原典も読んでほしい" }),
  Object.freeze({ id: 1000424, text: "通ぶるつもりはないけど違いは分かる" }),
  Object.freeze({ id: 1000425, text: "本当に好きな人はランキング気にしない" }),
  Object.freeze({ id: 1000426, text: "その解釈もありだけど浅いかな" }),
  Object.freeze({
    id: 1000427,
    text: "最近ファンになった人には伝わらないかも",
  }),
  Object.freeze({ id: 1000428, text: "私は流行る前に飽きちゃった" }),
  Object.freeze({ id: 1000429, text: "その良さが分かるようになったんだね" }),
  Object.freeze({
    id: 1000430,
    text: "知識より愛が大事だよ、知識も必要だけど",
  }),
  Object.freeze({
    id: 1000431,
    text: "返事はいらないので、この文章に感想だけください",
  }),
  Object.freeze({ id: 1000432, text: "忙しいなら仕方ないよ、私も忙しいし" }),
  Object.freeze({ id: 1000433, text: "私から誘わなかったら会わないんだね" }),
  Object.freeze({ id: 1000434, text: "気にしてないから好きにしていいよ" }),
  Object.freeze({
    id: 1000435,
    text: "記念日は覚えてなくていいよ。去年の分も記録してるから",
  }),
  Object.freeze({ id: 1000436, text: "言われてやるのと自分からやるのは違う" }),
  Object.freeze({ id: 1000437, text: "謝ってほしいわけじゃないんだよね" }),
  Object.freeze({ id: 1000438, text: "もういいよ、これ以上説明したくない" }),
  Object.freeze({ id: 1000439, text: "楽しそうで何よりです" }),
  Object.freeze({ id: 1000440, text: "私のことは後回しでいいからね" }),
  Object.freeze({ id: 1000441, text: "連絡する余裕はあったみたいだね" }),
  Object.freeze({ id: 1000442, text: "そういう優先順位なんだと理解しました" }),
  Object.freeze({ id: 1000443, text: "無理して付き合ってくれなくていいよ" }),
  Object.freeze({ id: 1000444, text: "次は私も同じようにするね" }),
  Object.freeze({ id: 1000445, text: "ちゃんと覚えておくから安心して" }),
  Object.freeze({ id: 1000446, text: "気づかないならそれでいいと思う" }),
  Object.freeze({
    id: 1000447,
    text: "数字は気にしない主義なので通知だけ一分おきに見てます",
  }),
  Object.freeze({
    id: 1000448,
    text: "投稿を伸ばす講座を始めます。実績はこれから作ります",
  }),
  Object.freeze({
    id: 1000449,
    text: "フォロー解除にも一言添えるのが礼儀だと思います",
  }),
  Object.freeze({
    id: 1000450,
    text: "読解テストに合格した方から順にフォローを承認します",
  }),
  Object.freeze({ id: 1000451, text: "引用するなら最後まで読んでからにして" }),
  Object.freeze({
    id: 1000452,
    text: "通知は全部読んでます。返信の有無が私の評価です",
  }),
  Object.freeze({
    id: 1000453,
    text: "数字より質の高い繋がりを大切にしてます",
  }),
  Object.freeze({ id: 1000454, text: "伸びてる投稿ほど中身がないの悲しい" }),
  Object.freeze({ id: 1000455, text: "このアカウントは私の庭なので" }),
  Object.freeze({ id: 1000456, text: "反応ないけど見てる人は見てるんだよね" }),
  Object.freeze({ id: 1000457, text: "いいねは同意とは限らないので念のため" }),
  Object.freeze({ id: 1000458, text: "無言で外す人の心理が知りたい" }),
  Object.freeze({ id: 1000459, text: "フォロー返し目的の方はご遠慮ください" }),
  Object.freeze({ id: 1000460, text: "たまには本音を言ってもいいよね" }),
  Object.freeze({ id: 1000461, text: "この投稿も切り取られるんだろうな" }),
  Object.freeze({ id: 1000462, text: "消すか迷ったけど記録として残します" }),
  Object.freeze({ id: 1000463, text: "安いものを買う余裕が私にはない" }),
  Object.freeze({ id: 1000464, text: "値段じゃなくて価値で選んでます" }),
  Object.freeze({ id: 1000465, text: "旅行は観光より暮らすように楽しむ派" }),
  Object.freeze({
    id: 1000466,
    text: "食事にお金をかけない人とは合わないかも",
  }),
  Object.freeze({ id: 1000467, text: "物を減らしたら心まで豊かになった" }),
  Object.freeze({ id: 1000468, text: "高いと思うならまだ買う時期じゃない" }),
  Object.freeze({ id: 1000469, text: "本当の贅沢って何もしない時間だよ" }),
  Object.freeze({
    id: 1000470,
    text: "ブランドに興味ないけど品質は妥協しない",
  }),
  Object.freeze({ id: 1000471, text: "安さを自慢する文化が苦手です" }),
  Object.freeze({ id: 1000472, text: "お金がない時ほどいいものを買うべき" }),
  Object.freeze({ id: 1000473, text: "自分への投資はケチらないようにしてる" }),
  Object.freeze({ id: 1000474, text: "節約より稼ぐことを考えた方が早い" }),
  Object.freeze({ id: 1000475, text: "量より質を選べる大人でいたい" }),
  Object.freeze({ id: 1000476, text: "値札を見ずに選ぶ練習をしています" }),
  Object.freeze({ id: 1000477, text: "忙しい日ほど丁寧にコーヒーを淹れる" }),
  Object.freeze({ id: 1000478, text: "何を持たないかにその人の品が出る" }),
  Object.freeze({ id: 1000479, text: "それ、私が言おうと思ってたことだ" }),
  Object.freeze({ id: 1000480, text: "冗談が通じないと会話が難しいね" }),
  Object.freeze({
    id: 1000481,
    text: "その冗談、笑うところに字幕をつけてもらえる？",
  }),
  Object.freeze({ id: 1000482, text: "あえて空気を読まないようにしてる" }),
  Object.freeze({ id: 1000483, text: "笑ってくれると思ったんだけどな" }),
  Object.freeze({ id: 1000484, text: "ここまでがネタなんだけど伝わった？" }),
  Object.freeze({ id: 1000485, text: "真面目な人って生きづらそう" }),
  Object.freeze({ id: 1000486, text: "別に面白いこと言ったつもりないけど" }),
  Object.freeze({ id: 1000487, text: "私のユーモアは人を選ぶらしい" }),
  Object.freeze({ id: 1000488, text: "冗談に説明が必要になったら終わりだね" }),
  Object.freeze({ id: 1000489, text: "そのツッコミはちょっと予想通りだった" }),
  Object.freeze({ id: 1000490, text: "ボケに正論で返されると困る" }),
  Object.freeze({ id: 1000491, text: "笑いの感性が違うだけだと思う" }),
  Object.freeze({
    id: 1000492,
    text: "私のネタで笑った人だけを次の飲み会に呼びます",
  }),
  Object.freeze({ id: 1000493, text: "あえて滑りにいったんだけどね" }),
  Object.freeze({ id: 1000494, text: "ネタをネタとして楽しめる余裕がほしい" }),
  Object.freeze({ id: 1000495, text: "正解を求める時点で間違ってる" }),
  Object.freeze({ id: 1000496, text: "何も知らないことを知っている人は強い" }),
  Object.freeze({ id: 1000497, text: "自分らしさを探してる時点で他人軸" }),
  Object.freeze({ id: 1000498, text: "答えがないことが答えなんだよね" }),
  Object.freeze({ id: 1000499, text: "言葉にした瞬間に本質から離れる" }),
  Object.freeze({ id: 1000500, text: "自由を求める人ほど自由に縛られてる" }),
  Object.freeze({
    id: 1000501,
    text: "理解されたいと思わなくなってから楽になった",
  }),
  Object.freeze({ id: 1000502, text: "自分を特別だと思わない人こそ特別" }),
  Object.freeze({
    id: 1000503,
    text: "常識を疑うことすら常識になってしまった",
  }),
  Object.freeze({ id: 1000504, text: "幸せを定義した瞬間に幸せは逃げる" }),
  Object.freeze({ id: 1000505, text: "何者かになりたい人は何者でもない" }),
  Object.freeze({ id: 1000506, text: "考えすぎないことを毎日考えてる" }),
  Object.freeze({ id: 1000507, text: "矛盾を受け入れられないのも一つの矛盾" }),
  Object.freeze({ id: 1000508, text: "孤独を楽しめる人が本当の意味で自由" }),
  Object.freeze({
    id: 1000509,
    text: "世界を変えるより自分の見方を変えればいい",
  }),
  Object.freeze({
    id: 1000510,
    text: "深い話なので反応が少ないほど成功だと思っています",
  }),
]);
export const PHRASE_MAP = new Map(PHRASES.map(({ id, text }) => [id, text]));
export const BUILTIN_IDS = Object.freeze(PHRASES.map(({ id }) => id));
export const LEGACY_IDS = Object.freeze(
  Array.from({ length: 256 }, (_, id) => id),
);
// These fixed 512 IDs deliberately do not depend on the current PHRASES.length.
const RELEASE_512_IDS = Object.freeze([
  ...LEGACY_IDS,
  ...Array.from({ length: 256 }, (_, i) => 1000255 + i),
]);
export const CATALOG_RELEASES = Object.freeze([
  Object.freeze({ from: "0000-01-01", ids: LEGACY_IDS }),
  Object.freeze({ from: CATALOG_CUTOVER, ids: RELEASE_512_IDS }),
]);
export const MAX_SUBMISSION_ID = 999999;
// Legacy submissions use 255 + the D1 primary key. Reserved built-ins begin above this range.
export function submissionPhraseId(id) {
  return Number.isSafeInteger(id) && id > 0 && id <= MAX_SUBMISSION_ID
    ? 255 + id
    : null;
}
export function validDay(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}
export function jstDay(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}
export function addDays(day, n) {
  if (!validDay(day) || !Number.isSafeInteger(n))
    throw new TypeError("Invalid date");
  const d = new Date(day + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekStart(day) {
  if (!validDay(day)) throw new TypeError("Invalid date");
  return addDays(
    day,
    -((new Date(day + "T00:00:00.000Z").getUTCDay() + 6) % 7),
  );
}
function releasedIds(day) {
  let ids = LEGACY_IDS;
  for (const release of CATALOG_RELEASES) {
    if (release.from > day) break;
    ids = release.ids;
  }
  return ids;
}
function seededIds(key, ids, mixed = false) {
  let seed = Array.from(key).reduce(
    (s, ch) => (Math.imul(s, 31) + ch.charCodeAt(0)) | 0,
    17,
  );
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    let j;
    if (mixed) {
      // Mulberry32 mixes all bits before selection; the legacy LCG's low bits are biased.
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      const random = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      j = Math.floor(random * (i + 1));
    } else {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      j = seed % (i + 1);
    }
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function dailyIds(day = jstDay()) {
  if (!validDay(day)) throw new TypeError("Invalid date");
  // Preserve the exact pre-cutover 256-entry seed/shuffle algorithm.
  return seededIds(day, releasedIds(day), day >= CATALOG_CUTOVER).slice(0, 8);
}
export function duelIds(day = jstDay()) {
  if (!validDay(day)) throw new TypeError("Invalid date");
  return seededIds("duel:" + day, releasedIds(day), true).slice(0, 2);
}
