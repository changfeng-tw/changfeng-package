# 長風新城・包裹管理系統

社區包裹收件管理系統，警衛端可登記包裹、住戶端可查詢自己的包裹。

## ⚠️ 重要限制

**這是「單裝置版本」**：
- 每台手機/電腦的資料是獨立的，**不會互相同步**
- 換瀏覽器、清快取、換裝置 → **資料會消失**
- 適合「單一警衛 + 固定一台裝置」的試用情境

如果要多人共用、跨裝置同步，需要加上後端伺服器（Firebase / Supabase 等）。

## 部署到 Vercel（最簡單，免費，3 分鐘）

### 步驟 1：把這個資料夾上傳到 GitHub

1. 註冊 GitHub 帳號（如果沒有）：https://github.com/signup
2. 建立新 repository：https://github.com/new
   - Repository name: `changfeng-package`
   - 設為 Public（免費方案需 Public）
   - 點 "Create repository"
3. 把這個資料夾的檔案上傳到那個 repo（GitHub 網頁介面有「Upload files」按鈕，最簡單）

### 步驟 2：用 Vercel 部署

1. 前往 https://vercel.com 用 GitHub 帳號登入
2. 點 "Add New..." → "Project"
3. 選擇剛剛上傳的 `changfeng-package` repository
4. 設定保持預設值，點 "Deploy"
5. 等 1～2 分鐘，會拿到一個網址，例如：
   `https://changfeng-package.vercel.app`

### 步驟 3：分享給住戶

把網址用以下方式給住戶：
- 用 https://www.qrcode-monkey.com 產生 QR Code，印出貼在管理室
- 在 LINE 群組公告網址
- 住戶用手機加入「主畫面」（書籤），就像 app 一樣方便

## 預設密碼

管理員（警衛）共用密碼：`changfeng2025`

⚠️ 此密碼是社區共用、所有警衛可在任何裝置登入使用。
若日後需要更改，需直接修改程式碼第 53 行的 `ADMIN_PASSWORD = "changfeng2025"`，並重新部署。

## 本機測試（如果要先在自己電腦試）

需先安裝 Node.js（https://nodejs.org），然後在這個資料夾執行：

```bash
npm install
npm run dev
```

打開瀏覽器到 http://localhost:5173 即可使用。

## 注意事項

- 資料只存在使用者瀏覽器的 localStorage 內
- 清除瀏覽器資料 = 全部包裹紀錄消失
- 換手機 = 資料不會跟過去
- 若要正式營運，請考慮升級為含後端的版本
