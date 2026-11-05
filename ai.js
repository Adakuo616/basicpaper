/* AI 連線，優先順序：claude.ai 內建的 Claude → 實驗室 AI（代理伺服器＋通行碼）→ 個人的 OpenAI（或相容）API key。
 * 通行碼與個人 key 只存在使用者自己的瀏覽器（localStorage），不會寫進 repo。實驗室真正的 API key 只存在代理伺服器上。 */
/* 部署好代理伺服器後，把網址填在這裡，成員就只需要輸入通行碼（例如 https://lab-ai-proxy.xxx.workers.dev/v1） */
const LAB_PROXY_URL="";
(function(){
"use strict";
const KEY="sfn-ai-config";
const DEF={provider:"auto",key:"",model:"gpt-5-mini",base:"https://api.openai.com/v1",labUrl:LAB_PROXY_URL,labToken:""};
const MODELS=["gpt-5-mini","gpt-5","gpt-4.1-mini","gpt-4.1","gpt-4o-mini","gpt-4o"];
let cfg=Object.assign({},DEF);
try{const r=localStorage.getItem(KEY); if(r) cfg=Object.assign(cfg,JSON.parse(r));}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){}};
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let claudeP=null;
function claudeSample(){
  if(!claudeP) claudeP=(window.claude&&window.claude.use)?window.claude.use("sample").catch(()=>null):Promise.resolve(null);
  return claudeP;
}
const hasLab=()=>!!(cfg.labUrl&&cfg.labToken);
async function provider(){
  if(cfg.provider==="lab") return hasLab()?"lab":null;
  if(cfg.provider==="openai") return cfg.key?"openai":null;
  const s=await claudeSample(); if(s) return "claude";
  return hasLab()?"lab":cfg.key?"openai":null;
}
function toMessages(input){
  const msgs=typeof input==="string"?[{role:"user",content:input}]:input.map(m=>({role:m.role,content:m.content}));
  // 若開頭是「規則＋好的」的兩則訊息，改成 system 訊息，讓 GPT 更穩定地遵守規則
  if(msgs.length>=2&&msgs[0].role==="user"&&msgs[1].role==="assistant"&&/^好的/.test(msgs[1].content)) return [{role:"system",content:msgs[0].content},...msgs.slice(2)];
  return msgs;
}
async function openaiAsk(input,{onText,signal}={},base=cfg.base,key=cfg.key,isLab=false){
  let res;
  try{
    res=await fetch(base.replace(/\/+$/,"")+"/chat/completions",{method:"POST",signal,
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({model:cfg.model,messages:toMessages(input),stream:true})});
  }catch(e){ throw {code:e.name==="AbortError"?"cancelled":"network",message:String(e)}; }
  if(!res.ok){
    let msg=""; try{const j=await res.json(); msg=(j.error&&j.error.message)||"";}catch(e){}
    throw {code:res.status===401?(isLab?"lab_auth":"openai_auth"):res.status===403&&isLab?"lab_origin":res.status===429?"rate_limited":res.status===404?"openai_model":"openai_http",message:msg,status:res.status};
  }
  const reader=res.body.getReader(), dec=new TextDecoder(); let buf="", text="";
  try{
    for(;;){
      const {done,value}=await reader.read(); if(done) break;
      buf+=dec.decode(value,{stream:true});
      let i; while((i=buf.indexOf("\n"))>=0){
        const line=buf.slice(0,i).trim(); buf=buf.slice(i+1);
        if(!line.startsWith("data:")) continue;
        const data=line.slice(5).trim(); if(data==="[DONE]") continue;
        try{const j=JSON.parse(data); const d=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content;
          if(d){text+=d; onText&&onText({text,delta:d});}}catch(e){}
      }
    }
  }catch(e){ throw {code:e.name==="AbortError"?"cancelled":"network",text}; }
  return {text,truncated:false};
}
async function ask(input,opts={}){
  const p=await provider();
  if(p==="claude"){ const s=await claudeSample(); return s(input,{onText:opts.onText,signal:opts.signal,cache:false}); }
  if(p==="lab") return openaiAsk(input,opts,cfg.labUrl,cfg.labToken,true);
  if(p==="openai") return openaiAsk(input,opts);
  throw {code:"unavailable"};
}
function errText(e){
  const c=e&&e.code;
  return ({unavailable:"尚未設定 AI。請按右上角的「AI 設定」，輸入實驗室通行碼（或你自己的 OpenAI API key）。在 claude.ai 開啟則會自動使用 Claude。",
    lab_auth:"實驗室通行碼不正確，請到「AI 設定」重新輸入，或向管理者確認。",
    lab_origin:"這個網址沒有被允許使用實驗室 AI，請請管理者把網址加入代理伺服器的 ALLOWED_ORIGINS。",
    not_granted:"你沒有允許這個頁面使用 Claude。重新整理頁面可以再次選擇。",
    rate_limited:"請求太頻繁或額度不足，請稍後再試。",cancelled:"已停止。",
    openai_auth:"OpenAI API key 無效或已過期，請到「AI 設定」重新輸入。",
    openai_model:"找不到這個模型（"+cfg.model+"），請到「AI 設定」換成你的帳號可以使用的模型。",
    network:"連不上 AI 服務。若是在 claude.ai 儀表板上，它不允許連到 OpenAI，會改用 Claude；其他情況請檢查網路或 API 網址。"}[c])
    ||("AI 暫時無法回應（"+(c||"錯誤")+(e&&e.message?"："+e.message:"")+"）。");
}

/* 設定視窗 */
function openSettings(){
  const w=document.createElement("div"); w.className="vault-scrim";
  w.innerHTML=`<form class="vault-box" role="dialog" aria-modal="true" aria-labelledby="aiSetT" style="width:min(500px,100%);max-height:92vh;overflow:auto">
    <h2 id="aiSetT">AI 設定</h2>
    <p class="note">在 claude.ai 開啟時會自動使用 Claude。在 GitHub 網頁或本機，請輸入<b>實驗室通行碼</b>（向管理者索取），或改用你自己的 OpenAI API key。這些資料只存在這個瀏覽器，請不要在公用電腦上儲存。</p>
    <label class="note">使用的模型來源<select id="aiProv"><option value="auto">自動（Claude → 實驗室 AI → 個人 key）</option><option value="lab">一律使用實驗室 AI</option><option value="openai">一律使用個人 OpenAI key</option></select></label>
    <fieldset style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:8px"><legend class="note">實驗室 AI（代理伺服器）</legend>
      <label class="note">實驗室通行碼<input type="password" id="aiLabTok" autocomplete="off" value="${esc(cfg.labToken)}"></label>
      <label class="note">代理伺服器網址${LAB_PROXY_URL?"（已預設，通常不必修改）":""}<input id="aiLabUrl" placeholder="https://lab-ai-proxy.xxx.workers.dev/v1" value="${esc(cfg.labUrl||LAB_PROXY_URL)}"></label></fieldset>
    <details><summary class="note">改用個人的 OpenAI API key</summary><div style="display:grid;gap:8px;margin-top:8px">
      <label class="note">OpenAI API key<input type="password" id="aiKey" autocomplete="off" placeholder="sk-..." value="${esc(cfg.key)}"></label>
      <label class="note">API 網址（使用 Azure 或其他相容服務時才需要修改）<input id="aiBase" value="${esc(cfg.base)}"></label></div></details>
    <label class="note">模型名稱（實驗室 AI 只能用管理者允許的模型，其他會自動換成預設模型）<input id="aiModel" list="aiModels" value="${esc(cfg.model)}"><datalist id="aiModels">${MODELS.map(m=>`<option value="${m}">`).join("")}</datalist></label>
    <div class="note" id="aiSetMsg" aria-live="polite"></div>
    <div class="row" style="justify-content:space-between"><button type="button" class="btn" id="aiClear">清除已存資料</button>
      <span class="row"><button type="button" class="btn" id="aiTest">測試連線</button><button type="button" class="btn" id="aiCancel">關閉</button><button type="submit" class="btn solid">儲存</button></span></div></form>`;
  document.body.appendChild(w);
  const $=q=>w.querySelector(q), msg=$("#aiSetMsg");
  $("#aiProv").value=cfg.provider;
  const read=()=>({provider:$("#aiProv").value,labToken:$("#aiLabTok").value.trim(),labUrl:$("#aiLabUrl").value.trim()||LAB_PROXY_URL,
    key:$("#aiKey").value.trim(),base:$("#aiBase").value.trim()||DEF.base,model:$("#aiModel").value.trim()||DEF.model});
  const close=()=>w.remove();
  $("#aiCancel").onclick=close; w.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  $("#aiClear").onclick=()=>{cfg=Object.assign({},DEF);save();["#aiLabTok","#aiKey"].forEach(q=>$(q).value="");msg.textContent="已清除這個瀏覽器中儲存的通行碼與金鑰。";};
  $("#aiTest").onclick=async()=>{const old=cfg;cfg=Object.assign({},cfg,read());msg.textContent="測試中…";
    try{ const useLab=cfg.provider==="lab"||(cfg.provider==="auto"&&hasLab());
      if(useLab&&!hasLab()) throw {code:"unavailable"}; if(!useLab&&!cfg.key) throw {code:"unavailable"};
      const r=useLab?await openaiAsk("請只回覆四個字：連線成功",{},cfg.labUrl,cfg.labToken,true):await openaiAsk("請只回覆四個字：連線成功");
      msg.textContent=(useLab?"實驗室 AI":"OpenAI")+" 回覆："+r.text.slice(0,40); }
    catch(e){ msg.textContent=errText(e); } finally{ cfg=old; } };
  $("form").addEventListener("submit",e=>{e.preventDefault();cfg=read();save();msg.textContent="已儲存。";setTimeout(close,500);document.dispatchEvent(new CustomEvent("ai-config-changed"));});
  setTimeout(()=>$("#aiLabTok").focus(),30);
}
async function label(){const p=await provider();return p==="claude"?"Claude（claude.ai 內建）":p==="lab"?"實驗室 AI · "+cfg.model:p==="openai"?"OpenAI · "+cfg.model:"尚未設定";}

window.AI={ask,errText,openSettings,provider,label};
})();
