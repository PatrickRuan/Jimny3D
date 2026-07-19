// 「這個網站是怎麼做出來的」的開發紀錄內容，給開發全紀錄面板使用。
export interface StorySection {
  title: string;
  points: string[];
}

export const STORY_INTRO =
  '這個網站是在 Claude Code（Anthropic 的命令列 AI 開發助手）裡，透過一連串對話逐步做出來的。整個過程沒有寫過一行手工原型，全部是「講需求 → Claude 規劃/寫程式/測試 → 看結果調整」的來回。以下是完整經過：';

export const STORY_SECTIONS: StorySection[] = [
  {
    title: '1. 起點：先問可不可行',
    points: [
      '一開始只是問：「用 three.js 做 360° 觀看 Jimny、換原廠色、貼貼紙的網頁，可行嗎？會很花資源嗎？」',
      'Claude 沒有馬上動手，而是先查了 Sketchfab 上有沒有免費、CC-BY 授權的 Jimny 3D 模型，評估換色、貼紙曲面投影、免後端分享連結各自的難度，誠實列出「模型分件整理」會是最花工的部分。',
    ],
  },
  {
    title: '2. 用 Plan Mode 訂出 MVP 範圍',
    points: [
      '確認方向後，Claude 進入規劃模式，訪問使用者要做到什麼程度、技術棧偏好，最後定案：Vite + 純 three.js、8 種原廠色、預設貼紙擺放、截圖下載、免後端的分享連結（把配置編碼進網址）。',
      '「使用者自行繪圖貼紙」當時列為第二階段，先不做，讓 MVP 能盡快完整跑起來。',
    ],
  },
  {
    title: '3. 一次做完 MVP，先用方塊車測試',
    points: [
      '正式模型還沒到手前，Claude 自己寫了一台方塊玩具風的佔位 Jimny（車身、車頂分件），讓 360° 旋轉、換色、貼紙擺放、截圖、分享連結這些功能可以完整測試過一輪，而不是等模型才開始寫互動邏輯。',
      '這台「方塊車」後來沒有被丟掉——它變成了小尼可醬版玩具車模式的原型。',
    ],
  },
  {
    title: '4. 部署上線：GitHub Pages',
    points: [
      '整個網站是純前端靜態網頁，用 GitHub Actions 設定「push 到 main 就自動 build + 部署」，架在 GitHub Pages 上，不需要自己租主機。',
      '中間有個小插曲：建立 GitHub repository 屬於對外公開的動作，Claude 的自動化權限系統擋下了這一步，改由使用者自己執行 gh repo create，體現「有風險/對外的操作要讓人來按下確認鍵」的分寸。',
    ],
  },
  {
    title: '5. 換上真正的 Jimny 模型',
    points: [
      'Sketchfab 需要登入才能下載，使用者辦了帳號、下載了一個 45.7 萬三角形的《2023 Suzuki Jimny Sierra》CC-BY 模型（作者 tonielpro520）zip 檔給 Claude。',
      'Claude 用 gltf-transform 把 47.7MB 的模型 Draco 壓縮到 4.4MB，並分析模型的 mesh／材質結構，寫了一套「依三角形世界座標高度自動切分車身/車頂」的演算法——因為這個模型的車頂並沒有獨立分件，這樣才能讓黃黑、藍黑雙色車型正常運作。',
    ],
  },
  {
    title: '6. 客製色票與烤漆質感',
    points: [
      '使用者提供了完整的原廠色碼資料（含 metalness、roughness、clearcoat 等材質參數）和 2 款客製色，Claude 把整份色票資料結構整個換掉，並把材質升級成支援 clearcoat 的類型，讓珍珠黑、星翼藍這些顏色看起來有真的烤漆光澤，不只是換個色塊而已。',
    ],
  },
  {
    title: '7. 小尼可醬版、文字貼紙、貼紙換色',
    points: [
      '把原本用來測試的方塊車正式做成「🧸 小尼可醬 Jimny」切換鍵，一鍵在正式版跟玩具版之間切換。',
      '貼紙加了「打字」功能：可以選字型、選顏色，即時預覽後貼上車身；JIMNY 字樣、山形貼紙也加了換色。文字內容跟顏色全部編碼進貼紙 ID 本身，所以分享連結不需要資料庫也能完整還原每個人貼的東西。',
    ],
  },
  {
    title: '8. 過程中踩到、也修掉的坑',
    points: [
      'Draco 解碼器原本掛在外部 CDN（gstatic.com），在網路受限的環境下會整個載入失敗——後來把解碼器檔案打包進專案自己託管，不再依賴外部網路。',
      '把材質升級成支援 clearcoat 的類型時，用了 three.js 內建的 material.copy()，結果來源材質沒有 clearcoat 專屬欄位就直接噴錯——改成手動複製安全欄位解決，這類問題如果沒有實際在瀏覽器裡點開 console 逐步排查，很容易被忽略。',
    ],
  },
  {
    title: '9. 也請 Gemini 幫過忙',
    points: [
      '色票資料一開始是請 Gemini 整理的原廠色碼；後來使用者發現車頂雙色交界有鋸齒，也是先問了 Gemini，拿到「開抗鋸齒、調整 shadow bias、加 polygonOffset」的建議轉給 Claude。',
      '查證後發現：這三個渲染設定其實早就已經開著了（antialias、pixelRatio、shadow bias 在 viewer.ts 一開始就設定好），問題不在渲染層——真正原因是把三角形依高度硬分成車身/車頂兩組的自製演算法，切割線會沿著模型的三角化紋路走，本質上是幾何問題不是抗鋸齒問題。第一輪先改成 shader 版的高度切色（交界變乾淨但還是用猜的），後來把每個 mesh 對照實際車體零件（車頂殼其實是完全獨立的另一個零件），才真正做到顏色邊界對齊車體接縫。Gemini 的建議方向沒說中根因，但促成了「認真把模型結構搞清楚」這一步，算是間接幫上忙。',
    ],
  },
];

export const STORY_OUTRO =
  '這份紀錄本身，也是在同一個 Claude Code 對話裡，被要求「做出一個按鈕讓大家看看這網站怎麼做出來的」之後生出來的。';
