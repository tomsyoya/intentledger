# ユーザーストーリーと受け入れ基準

会計担当者として、dApp の意図と実行結果を関連付けたい。なぜなら、チェーンをまたぐ取引の手動分類を減らしたいから。

```gherkin
Given Ethereum 出金と Solana 入金が個別の未分類取引として表示されている
When Mayan の UI 意図、対応するウォレット要求、両チェーンの確定取引を関連付ける
Then BRIDGE / SUCCESS / HIGH の意味レコードが生成される
And 2取引は「Automatically classified」の1件にまとめられる

Given ダッシュボードを開いている
When 会計画面から意図、ウォレット要求、実行結果を手動で確認し意味レコードを生成する
Then 「Apply to accounting ledger」で分類済み会計に反映できる
And 自動再生のボタン、固定プレーヤー、画面を自動で進めるタイマーは存在しない
And 画面とシナリオを移動しても分類状態は保持される

Given Jupiter / Kamino / Raydium を選択している
When 意味レコードを表示する
Then 各操作の要求値と実行結果およびポジションが表示される

Given GitHub Pages のリポジトリ配下にサイトが配置されている
When ページを開いて各画面を移動し再読み込みする
Then 外部API、認証、サーバーなしで動作する
```

## Go / Solana RPC

バックエンド開発者として、Go API 経由で Solana の公開データを取得したい。なぜなら、後で実際の実行証拠を会計レコードへ関連付けたいから。

```gherkin
Given Go API が devnet RPC に接続するよう設定されている
When 残高、最近の署名、取引詳細を GET で要求する
Then 対応する読み取り専用 Solana JSON-RPC が呼ばれる
And lamports と slot を文字列で返し整数精度を保持する
And 不正入力、未検出、タイムアウト、RPC障害を識別して返す

Given Solana RPC 画面を開いている
When 公開アドレスまたは署名を入力し取得ボタンを押す
Then Go API の結果または明確なエラーを表示する
And fixture 会計レコードと自動で混在しない
And 画面を開くだけでは外部へ問い合わせない
```
