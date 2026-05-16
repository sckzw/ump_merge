# ump_merge

## 概要

`ump_merge.ts`は複数のUMPファイルの`Media`パートのデータを抽出・結合しファイルに保存します。また、ファイル名は`MediaHeader`パートの`videoId`を基に取得した曲名にリネームします。

## 使い方

```
npm install
npx tsc
node ump_merge.js ./cache/videoplayback_*
```
