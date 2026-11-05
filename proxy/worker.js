/* 實驗室 AI 代理伺服器（Cloudflare Worker）
 * 網頁送來「實驗室通行碼」，這裡換成真正的 API key 再轉給 OpenAI 或 Azure OpenAI。
 * 真正的 key 只存在 Cloudflare 的加密環境變數（Secret）裡，不會出現在網頁或 repo。
 *
 * 需要設定的環境變數（Settings → Variables and Secrets）：
 *   LAB_TOKEN        [Secret] 實驗室通行碼，發給成員在網頁上輸入
 *   OPENAI_API_KEY   [Secret] 實驗室的 OpenAI API key（使用 Azure 時改填 Azure 的 key）
 *   ALLOWED_ORIGINS  允許呼叫的網址，以逗號分隔，例如 https://adakuo616.github.io,http://localhost:8000
 *   ALLOWED_MODELS   允許的模型，以逗號分隔，例如 gpt-5-mini,gpt-4.1-mini（第一個是預設模型）
 * 選填：
 *   MAX_TOKENS       每次回覆的上限（例如 4000），避免單次花費過高
 *   OPENAI_BASE      OpenAI 相容服務的網址，預設 https://api.openai.com/v1
 *   AZURE_ENDPOINT   使用 Azure OpenAI 時填入，例如 https://xxx.openai.azure.com（此時模型名稱 = 部署名稱）
 *   AZURE_API_VERSION 預設 2024-10-21
 */
const json=(status,obj,cors)=>new Response(JSON.stringify(obj),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
async function same(a,b){ // 固定時間比較，避免從回應時間猜出通行碼
  const enc=new TextEncoder(), [x,y]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(a)),crypto.subtle.digest("SHA-256",enc.encode(b))]);
  const u=new Uint8Array(x), v=new Uint8Array(y); let d=0; for(let i=0;i<u.length;i++) d|=u[i]^v[i]; return d===0;
}
export default {
  async fetch(req, env) {
    const origin=req.headers.get("Origin")||"";
    const allowed=(env.ALLOWED_ORIGINS||"").split(",").map(s=>s.trim()).filter(Boolean);
    const okOrigin=allowed.includes(origin);
    const cors={"Access-Control-Allow-Origin":okOrigin?origin:(allowed[0]||""),"Access-Control-Allow-Headers":"Authorization, Content-Type",
      "Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400","Vary":"Origin"};
    if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
    const url=new URL(req.url);
    if(req.method==="GET"&&url.pathname==="/") return json(200,{ok:true,service:"lab-ai-proxy"},cors);
    if(req.method!=="POST"||!url.pathname.endsWith("/chat/completions")) return json(404,{error:{message:"只支援 POST /v1/chat/completions"}},cors);
    if(!okOrigin) return json(403,{error:{message:"這個網址沒有被允許使用實驗室 AI"}},cors);
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
    if(!env.LAB_TOKEN||!token||!(await same(token,env.LAB_TOKEN))) return json(401,{error:{message:"實驗室通行碼不正確"}},cors);
    if(Number(req.headers.get("Content-Length")||0)>300000) return json(413,{error:{message:"請求內容太大"}},cors);

    let body; try{ body=await req.json(); }catch(e){ return json(400,{error:{message:"請求格式錯誤"}},cors); }
    if(!Array.isArray(body.messages)) return json(400,{error:{message:"缺少 messages"}},cors);
    const models=(env.ALLOWED_MODELS||"gpt-5-mini").split(",").map(s=>s.trim()).filter(Boolean);
    const model=models.includes(body.model)?body.model:models[0];
    const out={model,messages:body.messages,stream:!!body.stream};
    if(env.MAX_TOKENS) out.max_completion_tokens=Number(env.MAX_TOKENS);

    let upstream, headers={"Content-Type":"application/json"};
    if(env.AZURE_ENDPOINT){
      upstream=`${env.AZURE_ENDPOINT.replace(/\/+$/,"")}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${env.AZURE_API_VERSION||"2024-10-21"}`;
      headers["api-key"]=env.OPENAI_API_KEY; delete out.model;
    }else{
      upstream=(env.OPENAI_BASE||"https://api.openai.com/v1").replace(/\/+$/,"")+"/chat/completions";
      headers["Authorization"]="Bearer "+env.OPENAI_API_KEY;
    }
    const r=await fetch(upstream,{method:"POST",headers,body:JSON.stringify(out)});
    return new Response(r.body,{status:r.status,headers:{...cors,"Content-Type":r.headers.get("Content-Type")||"application/json","Cache-Control":"no-store"}});
  }
};
