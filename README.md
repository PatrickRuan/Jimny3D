# Jimny3D — 360° 賞車與貼紙客製

純前端的 Suzuki Jimny 3 門（JB74）展示網頁：360° 環繞觀看、8 種台灣原廠色換色、
貼紙擺放（大小/旋轉/刪除）、截圖下載、免後端分享連結。

技術棧：Vite + TypeScript + three.js，可部署到任何靜態主機（GitHub Pages / Vercel）。

## 開發

```bash
npm install
npm run dev
```

## 替換為正式 3D 模型

目前使用內建的方塊風格佔位模型。要換成擬真模型：

1. 到 Sketchfab 下載免費 CC-BY 授權的 JB74 模型（需登入），候選：
   - [SUZUKI JIMNY by NEYCER](https://sketchfab.com/3d-models/suzuki-jimny-942987d14be64808ad8dce51ad527c7c)
   - [2023 Suzuki Jimny Sierra by tonielpro520](https://sketchfab.com/3d-models/2023-suzuki-jimny-sierra-8b7c4d136f6742e180faf654d874f14a)
2. 下載 glTF 格式，轉存為單一 `.glb`（可用 [gltf.report](https://gltf.report) 或
   `npx @gltf-transform/cli optimize in.gltf jimny.glb --compress draco`，順便壓縮到 8MB 以下）。
3. 放到 `public/models/jimny.glb`，重新整理頁面。
4. 開瀏覽器 console 看 `[Jimny3D] glTF mesh 結構` 表格，
   若車身/車頂沒被正確識別，調整 `src/model.ts` 裡的 `bodyRe` / `roofRe` / `excludeRe` 命名規則。
   雙色（黃黑、藍黑）需要模型的車頂是獨立 mesh；若不是，需在 Blender 中切分。
5. 依 CC-BY 授權要求，把作者名字補進頁面左下角的標註文字（`src/main.ts`）。

## 授權注意

- 模型：依各模型的 CC-BY 條款標註作者。
- Jimny 車型外觀與 SUZUKI 商標權利屬於 Suzuki Motor Corporation；
  本專案僅供個人非商業展示用途。

## 原廠色來源

車色清單依 2026/7 SUZUKI Taiwan 型錄：黃黑雙色、米黃、藍黑雙色、黑、灰、白、軍綠、米色
（色碼為近似值，定義在 `src/colors.ts`）。
