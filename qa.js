/* 離線問答：從網站現有內容（常見問答、九篇論文筆記、白話版、程式導讀）搜尋答案，不使用 AI。
 * 中文以二字詞（bigram）切詞，英數以單字切詞，加上同義詞表，再用 BM25 排序。 */
(function(){
"use strict";
const $=(q,el=document)=>el.querySelector(q);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const strip=h=>String(h||"").replace(/<sub>(.*?)<\/sub>/g,"$1").replace(/<sup>(.*?)<\/sup>/g,"^$1").replace(/<[^>]+>/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();

/* 同義詞：出現任一寫法，就加上同一個代表詞 */
const SYN=[
 ["dmp",["d-mp","dmp","d‑mp","下邊界點","下邊界","lower boundary","最小容量點","mcpd","lbp"]],
 ["dmc",["d-mc","dmc","上邊界點","上邊界","upper boundary"]],
 ["minpath",["最小路徑","minimal path","minimal pathset"," mp ","mps"]],
 ["mincut",["最小割集","最小割","minimal cut","割集"," mc ","mcs"]],
 ["incexc",["排容","inclusion-exclusion","inclusion exclusion","包含排除"]],
 ["rsdp",["rsdp","遞迴不交積和","不交積和","disjoint product","sdp"]],
 ["ssd",["狀態空間分解","state-space decomposition","state space","ssd"]],
 ["reliab",["可靠度","reliability","可靠性","成功機率"]],
 ["qpp",["最快路徑","quickest path","qpp","傳送時間","傳輸時間"]],
 ["spare",["備援","spare routing","spare","主路徑","替代路徑"]],
 ["nodefail",["節點故障","node failure","不可靠節點","unreliable node","交換機"]],
 ["multicom",["多商品","multicommodity","multi-commodity","雙商品","two-commodity","商品"]],
 ["budget",["預算","budget","成本","cost"]],
 ["ga",["基因演算法","genetic algorithm"," ga ","染色體","交配","突變"]],
 ["project",["專案","project","pert","cpm","工期","activity"]],
 ["enum",["隱式枚舉","implicit enumeration","枚舉","列舉","窮舉","enumerat"]],
 ["acyclic",["無迴圈","acyclic","迴圈","cycle","繞圈"]],
 ["matlab",["matlab",".m ","程式","code","原始碼"]],
 ["series",["串並聯","series-parallel","series parallel"]],
 ["xue",["xue","xgms"]],
 ["password",["密碼","password","解鎖","下載"]]
];
const STOP=new Set(["什麼","為什","麼要","是什","怎麼","如何","可以","一個","這個","那個","的是","是不","嗎？","我們","你們","一下","請問","什麼是","有什","麼不","麼是","要怎","麼樣","哪裡","哪個","是否","有沒","沒有","論文","這篇","麼意","意思","什麼意","怎麼算","麼算","在哪","差在","哪裡"]);
function tokens(text){
  let t=" "+String(text).toLowerCase().replace(/[\uff01-\uff5e]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0))+" ";
  const out=[];
  SYN.forEach(([canon,vs])=>{ if(vs.some(v=>t.includes(v))) out.push("§"+canon); });
  (t.match(/[a-z0-9_]+/g)||[]).forEach(w=>{ if(w.length>1||/\d/.test(w)) out.push(w); });
  (t.match(/[\u3400-\u9fff]+/g)||[]).forEach(run=>{
    if(run.length===1){out.push(run);return;}
    for(let i=0;i<run.length-1;i++){const bg=run.slice(i,i+2); if(!STOP.has(bg)) out.push(bg);}
  });
  return out;
}

/* ---------- 建立索引 ---------- */
let DOCS=null, DF=null, AVG=0;
function build(){
  const docs=[];
  const add=(d)=>{d.tf={};d.len=0;
    const fields=[[d.title,3],[d.keys||"",2],[d.text,1]];
    fields.forEach(([f,w])=>tokens(f).forEach(tk=>{d.tf[tk]=(d.tf[tk]||0)+w;d.len+=w;}));
    docs.push(d);};
  (window.FAQ||[]).forEach((f,i)=>add({kind:"faq",i,title:f.q,keys:f.k,text:strip(f.a),html:f.a,src:f.src}));
  const SEC={why:"為什麼",concepts:"核心概念",model:"模型與假設",defs:"關鍵定義",thm:"定理與證明",algo:"演算法",ex:"數值範例",cx:"複雜度",edge:"邊界情況",ctx:"貢獻與影響",quiz:"自我檢測"};
  (window.STATIONS||[]).forEach(s=>{
    const P=(sec,title,text)=>add({kind:"pass",sid:s.id,title:`${s.short} · ${title}`,text:strip(text),href:`${s.id}#sec-${sec}`,secName:SEC[sec]||title});
    P("why","為什麼",s.why+" "+(s.tag||"")+" "+(s.title||""));
    const ex=(window.EXTRAS||{})[s.id];
    if(ex&&ex.plain) add({kind:"pass",sid:s.id,title:`${s.short} · 白話版`,text:strip(ex.plain),href:`${s.id}#plain`,secName:"白話版"});
    (s.concepts||[]).forEach(c=>P("concepts",strip(c[0]),c[1]));
    if(s.model) P("model","模型與假設",s.model.join(" "));
    (s.defs||[]).forEach(c=>P("defs",strip(c[0]),c[1]));
    (s.theorems||[]).forEach(t=>P("thm",strip(t.n),t.s+" 證明思路："+t.p));
    if(s.algo) P("algo","演算法步驟",s.algo.map((x,i)=>(i+1)+". "+x).join(" "));
    if(s.example) P("ex","數值範例",s.example);
    if(s.complexity) P("cx","複雜度",s.complexity);
    (s.edge||[]).forEach(x=>P("edge","邊界情況",x));
    if(s.contrib) P("ctx","貢獻與延伸",s.contrib+" "+s.future);
    (s.quiz||[]).forEach(q=>P("quiz","自我檢測",q.q+" 答案："+q.o[q.a]+"。"+q.e));
    if(ex&&ex.openKey) s.open.forEach((q,i)=>P("quiz","開放題參考要點",q+" "+(ex.openKey[i]||[]).join(" ")));
  });
  const CN=window.CODE_NOTES||{};
  Object.entries(CN).forEach(([f,n])=>add({kind:"pass",sid:"code",title:`程式 · ${f.replace("MATLAB/","")}`,text:strip([n.paper,n.what,n.io,...(n.walk||[]),...(n.pit||[])].join(" ")),href:"#code",file:f,secName:"程式教學"}));
  DF={}; docs.forEach(d=>Object.keys(d.tf).forEach(t=>DF[t]=(DF[t]||0)+1));
  AVG=docs.reduce((s,d)=>s+d.len,0)/docs.length; DOCS=docs;
}
function search(q,ctx){
  if(!DOCS) build();
  const qt=[...new Set(tokens(q))]; if(!qt.length) return [];
  const N=DOCS.length, k1=1.2, b=0.75, defQ=/是什麼|什麼是|定義|意思|what is/i.test(q);
  return DOCS.map(d=>{let sc=0;
    qt.forEach(t=>{const f=d.tf[t]; if(!f) return; const idf=Math.log(1+(N-DF[t]+.5)/(DF[t]+.5)); sc+=idf*f*(k1+1)/(f+k1*(1-b+b*d.len/AVG))*(t[0]==="§"?1.6:1);});
    if(sc&&ctx){ if(d.sid===ctx) sc*=1.25; if(d.kind==="faq"&&d.src.some(x=>x.split("#")[0]===ctx)) sc*=1.2; }
    if(sc&&defQ&&d.kind==="faq"&&/^什麼是|是什麼？$/.test(d.title)) sc*=1.4;
    return {d,sc};}).filter(r=>r.sc>0).sort((a,b)=>b.sc-a.sc);
}
function snippet(text,q,len=150){
  const qt=tokens(q).filter(t=>t[0]!=="§"); let pos=-1;
  for(const t of qt){const i=text.toLowerCase().indexOf(t); if(i>=0&&(pos<0||i<pos)) pos=i;}
  const start=Math.max(0,(pos<0?0:pos)-40); let s=text.slice(start,start+len);
  s=(start>0?"…":"")+esc(s)+(start+len<text.length?"…":"");
  qt.filter(t=>t.length>=2).sort((a,b)=>b.length-a.length).slice(0,12).forEach(t=>{s=s.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>`<mark>${m}</mark>`);});
  return s;
}

/* ---------- 導覽 ---------- */
const byId=()=>Object.fromEntries((window.STATIONS||[]).map(s=>[s.id,s]));
function srcLabel(src){const [h,sec]=src.split("#");
  if(!h) return {"#code":"程式教學","#practice":"練習題","#files":"下載區","#map":"學習網路圖"}["#"+sec]||sec;
  const s=byId()[h]; const SEC={"sec-why":"為什麼","sec-concepts":"核心概念","sec-model":"模型","sec-defs":"定義","sec-thm":"定理","sec-algo":"演算法","sec-ex":"範例","sec-cx":"複雜度","sec-edge":"邊界情況","sec-ctx":"脈絡","sec-quiz":"自我檢測",plain:"白話版"};
  return s?`${s.short} ${SEC[sec]||""}`.trim():src;}
function go(href,file){
  const [h,sec]=href.split("#"); close();
  if(!h){ if(file) window.__codeFile=file; if(location.hash==="#"+sec&&sec==="code"&&window.PRACTICE_VIEWS){window.PRACTICE_VIEWS.code();} else location.hash=sec; return; }
  window.__jumpTo=sec;
  if(location.hash==="#"+h){const el=document.getElementById(sec); el&&el.scrollIntoView({block:"start"}); window.__jumpTo=null;}
  else location.hash=h;
}

/* ---------- 抽屜 ---------- */
let ctx=null, mode="ask", quizState=null;
function setCtx(id){ctx=id; const s=id&&byId()[id]; $("#qaCtx").textContent="目前站點："+(s?`${s.short} ${s.label}`:"全部九篇")+"（會優先列出這一站的內容）"; renderSugg();}
function addMsg(cls,html){const d=document.createElement("div");d.className="msg "+cls;d.innerHTML=html;$("#msgs").appendChild(d);$("#msgs").scrollTop=1e9;return d;}
function renderSugg(){
  const box=$("#sugg"); if(mode!=="ask"){box.innerHTML="";return;}
  let list=(window.FAQ||[]).filter(f=>ctx&&f.src.some(x=>x.split("#")[0]===ctx));
  if(list.length<3) list=list.concat((window.FAQ||[]).filter(f=>!list.includes(f)).slice(0,4-list.length));
  box.innerHTML=list.slice(0,4).map(f=>`<button type="button">${esc(f.q)}</button>`).join("");
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{$("#qaInput").value=b.textContent;$("#qaForm").requestSubmit();});
}
function answer(q){
  const res=search(q,ctx);
  const faqs=res.filter(r=>r.d.kind==="faq"), pass=res.filter(r=>r.d.kind==="pass");
  if(!res.length){ return addMsg("a",`<p>找不到相關內容。可以換個說法，例如用專有名詞（d-MP、RSDP、排容原理、備援路由），或從下方的建議問題開始。</p>`); }
  const top=res[0].sc; let html="";
  const best=faqs.filter(r=>r.sc>=top*0.55).slice(0,2);
  best.forEach((r,i)=>{const f=r.d;
    html+=`<div class="qa-best"><div class="qa-q">${i===0?"最相關的回答":"也可能是"}：${esc(f.title)}</div><div>${f.html}</div><div class="qa-src">出處：${f.src.map(s=>`<a href="#" data-go="${esc(s)}">${esc(srcLabel(s))}</a>`).join("、")}</div></div>`;});
  const ps=pass.slice(0,best.length?3:5);
  if(ps.length) html+=`<div class="qa-sub">${best.length?"相關段落":"最相關的段落"}</div>`+ps.map(r=>`<a href="#" class="qa-pass" data-go="${esc(r.d.href)}" ${r.d.file?`data-file="${esc(r.d.file)}"`:""}><b>${esc(r.d.title)}</b><span>${snippet(r.d.text,q)}</span></a>`).join("");
  addMsg("a",html).querySelectorAll("[data-go]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();go(a.dataset.go,a.dataset.file);}));
}

/* 考考我：從題庫出題 */
function quizBank(){const out=[];(window.STATIONS||[]).forEach(s=>(s.quiz||[]).forEach(q=>out.push({s,q})));return out;}
function nextQuiz(){
  const all=quizBank(); const pool=quizState.scope==="ctx"&&ctx?all.filter(x=>x.s.id===ctx):all;
  const unseen=pool.filter(x=>!quizState.seen.has(x.q.q)); const src=unseen.length?unseen:pool;
  if(!unseen.length) quizState.seen.clear();
  const it=src[Math.floor(Math.random()*src.length)]; quizState.seen.add(it.q.q);
  const order=[...it.q.o.keys()].sort(()=>Math.random()-.5);
  const m=addMsg("a",`<div class="qa-q">${esc(it.s.short)} · 第 ${quizState.n+1} 題</div><p>${it.q.q}</p><div class="opts">${order.map((oi,p)=>`<button type="button" class="opt" data-oi="${oi}"><span class="k">${"ABCD"[p]}</span><span>${it.q.o[oi]}</span></button>`).join("")}</div><div class="fbslot"></div>`);
  let tried=false;
  m.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const ok=+b.dataset.oi===it.q.a;
    if(ok){m.querySelectorAll(".opt").forEach(x=>{x.disabled=true;if(+x.dataset.oi===it.q.a)x.classList.add("right");});
      if(!tried) quizState.ok++; quizState.n++;
      m.querySelector(".fbslot").innerHTML=`<div class="fb ok">${tried?"這次對了。":"答對了！"}${it.q.e}</div><div class="row" style="margin-top:8px"><button class="btn solid" type="button">下一題</button><span class="note">得分 ${quizState.ok} / ${quizState.n}（第一次就答對才計分）</span></div>`;
      m.querySelector(".fbslot button").onclick=nextQuiz;}
    else{tried=true;b.classList.add("wrong");b.disabled=true;
      m.querySelector(".fbslot").innerHTML=`<div class="fb no">還不對，先想想這個選項錯在哪裡，再選一次。</div>`;}
    $("#msgs").scrollTop=1e9;});
}
function startQuiz(){
  quizState={n:0,ok:0,seen:new Set(),scope:ctx?"ctx":"all"};
  $("#msgs").innerHTML="";
  const s=ctx&&byId()[ctx];
  addMsg("a",`<p>從題庫隨機出題，選項順序每次都會打亂，答完才會看到解說。</p><div class="row">${s?`<button class="btn ${quizState.scope==="ctx"?"solid":""}" type="button" data-scope="ctx">只考 ${esc(s.short)}</button>`:""}<button class="btn ${quizState.scope==="all"?"solid":""}" type="button" data-scope="all">全部站點（${quizBank().length} 題）</button></div>`)
    .querySelectorAll("[data-scope]").forEach(b=>b.onclick=()=>{quizState.scope=b.dataset.scope;startQuizWith();});
  nextQuiz();
}
function startQuizWith(){const sc=quizState.scope;quizState={n:0,ok:0,seen:new Set(),scope:sc};$("#msgs").innerHTML="";nextQuiz();}

function setMode(m){mode=m;document.querySelectorAll("[data-qmode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.qmode===m));
  $("#qaForm").hidden=m!=="ask"; $("#msgs").innerHTML="";
  if(m==="ask") welcome(); else startQuiz(); renderSugg();}
function welcome(){addMsg("a",`<p>輸入問題，我會從網站裡的<b>常見問答、九篇論文筆記、白話版與程式導讀</b>找出最相關的答案，並附上出處，點出處就能跳到原文段落。</p><p class="note">這是搜尋，不是 AI，不會自己產生新內容。找不到時，試著換成專有名詞（例如 d-MP、RSDP、備援路由）。</p>`);}
function open(id){ setCtx(id||null); $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden","false"); $("#scrim").hidden=false;
  if(!$("#msgs").children.length) (mode==="ask"?welcome():startQuiz());
  setTimeout(()=>{const i=$("#qaInput"); if(mode==="ask"&&i) i.focus();},50); }
function close(){ $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden","true"); $("#scrim").hidden=true; }

document.addEventListener("DOMContentLoaded",init); if(document.readyState!=="loading") init();
let inited=false;
function init(){ if(inited||!$("#qaForm")) return; inited=true;
  $("#qaClose").onclick=close; $("#scrim").onclick=close;
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  document.querySelectorAll("[data-qmode]").forEach(b=>b.onclick=()=>setMode(b.dataset.qmode));
  $("#qaForm").addEventListener("submit",e=>{e.preventDefault();const q=$("#qaInput").value.trim();if(!q)return;addMsg("u",esc(q));$("#qaInput").value="";answer(q);});
  $("#qaInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#qaForm").requestSubmit();}});
  $("#qaReset").onclick=()=>{$("#msgs").innerHTML="";welcome();};
}
window.QA={open,close,setCtx,search};
})();
