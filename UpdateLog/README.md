# UpdateLog

此資料夾存放 HumanMap.md 更新紀錄的歷史歸檔。

## 歸檔規則

當 `HumanMap.md` 的更新紀錄超過 **20 筆**時，Agent 應將較舊的紀錄移至此資料夾中的歸檔檔案。

### 命名格式
- `YYYY_QN.md`（例如 `2026_Q2.md`）

### 歸檔流程
1. 計算 HumanMap.md 中「專案本體更新紀錄」與「作業與規範更新紀錄」的總紀錄筆數
2. 若總筆數 > 20，將最舊的紀錄（保留最近 15 筆）剪下
3. 依據紀錄所屬季度寫入對應的歸檔檔案。**歸檔檔案（如 YYYY_QN.md）必須保持與 HumanMap.md 相同的分類結構，分區為「專案本體更新紀錄」與「作業與規範更新紀錄」兩大區塊**。
4. 在 HumanMap.md 的更新紀錄區塊頂部加入歸檔連結：`[查看更早的歷史紀錄](UpdateLog/YYYY_QN.md)`

### 歸檔文件範本

歸檔檔案內容應呈現如下：

```markdown
# 歷史更新紀錄 — YYYY_QN

## 專案本體更新紀錄 (Project Updates)

#### YYYY-MM-DD

- **HH:MM** - **[標題]**: [內容描述]


## 作業與規範更新紀錄 (Workflow & Rule Updates)

#### YYYY-MM-DD

- **HH:MM** - **[標題]**: [內容描述]
```
