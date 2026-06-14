# ErrorLog

此資料夾用於記錄使用者在使用 PresenceCV 時遇到的錯誤訊息，以便開發者除錯。

## 錯誤紀錄格式

每個錯誤紀錄檔案以日期為單位命名：`YYYY-MM-DD.md`

### 單筆錯誤紀錄格式

```markdown
### HH:MM — [錯誤摘要]

- **頁面/模組**：發生錯誤的頁面或元件名稱
- **錯誤類型**：Exception 類型（例如 TypeError, FirebaseError, NetworkError）
- **錯誤訊息**：完整的 error.message 內容
- **Stack Trace**（如有）：
  ```
  [堆疊追蹤]
  ```
- **重現步驟**：使用者操作步驟描述
- **影響範圍**：此錯誤影響的功能或資料
- **狀態**：🔴 未修復 / 🟡 調查中 / 🟢 已修復（附 commit hash）
```

## 需要捕捉的例外情境

以下是應該被記錄到 ErrorLog 的典型錯誤來源：

### Firebase / Firestore
- `FirebaseError`：認證失敗、權限不足、文件不存在、配額超限
- Firestore 讀寫失敗（`getDoc`, `setDoc`, `addDoc` 拋出的例外）
- Firebase Auth 狀態異常（`signInWithPopup` 失敗、session 過期）

### AI 匯入 (Gemini API)
- `/api/parse-resume` 回傳非 200 狀態碼
- Gemini API 回應格式不符預期（JSON parse 失敗）
- 檔案格式/大小驗證失敗
- 每日使用次數超過限制

### 前端 UI
- `contentEditable` 相關的 DOM 操作異常
- 拖放排序（@hello-pangea/dnd）的回呼錯誤
- react-easy-crop 裁切時的 Canvas 錯誤
- React rendering errors（未來加入 Error Boundary 後捕捉）

### 網路與環境
- 離線狀態下的 Firestore 操作失敗
- CORS 問題
- 環境變數缺失導致的初始化失敗（已由 `FirebaseSetupGuide` 部分覆蓋）

### 分享與匯出
- 分享連結建立失敗（Firestore addDoc 例外）
- Live link 即時同步中斷
- PDF 列印模式的跨視窗通訊（postMessage）失敗
- `window.print()` 觸發異常
