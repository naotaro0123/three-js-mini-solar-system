# Copilot Instructions

このリポジトリで GitHub Copilot が作業する際は、以下を前提にしてください。

## プロジェクト概要

Three.jsで構築された3D太陽系ビジュアライゼーション。NASAのJPL Horizons APIから取得した実際の天体暦データを使用して惑星を配置する。yarn workspacesによるモノレポ構成で、フロントエンドはVite+TypeScript、バックエンドはBun+Hono。

## コマンド

```bash
# 依存関係のインストール
yarn

# 開発（別々のターミナルで両方実行）
yarn dev:backend    # Bunバックエンド（ポート3000）
yarn dev:frontend   # Vite開発サーバー（ポート5173、ブラウザ自動起動）

# ビルド
yarn build:frontend  # tsc && vite build
yarn build:backend   # bun build

# テスト
yarn workspace frontend test  # vitest run
```

フロントエンドのテストフレームワークはVitest（`frontend/package.json`の`test`スクリプト）。

## アーキテクチャ

### モノレポ構成

- **`frontend/`** — Vite + Three.jsアプリ（TypeScript、フレームワークなし）
- **`backend/`** — Bun + Hono APIサーバー（単一ファイル: `backend/index.ts`）
- **`common.ts`** — 共有の型と定数（惑星コマンドコード、APIエンドポイント、リクエスト/レスポンス型）。両ワークスペースから `../../../common` 経由でインポート

### データフロー

1. フロントエンドが `VITE_API_HOST`（開発時: localhost:3000、本番: Render）経由でバックエンドを呼び出す
2. バックエンドがNASA JPL Horizons APIにリクエストをプロキシし、天体暦テキストを返す
3. フロントエンドが天体暦テキストを解析してAU単位のX/Y/Zベクトルを抽出し、Three.js座標に変換（Y↔Z入れ替え、90AU単位でスケーリング）
4. 位置データはIndexedDB（`frontend/src/functions/indexed-db.ts`）にキャッシュし、API呼び出しの重複を回避

### フロントエンドの主要ファイル

- **`DrawScene.ts`** — メインクラス: シーン・カメラ・コントロールのセットアップ、全惑星の読み込み、アニメーションループの実行。`main.ts`からインスタンス化されるエントリーポイント
- **`planet-common.ts`** — `createPlanet()`ファクトリ: メッシュ、軌道線、自転軸、リング、大気、衛星、ラベルを含む惑星Groupを構築。全惑星モジュールで使用
- **`settings.ts`** — 惑星サイズ/傾き（地球基準）、軌道色、外惑星のステップサイズ、ランタイムGUI設定（アニメーション速度、表示切り替え）
- **`get-planet-position.ts`** — JPLデータの取得と解析、IndexedDBキャッシュ管理、惑星ごとの公転/自転周期の定義
- **`environment.ts`** — シーンセットアップ: カメラ、OrbitControls、EffectComposer（ブルーム）、CSS2DRenderer（ラベル用）、lil-guiデバッグパネル
- **惑星個別モジュール**（`earth.ts`、`mars.ts`、`jupiter.ts`等） — 各惑星固有のテクスチャ、衛星を定義し、惑星グループを生成

## 主要な規約

- コメントは主に日本語
- 惑星位置はAPIデータのステップ間をパスポイント補間（`lerpFactor`）で滑らかにアニメーション
- 外惑星は軌道が数十年に及ぶため、大きなステップサイズを使用（例: 海王星は180日）
- 衛星メッシュは`PlanetMoon.mesh`プロパティに保持し、アニメーション更新に使用
- `planet-common.ts`の`Names`定数がシーン走査や表示切り替えに使う標準メッシュ名を定義
