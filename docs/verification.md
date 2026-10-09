# 検証記録

実行日: 2026-10-09。Node.js 24.10.0 / npm 11.6.1。

## 合格した検査

- ドメインテスト **5件**: Mayan の両チェーン相関、要求値／受取値、証拠、誤った wallet request の拒否、失敗実行の扱い、4操作／7取引／4プロトコル／2チェーン、base58 形式。
- React DOM 操作テスト **5件**（jsdom）: ダッシュボード、手動入口、再生 UI／interval タイマーの不在、手動 Mayan フロー、JSON コピー／ダウンロード、Jupiter・Kamino・Raydium、画面移動後の分類状態と選択操作の保持。
- Pages アセット検証 **1件**: 本番 HTML の JS／CSS／favicon のすべてが `./` 相対パスであり、`https://example.github.io/intentledger/` 配下に解決される。参照ファイルの存在も確認。
- `npm run typecheck`: 合格。strict / noUnusedLocals / noUnusedParameters。
- `npm run build`: 合格。dist に静的 HTML・CSS・JS を生成。
- `npm run format:check`: 合格。

React DOM テストでは、実際のボタンをクリックし、画面遷移、会計行の統合、JSON の内容を検証しています。再生 UI と画面を自動で進めるタイマーがないことも確認しています。

## TDD の履歴

1. `5e7e5b4`: 要件・失敗テストを先にコミット。未実装モジュールのため失敗（`tdd-red.log`）。
2. 最小実装によりドメイン・操作テストが成功。
3. コンポーネント分割後も回帰テストが成功。
4. `0bede0f`: Solana signature の byte 長に失敗する追加テストを先にコミット（`tdd-fixture-red.log`）。
5. fixture を64バイトの合成 base58 signature に修正し、すべて成功（`tdd-green.log`）。

6. `b54e499`: 自動再生の不在と手動操作の入口を検証する失敗テストを先にコミット（`manual-only-red.log`）。
7. 再生専用コードを削除し、手動操作・分類状態の保持を確認（`manual-only-green.log`）。現在のテストは合計11件です。以前の再生機能の成功ログは履歴として保存しています。

合成 signature はローカルで固定文字列として保持し、秘密鍵生成・署名・トランザクション送信は行っていません。

## 実施できなかった確認

- 実ブラウザーのスクリーンショット、レスポンシブ表示の目視、実時間の録画。
- localhost の HTTP サーバーを使った実ブラウザーでのサブパス動作確認。
- GitHub Actions の実行と実際の Pages 公開。

この実行環境は `0.0.0.0` と `127.0.0.1` の待受を `EPERM` で拒否しました。また、自動承認レビューがローカル確認用 HTML の `file:` URL をブラウザーの URL ポリシーにより拒否しました。そのためブラウザー確認は行っておらず、DOM テストとパス検証で確認できる範囲を検証しました。視覚的な完成度や本番公開の成功を実ブラウザーで確認済みとは主張しません。

公開前に、通常環境で `npm run preview -- --base /intentledger/ --port 4173` を実行し、1280px 以上のデスクトップと390px程度のスマートフォン幅で表示を確認してください。手動で会計画面から分類まで進み、JSON export と全シナリオを確認することを推奨します。

公開する GitHub リポジトリは未指定です。workflow と README の公開手順を納品し、push／Pages 設定は実施していません。
