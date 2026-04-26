# CLAUDE.md

## プロジェクト概要

iPhoneで投資関連ニュースを閲覧するためのWebアプリ。
NHK RSSをrss2json.com経由で取得し、キーワードフィルタリングして表示する。
ビルドステップなし・ホスティングコストなし（GitHub Pages）。

**公開URL:** https://yukiakatsuka.github.io/investment-news/news.html

## 開発サーバー

```bash
npx http-server . -p 8080 --cors
```

ブラウザで `http://127.0.0.1:8080/news.html` を開く。

## ファイル構成

- `news.html` — UI・スタイル（モバイルファースト・ダークテーマ・iPhone対応）
- `news.js` — RSSフェッチ・フィルタリング・レンダリング

## アーキテクチャ

```
ブラウザ → rss2json.com（CORSプロキシ兼JSON変換） → NHK RSS
```

- CORS問題を解決するためにrss2json.comを使用（直接fetchは不可）
- allorigins.winやcorsproxy.ioは本環境で不安定だったため不採用

## news.js の構造

| 定数 | 内容 |
|------|------|
| `RSS2JSON` | rss2json APIのベースURL |
| `FEEDS` | ニュースソース一覧（name / url / color / noFilter） |
| `INVESTMENT_KEYWORDS` | フィルタリング用キーワード（約55語） |

| 関数 | 内容 |
|------|------|
| `fetchFeed(feed)` | 1フィードを取得・24hフィルター・キーワードマッチ |
| `timeAgo(date)` | 相対時刻表示（〇分前・〇時間前） |
| `renderCard(item)` | ニュースカードのHTML生成 |
| `loadNews()` | 全フィード並列取得・重複排除・ソート・描画 |

## フィード設定

`noFilter: true` のフィード（NHK経済・NHKビジネス）は24h以内の全記事を表示。  
`noFilter: false` のフィード（NHK政治・NHK主要）はキーワードマッチした記事のみ表示。

## 日付処理の注意点

rss2json.comはNHKのJST時刻をタイムゾーン情報なしで返す（例: `"2026-04-25 12:03:56"`）。  
`new Date(pubDate.replace(' ', 'T'))` でパースし、ブラウザのローカルタイムとして扱う。  
末尾に `Z`（UTC）を付けると9時間ズレるため付けないこと。

## デプロイ

```bash
git add -A
git commit -m "変更内容"
git push origin main
# GitHub Pagesに自動反映（1〜2分）
```

## 既知の制約

- rss2json.com 無料枠: 1フィードあたり最大20件
- NHK RSS自体も最新20件のみ配信
- 週末・祝日はニュース件数が少ない
- rss2json.comが `www3.nhk.or.jp` をフェッチできない（`www.nhk.or.jp` を使うこと）
