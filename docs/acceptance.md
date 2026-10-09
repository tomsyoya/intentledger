# ユーザーストーリーと受け入れ基準

会計担当者として、dApp の意図と実行結果を関連付けたい。なぜなら、チェーンをまたぐ取引の手動分類を減らしたいから。

```gherkin
Given Ethereum 出金と Solana 入金が個別の未分類取引として表示されている
When Mayan の UI 意図、対応するウォレット要求、両チェーンの確定取引を関連付ける
Then BRIDGE / SUCCESS / HIGH の意味レコードが生成される
And 2取引は「Automatically classified」の1件にまとめられる

Given デモが初期状態にある
When Play Automated Demo を押す
Then 約52秒で例外、意図、署名要求、実行、意味レコード、解決済み会計の順に表示される
And Pause、Next step、Restart が使える
And リロードせず繰り返し再生できる

Given Jupiter / Kamino / Raydium を選択している
When 意味レコードを表示する
Then 各操作の要求値と実行結果およびポジションが表示される

Given GitHub Pages のリポジトリ配下にサイトが配置されている
When ページを開いて各画面を移動し再読み込みする
Then 外部API、認証、サーバーなしで動作する
```
