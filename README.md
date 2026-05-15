# ump_merge

## 概要

`ump_merge.ts`は複数のUMPファイルをロードし、各UMPファイルの`Media`パートのデータを抽出し`media_file`ファイルに追加していくことでデータを結合します。また、`MediaHeader`パートのヘッダ情報を表示します。

## 使い方

```
npm install
npx tsc
node ump_merge.js ump_file0 ump_file1 ...
```
