# Jimny3D — 360° 賞車與貼紙客製

線上：**https://patrickruan.github.io/Jimny3D/**

純前端的 Suzuki Jimny 3 門（JB74）展示網頁：360° 環繞觀看、10 種原廠/客製色換色、
貼紙擺放（含可自訂文字與換色）、截圖下載、免後端分享連結，還有一鍵切換的小朋友玩具版。

技術棧：Vite + TypeScript + three.js，純靜態網頁，不需要任何後端或資料庫，
可部署到任何靜態主機（本專案用 GitHub Pages + GitHub Actions 自動部署）。

## 功能

- **360° 環繞觀看**：three.js `OrbitControls`，限制視角不會鑽到車底。
- **正式版 / 小朋友版切換**：左上角「🧸 小朋友 Jimny」一鍵切換成方塊玩具風模型，操作最簡單。
- **10 色換色**：8 款原廠色 + 2 款客製色，每色都有獨立的 metalness / roughness / clearcoat
  參數，重現不同烤漆的光澤質感（定義在 `src/colors.ts`）。
- **貼紙**：6 款預設貼紙、可打字自訂文字（選字型/顏色）、JIMNY 字樣與山形貼紙可換色，
  皆支援大小/旋轉調整。
- **截圖下載** 與 **分享連結**：所有配置（車色、貼紙內容/位置/顏色）編碼進網址 hash，
  不需要伺服器就能完整還原給任何打開連結的人。
- **訪客計數**：頁尾顯示本月與上月訪客數（免費第三方 API，見下方說明）。
- **開發全紀錄**：右上角按鈕，記錄這個網站是怎麼在 Claude Code 對話中一步步做出來的
  （內容見 `src/story.ts`）。

## 開發

```bash
npm install
npm run dev
```

## 替換 / 更新 3D 模型

目前使用的正式模型是 Sketchfab 上免費、CC-BY 授權的
[2023 Suzuki Jimny Sierra by tonielpro520](https://sketchfab.com/3d-models/2023-suzuki-jimny-sierra-8b7c4d136f6742e180faf654d874f14a)
（45.7 萬三角形，Draco 壓縮後 4.4MB），放在 `public/models/jimny.glb`。
若找不到這個檔案，會自動 fallback 成內建的方塊玩具模型（也就是小朋友版）。

要換成別的模型：

1. 到 Sketchfab 下載免費 CC-BY 授權的 JB74 模型，下載 glTF 格式。
2. 用 `npx @gltf-transform/cli optimize in.gltf jimny.glb --compress draco --texture-size 1024`
   壓縮（目標 < 8MB），放到 `public/models/jimny.glb`。
3. 重新整理頁面，開瀏覽器 console 看 `[Jimny3D] glTF mesh 結構` 表格，
   若車身/車頂沒被正確識別，調整 `src/model.ts` 裡的 `bodyRe` / `roofRe` / `excludeRe` 命名規則。
4. 若模型的車頂不是獨立 mesh（雙色車型需要車頂能單獨換色），
   `model.ts` 會自動依三角形世界座標高度切分車身/車頂，通常不需要額外處理；
   效果不理想時再進 Blender 手動切分。
5. 依 CC-BY 授權要求，把作者名字更新進 `src/main.ts` 的 `REAL_ATTRIBUTION`。

Draco 解碼器打包在 `public/draco/`（複製自 `node_modules/three/examples/jsm/libs/draco/gltf/`），
不依賴外部 CDN，避免在網路受限的環境下載入失敗。

## 訪客計數

用免費、免註冊的 [Abacus](https://jasoncameron.dev/abacus/) API（`src/visitor.ts`），
以「年-月」為 key 分別計數，所以能同時顯示本月與上月人數。同一個瀏覽器 session 只會計一次，
避免使用者重整頁面就一直往上加。想換掉服務或加上自己的後端，改 `src/visitor.ts` 即可。

## 部署

`.github/workflows/deploy.yml`：push 到 `main` 就自動 `npm run build` 並部署到 GitHub Pages。
`vite.config.ts` 的 `base` 需對應 repo 名稱（目前是 `/Jimny3D/`）。

## 授權注意

- 3D 模型：CC-BY-4.0，依授權要求標註作者（已附在頁面左下角）。
- Jimny 車型外觀與 SUZUKI 商標權利屬於 Suzuki Motor Corporation；
  本專案僅供個人非商業展示用途。

## 專案結構

```
Jimny3D/
  public/
    models/jimny.glb   正式 3D 模型（CC-BY，未 commit 進版本庫外的原始 zip 見 models-src/）
    draco/              Draco 解碼器（打包，不依賴外部 CDN）
    stickers/           預設貼紙 SVG
  src/
    main.ts       應用進入點，串接各模組
    viewer.ts     three.js 場景/相機/光源/OrbitControls
    model.ts      模型載入、材質處理、正式版/小朋友版
    colors.ts     原廠 + 客製色票資料
    decals.ts     貼紙擺放（DecalGeometry）與換色/文字貼紙的貼圖解析
    textSticker.ts  文字貼紙的編碼/解碼與 SVG 產生
    share.ts      分享連結的 base64 編碼/解碼
    story.ts      開發全紀錄的內容
    visitor.ts    訪客計數
    ui.ts         所有 DOM/UI 元件
```
