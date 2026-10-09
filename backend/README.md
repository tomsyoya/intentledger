# IntentLedger Go API

Go 標準ライブラリだけで実装した、読み取り専用 Solana JSON-RPC バックエンドです。追加モジュール、DB、認証、ウォレット、秘密鍵、API キーは不要です。既定の接続先は公開 devnet RPC `https://api.devnet.solana.com`、commitment は `confirmed` です。

## 起動

Go **1.23 以上**（可能ならサポート中の安定版）を使用してください。

```sh
cd backend
go run ./cmd/server
```

`http://127.0.0.1:8080` で起動します。別ターミナルでリポジトリルートから `npm run dev` を実行し、サイドバーの **Solana RPC** を開きます。API server URL の既定値は `http://localhost:8080` です。公開アドレスで **Lookup account**、署名で **Get transaction** を押すと Go API を照会します。

会計例の合成アドレス・署名は実取引ではありません。実在する devnet の公開アドレス／署名を入力してください。アカウントとして `11111111111111111111111111111111`（System Program）も照会できます。これはウォレットではなくプログラムアカウントで、SOL 残高は0でも正常です。

ビルドして起動する場合:

```sh
mkdir -p bin
go build -o bin/intentledger-api ./cmd/server
./bin/intentledger-api
```

### この作業環境の Go 設定

実装時の環境では `go` が 1.17.8、`GOROOT` はインストール済み 1.27.0 を指しており不一致でした。ホストの設定は変更せず、検証には `$GOROOT/bin/go`（1.27.0）を使用しています。同じ状態なら、次のコマンドで一致するバイナリを使えます。

```sh
"$GOROOT/bin/go" run ./cmd/server
"$GOROOT/bin/go" test -race ./...
```

通常の Go 環境では前述の `go run` / `go test` を使ってください。

## HTTP API

すべて `GET` です。`OPTIONS` は CORS 用に対応します。送信・署名・airdrop 用 API と任意メソッドのプロキシは実装していません。

| エンドポイント | 対応 RPC | 内容 |
| --- | --- | --- |
| `/api/v1/health` | RPC を呼ばない | Go API の稼働と設定クラスタを確認 |
| `/api/v1/solana/balance?address=<pubkey>` | `getBalance` | native SOL 残高 |
| `/api/v1/solana/signatures?address=<pubkey>&limit=10` | `getSignaturesForAddress` | アドレスを参照する最近の署名。limit は1〜100、既定10 |
| `/api/v1/solana/transactions/<signature>` | `getTransaction` | 実行状態、手数料、元の parsed JSON |

```sh
curl http://localhost:8080/api/v1/health
curl 'http://localhost:8080/api/v1/solana/balance?address=11111111111111111111111111111111'
curl 'http://localhost:8080/api/v1/solana/signatures?address=11111111111111111111111111111111&limit=1'
```

成功レスポンスの形:

```json
{
  "data": {
    "address": "11111111111111111111111111111111",
    "lamports": "0",
    "sol": "0",
    "slot": "123"
  },
  "cluster": "devnet",
  "commitment": "confirmed"
}
```

これは形式の例であり、実接続結果ではありません。`lamports`、`slot`、`feeLamports` は整数精度を維持するため文字列です。`sol` も整数演算から生成した文字列です。`rawJSON` は RPC result 全体の **JSON 文字列** で、JavaScript で再パースしない限り大きな整数も丸められません。

取引取得は `encoding: "jsonParsed"` と `maxSupportedTransactionVersion: 1` を指定します。legacy／v0／v1 を読み取り、v1 の `transactionConfig` も元の JSON に保持します。[Solana の公式移行情報](https://solana.com/upgrades/larger-transaction-sizes)

`status` は、meta.err が null なら `confirmed`、実行エラーがあれば `failed`、meta が null なら `unknown` です。これは **実行結果** であり、BRIDGE／SWAP などの意味分類ではありません。

エラーの形:

```json
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaction not found on this cluster at confirmed commitment. It may be pending or outside the node's retained history."
  }
}
```

| HTTP | code | 意味 |
| --- | --- | --- |
| 400 | INVALID_INPUT | base58 の文字・デコード後32／64バイト長、limit が不正 |
| 403 | ORIGIN_NOT_ALLOWED | 許可していないブラウザー origin |
| 404 | TRANSACTION_NOT_FOUND | 未確認、別クラスタ、または保持履歴外などで RPC result が null |
| 404 | NOT_FOUND | API ルートが存在しない |
| 405 | METHOD_NOT_ALLOWED | GET／OPTIONS 以外 |
| 502 | RPC_UNAVAILABLE / RPC_INVALID_RESPONSE | 上流障害または不正レスポンス |
| 503 | RPC_RATE_LIMITED | RPC が HTTP 429 を返した。Retry-After: 5 |
| 504 | RPC_TIMEOUT | RPC タイムアウト |

RPC リクエストには10秒の期限があり、レスポンスサイズは2 MiBまでです。JSON-RPC version／request ID、整数、必須フィールド、実行エラー形式、timestamp を検証します。プロバイダーの内部エラーメッセージは HTTP レスポンスへ転送しません。画面のリクエストにも12秒の期限があり、画面移動や入力変更時にはキャンセルし、古い結果の上書きを防ぎます。

## 設定

```sh
go run ./cmd/server \
  -listen 127.0.0.1:8080 \
  -rpc-url https://api.devnet.solana.com \
  -cluster devnet \
  -allowed-origins http://localhost:5173,http://127.0.0.1:5173
```

- `-listen`: 既定はローカルのみ。コンテナ等で外部受付が必要な場合は `:8080` 等を指定します。
- `-rpc-url`: 自前の devnet RPC やローカル validator の URL に変更できます。クラスタの実際の接続先とラベルを一致させてください。
- `-cluster`: `devnet` または `localnet`。本変更は mainnet を対象にしていません。
- `-allowed-origins`: 完全一致の origin をカンマ区切りで指定します。パスや末尾 `/` は含めません。`Origin` ヘッダーのない curl 等は利用できます。CORS は認証機能ではありません。

Localnet の例（validator 自体はこのリポジトリに含みません）:

```sh
go run ./cmd/server -cluster localnet -rpc-url http://127.0.0.1:8899
```

## GitHub Pages と組み合わせる

フロントエンドは従来どおり静的サイトとして公開できます。**Go API は GitHub Pages では実行できないため、別ホストへ配置します。**

1. Go API を HTTPS で到達できる環境へ配置します。TLS はホスティング側または reverse proxy で終端します。
2. Go の `-allowed-origins` に `https://<owner>.github.io` を追加します。リポジトリのサブパスは origin に含めません。
3. フロントエンドの **API server URL** に `https://<api-host>` を入力します。reverse proxy のプレフィックス（例: `https://<host>/intentledger`）にも対応しています。

設定は実行時の入力で、ビルド環境変数や秘密情報は不要です。未接続でも既存の4会計シナリオは利用できます。ページ表示だけで RPC 呼び出しは発生しません。**Check API** はバックエンドの稼働確認であり、Solana RPC の稼働確認ではありません。

本変更では API の公開デプロイ、認証、永続化、キャッシュ、ユーザーごとのクォータを実装していません。

## テスト

```sh
go test -race -cover ./...
go vet ./...
go build ./cmd/server
```

テストは HTTP transport の差し替えと `httptest.ResponseRecorder` を使用し、サーバーの待受・外部 RPC 接続なしで動きます。GitHub Actions の `backend.yml` でも実行します。

公開 devnet の読み取りを実際に試す任意の smoke test:

```sh
go test -run TestClient_live_devnet_reads -v ./internal/solana -args -live-rpc
```

通常のテストではこの smoke test をスキップします。公開 RPC のレート制限・ネットワーク・保持履歴に依存します。今回の実行環境では DNS 制限で失敗しており、ライブ接続の成功は未確認です。またサーバーの待受も環境で拒否されたため、HTTP listener を使った end-to-end 確認は未実施です。詳細は `../docs/verification.md` とログを参照してください。

## 構成

```mermaid
flowchart LR
  UI[React Solana RPC workspace] --> A[Go GET API]
  A --> C[Read-only JSON-RPC client]
  C --> S[Solana devnet / localnet RPC]
  S --> V[Validate / preserve exact values]
  V --> A
```

- `cmd/server/main.go`: フラグ、HTTP timeout、SIGINT／SIGTERM 時の終了処理。
- `internal/api/handler.go`: 固定ルート、CORS、API エラー。
- `internal/solana/client.go`: リクエスト、レスポンス検証、DTO。
- `internal/solana/live_test.go`: 任意の公開 devnet smoke test。

native SOL 残高とアカウント参照履歴を読む最初の接続層です。SPL Token／Token-2022 の全保有残高や ATA を含む完全履歴、DeFi instruction の解釈、実データと UI intent の相関、意味レコード API は今後の実装対象です。
