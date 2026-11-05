# 實驗室 AI 代理伺服器

讓學習網站的 AI 助教使用實驗室的 GPT（OpenAI 或 Azure OpenAI），而且**真正的 API key 只存在伺服器上**，網頁與 repo 都看不到。成員只需要在網頁的「AI 設定」輸入**實驗室通行碼**。

```
網頁（GitHub Pages）──實驗室通行碼──▶ Cloudflare Worker ──真正的 API key──▶ OpenAI / Azure OpenAI
```

Cloudflare Workers 免費方案每天 10 萬次請求，實驗室使用綽綽有餘。費用只來自 OpenAI 的用量。

## 部署步驟（用網頁操作，約 10 分鐘，不需要安裝任何東西）

1. 到 https://dash.cloudflare.com 註冊或登入。
2. 左側選 **Workers & Pages** → **Create** → **Create Worker**，名稱填 `lab-ai-proxy` → **Deploy**。
3. 按 **Edit code**，把編輯器裡的程式全部刪掉，貼上本資料夾的 `worker.js`，按 **Deploy**。
4. 回到這個 Worker 的頁面 → **Settings** → **Variables and Secrets** → **Add**，逐一新增：

   | 名稱 | 類型 | 值 |
   |---|---|---|
   | `LAB_TOKEN` | **Secret** | 實驗室通行碼（發給成員的那組） |
   | `OPENAI_API_KEY` | **Secret** | 實驗室的 OpenAI API key（`sk-...`）；用 Azure 則填 Azure 的 key |
   | `ALLOWED_ORIGINS` | Text | `https://adakuo616.github.io,http://localhost:8000` |
   | `ALLOWED_MODELS` | Text | `gpt-5-mini,gpt-4.1-mini`（第一個是預設；請改成實驗室帳號能用的模型） |
   | `MAX_TOKENS` | Text | `4000`（每次回覆上限，避免單次花費過高） |

   使用 **Azure OpenAI** 時再加：`AZURE_ENDPOINT`（例如 `https://xxx.openai.azure.com`），並把 `ALLOWED_MODELS` 改成 Azure 的**部署名稱**。

5. 記下 Worker 的網址，例如 `https://lab-ai-proxy.你的帳號.workers.dev`，在瀏覽器打開，看到 `{"ok":true,...}` 就代表成功。
6. 到學習網站按 **AI 設定**，填入通行碼與 `https://lab-ai-proxy.你的帳號.workers.dev/v1`，按 **測試連線**。
7. （建議）把網址填進 `ai.js` 最上面的 `LAB_PROXY_URL`，提交後成員就只需要輸入通行碼。

## 安全與費用控管

- **一定要在 OpenAI 後台設定每月用量上限**（platform.openai.com → Settings → Limits），這是防止帳單暴增最有效的方法。
- 通行碼外流時，到 Cloudflare 把 `LAB_TOKEN` 改成新的值即可立即失效，再把新通行碼發給成員。
- Worker 只接受 `ALLOWED_ORIGINS` 裡的網址、只轉送 `/v1/chat/completions`，不在 `ALLOWED_MODELS` 的模型會自動換成預設模型。
- 需要時可在 Cloudflare 的 **Security → WAF → Rate limiting rules** 限制每個 IP 的請求次數。
- 不要把 `OPENAI_API_KEY` 或 `LAB_TOKEN` 寫進 `wrangler.toml`、程式或任何提交到 GitHub 的檔案。

## 用指令部署（選用）

```bash
cd proxy
npx wrangler login
npx wrangler secret put LAB_TOKEN
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```
