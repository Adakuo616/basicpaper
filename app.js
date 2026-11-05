(function(){
"use strict";
const S = window.STATIONS, byId = Object.fromEntries(S.map(s=>[s.id,s]));
const $ = (q,el=document)=>el.querySelector(q);
const esc = t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const strip = h=>String(h).replace(/<sub>/g,"_").replace(/<sup>/g,"^").replace(/<br\s*\/?>/g,"\n").replace(/<li>/g,"\n- ").replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+\n/g,"\n").trim();

/* ---------- 每位觀看者自己的進度（瀏覽器儲存，失敗時仍可運作） ---------- */
const KEY="sfn-learning-v1";
let st={mastered:{},quiz:{},free:false,cl:{},open:{}};
try{const r=localStorage.getItem(KEY); if(r) st=Object.assign(st,JSON.parse(r));}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}};

const isMastered=id=>!!st.mastered[id];
const isOpen=s=>st.free||!s.pre.length||s.pre.some(isMastered);
const stateOf=s=>isMastered(s.id)?"mastered":isOpen(s)?"available":"locked";
const stateText={mastered:"已掌握",available:"可以學習",locked:"尚未開放"};
const chipCls={mastered:"ms",available:"av",locked:"lk"};

function updateProgress(){
  const n=S.filter(s=>isMastered(s.id)).length;
  $("#progTxt").textContent=n+" / "+S.length;
  $("#progBar").style.width=(100*n/S.length)+"%";
}

/* ---------- 學習網路圖 ---------- */
const POS={basics:[60,270],p2:[230,140],p1:[230,400],p3:[450,70],p4:[450,200],p6:[450,330],p7:[450,460],p5:[690,135],p9:[700,365],p8:[690,460],frontier:[920,270]};
function drawMap(){
  const svg=$("#netmap"); const R=27; let h="";
  const arcs=[];
  S.forEach(s=>s.pre.forEach(p=>arcs.push([p,s.id])));
  const path=(a,b)=>{const [x1,y1]=POS[a],[x2,y2]=POS[b];const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy);
    const sx=x1+dx/L*R,sy=y1+dy/L*R,ex=x2-dx/L*(R+6),ey=y2-dy/L*(R+6);
    if(a==="p2"&&b==="p5") return `M${sx} ${sy} Q 450 136 ${ex} ${ey}`;
    return `M${sx} ${sy} L${ex} ${ey}`;};
  h+=`<defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="ahf" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--flow)"/></marker></defs>`;
  arcs.forEach(([a,b])=>{const open=isMastered(a);h+=`<path class="arc${open?" open":""}" d="${path(a,b)}" marker-end="url(#${open?"ahf":"ah"})"/>`;});
  h+=`<path class="arc dual" d="M230 ${140+R+4} L230 ${400-R-4}"/><text x="244" y="275" font-size="12" fill="var(--muted)" font-family="var(--f-body)">MP ↔ MC 對偶</text>`;
  S.forEach(s=>{const [x,y]=POS[s.id],k=stateOf(s);
    const lab=s.kind==="hub"?s.label:s.label;
    h+=`<g class="node ${k}" tabindex="0" role="link" data-id="${s.id}" aria-label="${esc(s.short+" "+lab+"，"+stateText[k])}">
      <circle cx="${x}" cy="${y}" r="${R}"/><text class="k" x="${x}" y="${y}">${s.short}</text>
      <text class="lab" x="${x}" y="${y+R+17}">${esc(lab)}</text></g>`;});
  svg.innerHTML=h;
  svg.querySelectorAll(".node").forEach(g=>{
    const go=()=>{location.hash=g.dataset.id;};
    g.addEventListener("click",go); g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
  });
  $("#stList").innerHTML=S.map(s=>{const k=stateOf(s);
    return `<a class="st" href="#${s.id}"><span class="meta">${s.short}${s.year?" · "+s.year:""} <span class="chip ${chipCls[k]}">${stateText[k]}</span></span><b>${esc(s.kind==="hub"?s.title:s.title)}</b><small>${s.tag||strip(s.why).slice(0,70)+"…"}</small></a>`;}).join("");
  $("#freeMode").checked=!!st.free;
}
$("#freeMode").addEventListener("change",e=>{st.free=e.target.checked;save();drawMap();});

/* ---------- 原文（內部使用：PDF 與出版社連結） ---------- */
const scholar=t=>"https://scholar.google.com/scholar?q="+encodeURIComponent('"'+t+'"');
const doi=d=>"https://doi.org/"+d;
const ORIG={
  p1:{pdf:"pdf/P1_1995_Lin_Jane_Yuan_Networks.pdf",ppt:"pdf/P1_1995_slides.pdf",link:scholar(byId.p1.title),lt:"Google Scholar 搜尋"},
  p2:{pdf:"pdf/P2_1993_Jane_Lin_Yuan_IEEE_TR.pdf",link:scholar(byId.p2.title),lt:"Google Scholar 搜尋"},
  p3:{pdf:"pdf/P3_2001_Lin_COR_node_failure.pdf",link:doi("10.1016/S0305-0548(00)00039-3"),lt:"DOI 10.1016/S0305-0548(00)00039-3"},
  p4:{pdf:"pdf/P4_2001_Lin_CAMWA_multicommodity.pdf",link:doi("10.1016/S0898-1221(01)00149-3"),lt:"DOI 10.1016/S0898-1221(01)00149-3"},
  p5:{pdf:"pdf/P5_2007_Lin_COR_two_commodity.pdf",link:doi("10.1016/j.cor.2005.11.013"),lt:"DOI 10.1016/j.cor.2005.11.013"},
  p6:{pdf:"pdf/P6_2002_Lin_JORSJ_project.pdf",link:scholar(byId.p6.title),lt:"Google Scholar 搜尋"},
  p7:{pdf:"pdf/P7_2003_Lin_COR_quickest_path.pdf",link:doi("10.1016/S0305-0548(02)00025-4"),lt:"DOI 10.1016/S0305-0548(02)00025-4"},
  p8:{pdf:"pdf/P8_2010_Lin_IEEE_TR_spare_routing.pdf",link:doi("10.1109/TR.2010.2040765"),lt:"DOI 10.1109/TR.2010.2040765"},
  p9:{pdf:"pdf/P9_2011_Lin_Yeh_ASOC_GA.pdf",link:doi("10.1016/j.asoc.2010.11.002"),lt:"DOI 10.1016/j.asoc.2010.11.002"}
};
function origRow(s){const o=ORIG[s.id];
  return `<div class="orig"><span class="lbl">原文</span><button class="btn" type="button" data-dl="${o.pdf}">下載 PDF</button>${o.ppt?`<button class="btn" type="button" data-dl="${o.ppt}">下載簡報（PDF）</button>`:""}<a class="btn" href="${o.link}" target="_blank" rel="noopener">${esc(o.lt)} ↗</a><span class="note dlmsg"></span></div>`;}
let dlPromise=null;
async function downloadOrig(btn){
  const path=btn.dataset.dl, msg=btn.parentElement.querySelector(".dlmsg"), name=path.split("/").pop();
  btn.disabled=true; msg.textContent="準備檔案中…";
  try{
    if(!dlPromise) dlPromise=(window.claude&&window.claude.use)?window.claude.use("downloads").catch(()=>null):Promise.resolve(null);
    const dl=await dlPromise;
    const blob=await window.VAULT.fetchBlob(path);
    if(!dl){ const u=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); msg.textContent=""; return; }
    await dl.save({filename:name,data:blob}); msg.textContent="已送出下載："+name;
  }catch(e){
    msg.textContent=["cancelled","missing","corrupt","no_vault","wrong"].includes(e.code)?window.VAULT.errText(e):e.code==="declined"?"已取消下載。":e.code==="rate_limited"?"已有下載視窗開著，請稍後再試。":"目前無法下載（"+(e.code||"錯誤")+"），請改用出版社連結。";
  }finally{ btn.disabled=false; }
}

/* ---------- 站點頁 ---------- */
const LEVELS=[["eli5","ELI5（像對五歲小孩）"],["eli14","ELI14（像對國中生）"],["intern","實習生版"],["deep","研究生深挖"]];
function shuffleIdx(n){const a=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function renderStation(id){
  const s=byId[id]; const v=$("#v-station"); const idx=S.indexOf(s);
  const k=stateOf(s);
  const secs=[];
  secs.push(["why","為什麼",`<h2><span class="q">WHY</span>問題為何存在</h2>${s.why}`]);
  if(s.concepts) secs.push(["concepts","核心概念",`<h2><span class="q">WHAT</span>核心概念</h2><div class="defs">${s.concepts.map(c=>`<div class="def"><b>${c[0]}</b>${c[1]}</div>`).join("")}</div>`]);
  if(s.model) secs.push(["model","模型與假設",`<h2><span class="q">MODEL</span>模型與假設</h2><ul>${s.model.map(x=>`<li>${x}</li>`).join("")}</ul>`]);
  if(s.defs) secs.push(["defs","關鍵定義",`<h2><span class="q">DEF</span>關鍵定義</h2><div class="defs">${s.defs.map(c=>`<div class="def"><b>${c[0]}</b>${c[1]}</div>`).join("")}</div>`]);
  if(s.theorems) secs.push(["thm","定理與證明",`<h2><span class="q">WHY IT WORKS</span>定理與證明思路</h2>${s.theorems.map(t=>`<div class="thm"><div class="n">${t.n}</div><div>${t.s}</div><details class="proof"><summary>先自己想想看，再展開證明思路</summary><div>${t.p}</div></details></div>`).join("")}`]);
  if(s.algo) secs.push(["algo","演算法",`<h2><span class="q">HOW</span>演算法步驟</h2><ol class="algo">${s.algo.map(x=>`<li><span>${x}</span></li>`).join("")}</ol>${["p1","p2","p7"].includes(s.id)?`<p class="note">到 <a href="#lab">演算法實驗室</a> 逐步執行這個演算法，重現論文的數值。</p>`:""}`]);
  if(s.example) secs.push(["ex","數值範例",`<h2><span class="q">EXAMPLE</span>數值範例</h2>${s.example}`]);
  if(s.complexity) secs.push(["cx","複雜度",`<h2><span class="q">COST</span>複雜度</h2><p>${s.complexity}</p>`]);
  if(s.edge) secs.push(["edge","邊界情況",`<h2><span class="q">EDGE CASES</span>邊界情況與限制</h2><ul class="edge">${s.edge.map(x=>`<li>${x}</li>`).join("")}</ul>`]);
  if(s.contrib) secs.push(["ctx","貢獻與影響",`<h2><span class="q">CONTEXT</span>貢獻與更廣的脈絡</h2><p><b>貢獻：</b>${s.contrib}</p><p><b>後續延伸：</b>${s.future}</p>`]);
  secs.push(["quiz","自我檢測",`<h2><span class="q">CHECK</span>自我檢測</h2><p class="note">選項順序每次重新洗牌；答錯時不會直接公布答案，你可以再想一次，或按「看解答」。全部答對後才能標記為已掌握。</p><div class="quiz" id="quiz"></div>
    <h3 style="font-size:16px;margin:18px 0 6px">用你自己的話說明</h3>${s.open.map((q,i)=>`<div class="qitem"><div class="qq">${q}</div><textarea id="open-${s.id}-${i}" data-i="${i}" placeholder="先寫下你的理解，不必完美，AI 助教會幫你找出缺漏。">${esc(st.open[s.id+"-"+i]||"")}</textarea><div class="row" style="margin-top:8px"><button class="btn solid" type="button" data-review="${i}">請 AI 助教批改</button></div><div class="ai-slot" id="rv-${i}"></div></div>`).join("")}
    <div class="master" id="masterBox" style="margin-top:16px"></div>`]);

  const prev=S[idx-1], next=S[idx+1];
  v.innerHTML=`<div class="station-head"><div>
      <div class="crumb"><a href="#map">學習網路圖</a> › ${s.short} <span class="chip ${chipCls[k]}">${stateText[k]}</span></div>
      <h1>${s.kind==="hub"?esc(s.title):esc(s.title)}</h1>
      ${s.venue?`<div class="cite">論文 ${s.no} · ${esc(s.authors)} · <i>${esc(s.venue)}</i> (${s.year})</div>`:""}
      ${ORIG[s.id]?origRow(s):""}
      ${s.tag?`<div class="tag">${s.tag}</div>`:""}
    </div><button class="btn" type="button" id="askHere">就這一站問 AI</button></div>
    ${k==="locked"?`<div class="sec" style="border-color:var(--flow)"><b>這一站尚未開放。</b>建議先掌握：${s.pre.map(p=>`<a href="#${p}">${byId[p].short} ${esc(byId[p].label)}</a>`).join("、")}。也可以在學習網路圖上開啟「自由探索模式」。</div>`:""}
    <div class="explain"><span class="lbl">換個方式解釋這一站：</span>${LEVELS.map(l=>`<button class="pill" type="button" data-level="${l[0]}">${l[1]}</button>`).join("")}</div>
    <div id="explainOut"></div>
    <div class="layout"><nav class="toc" aria-label="本站目錄">${secs.map(x=>`<a href="#${s.id}" data-jump="sec-${x[0]}">${x[1]}</a>`).join("")}</nav>
    <div>${secs.map(x=>`<section class="sec" id="sec-${x[0]}">${x[2]}</section>`).join("")}
    <div class="pager">${prev?`<a class="btn" href="#${prev.id}">← ${prev.short} ${esc(prev.label)}</a>`:"<span></span>"}${next?`<a class="btn" href="#${next.id}">${next.short} ${esc(next.label)} →</a>`:""}</div></div></div>`;

  v.querySelectorAll("[data-dl]").forEach(b=>b.addEventListener("click",()=>downloadOrig(b)));
  v.querySelectorAll("[data-jump]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();document.getElementById(a.dataset.jump).scrollIntoView();}));
  renderQuiz(s);
  v.querySelectorAll("[data-level]").forEach(b=>b.addEventListener("click",()=>explain(s,b.dataset.level,b.textContent)));
  v.querySelectorAll("textarea[id^=open-]").forEach(t=>t.addEventListener("input",()=>{st.open[s.id+"-"+t.dataset.i]=t.value;save();}));
  v.querySelectorAll("[data-review]").forEach(b=>b.addEventListener("click",()=>reviewOpen(s,+b.dataset.review)));
  $("#askHere").addEventListener("click",()=>{ctxId=s.id;openDrawer();});
  ctxId=s.id; updateCtx();
}

function renderQuiz(s){
  const box=$("#quiz"); const rec=st.quiz[s.id]||(st.quiz[s.id]={});
  box.innerHTML="";
  s.quiz.forEach((q,qi)=>{
    const order=shuffleIdx(q.o.length); const done=rec[qi]===true;
    const el=document.createElement("div"); el.className="qitem";
    el.innerHTML=`<div class="qq">${qi+1}. ${q.q}</div><div class="opts">${order.map((oi,pos)=>`<button type="button" class="opt" data-oi="${oi}"><span class="k">${"ABCD"[pos]}</span><span>${q.o[oi]}</span></button>`).join("")}</div><div class="fbslot"></div>`;
    const fb=el.querySelector(".fbslot");
    const reveal=(ok)=>{el.querySelectorAll(".opt").forEach(b=>{b.disabled=true;if(+b.dataset.oi===q.a)b.classList.add("right");});
      fb.innerHTML=`<div class="fb ${ok?"ok":"no"}">${ok?"答對了。":"正確答案已標示。"}${q.e}</div>`;};
    if(done){reveal(true);}
    el.querySelectorAll(".opt").forEach(b=>b.addEventListener("click",()=>{
      const oi=+b.dataset.oi;
      if(oi===q.a){b.classList.add("right");rec[qi]=true;save();reveal(true);checkMaster(s);}
      else{b.classList.add("wrong");b.disabled=true;rec[qi]=rec[qi]==="tried"?"tried":"tried";save();
        fb.innerHTML=`<div class="fb no">還不對。先想想這個選項錯在哪裡，再試一次。<button class="btn" type="button" style="margin-left:8px">看解答</button></div>`;
        fb.querySelector("button").addEventListener("click",()=>{rec[qi]="revealed";save();reveal(false);checkMaster(s);});}
    }));
    box.appendChild(el);
  });
  checkMaster(s);
}
function checkMaster(s){
  const rec=st.quiz[s.id]||{}; const allOk=s.quiz.every((_,i)=>rec[i]===true);
  const box=$("#masterBox"); if(!box) return;
  if(isMastered(s.id)){box.innerHTML=`<b>✓ 已掌握這一站。</b><span class="note">後續站點的弧已經通電。</span><button class="btn" type="button" id="unm">取消標記</button>`;
    $("#unm").onclick=()=>{delete st.mastered[s.id];save();renderStation(s.id);updateProgress();};return;}
  box.innerHTML=allOk?`<b>全部答對。</b><span class="note">建議也完成上面的開放題，再標記掌握。</span><button class="btn okb" type="button" id="mk">標記為已掌握</button>`
    :`<span class="note">答對全部 ${s.quiz.length} 題（不看解答）後，就能標記為已掌握。看過解答的題目，可以重新整理頁面再挑戰一次。</span>`;
  if(allOk) $("#mk").onclick=()=>{st.mastered[s.id]=true;save();updateProgress();renderStation(s.id);};
}

/* ---------- AI（sample 能力） ---------- */
let samplePromise=null;
function getSample(){ if(!samplePromise){ samplePromise = (window.claude&&window.claude.use)? window.claude.use("sample").catch(()=>null) : Promise.resolve(null);} return samplePromise; }
const errCopy=c=>({not_granted:"你沒有允許這個頁面使用 Claude，所以 AI 功能已關閉。重新整理頁面可以再次選擇。",rate_limited:"請求太頻繁，請稍等一下再試。",cancelled:"已停止。"}[c]||"AI 暫時無法回應（"+c+"），請稍後再試。");
const NO_AI="這個環境無法使用 AI 助教。請在 claude.ai 開啟此頁面才能使用；其他功能都可以照常使用。";

function kbFor(id){
  const one=s=>{let t=`### ${s.short} ${s.title}${s.venue?` (${s.authors}, ${s.venue}, ${s.year})`:""}\n`;
    if(s.tag) t+="主旨："+strip(s.tag)+"\n"; t+="動機："+strip(s.why)+"\n";
    (s.concepts||[]).forEach(c=>t+="- "+strip(c[0])+"："+strip(c[1])+"\n");
    (s.model||[]).forEach(c=>t+="- 模型："+strip(c)+"\n");
    (s.defs||[]).forEach(c=>t+="- 定義 "+strip(c[0])+"："+strip(c[1])+"\n");
    (s.theorems||[]).forEach(c=>t+="- "+strip(c.n)+"："+strip(c.s)+"（證明思路："+strip(c.p)+"）\n");
    (s.algo||[]).forEach((c,i)=>t+=`- 步驟${i+1}：`+strip(c)+"\n");
    if(s.example) t+="範例："+strip(s.example)+"\n";
    if(s.complexity) t+="複雜度："+strip(s.complexity)+"\n";
    (s.edge||[]).forEach(c=>t+="- 邊界情況："+strip(c)+"\n");
    if(s.contrib) t+="貢獻："+strip(s.contrib)+"；延伸："+strip(s.future)+"\n";
    return t;};
  const focus=id&&byId[id];
  const others=S.filter(s=>!focus||s.id!==focus.id).map(s=>`${s.short}：${s.title}${s.tag?"，"+strip(s.tag):""}`).join("\n");
  return (focus? "【目前站點的完整筆記】\n"+one(focus)+"\n【其他站點摘要】\n"+others : S.map(one).join("\n"));
}
const BASE=`你是一位教學成效極高、思考深入的研究所導師，指導碩博士生研讀「隨機（多狀態）流量網路可靠度」領域的九篇基礎論文（Jane/Lin/Yuan 1993、Lin/Jane/Yuan 1995，以及 Yi-Kuei Lin 2001–2011 的延伸研究）。
規則：
1. 一律使用繁體中文（台灣用語）。數學用 Unicode 符號表示（例如 Σ、≤、⌈ ⌉、x_i、X^1），不要用 LaTeX。
2. 以下方提供的筆記為主要依據；超出筆記的內容要明說「這是一般背景知識，不在論文中」，不知道就說不知道，不可捏造數值或引用。
3. 重視「為什麼」：說明動機、設計決策的理由，以及邊界情況，並在適當時往更深一層追問。
4. 格式：短段落，可用 - 項目符號與 **粗體**，不要用表格或標題符號 #。回答控制在 350 字以內，除非使用者要求更詳細。`;

async function runSample(input,{onText,signal}={}){
  const sample=await getSample(); if(!sample) throw {code:"unavailable"};
  return sample(input,{onText,signal,cache:false});
}
function md(t){
  const lines=esc(t).split(/\n/); let out="",list=null;
  const inline=s=>s.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/`([^`]+)`/g,"<code>$1</code>");
  for(const raw of lines){const l=raw.trim();
    const ul=l.match(/^[-•*]\s+(.*)/), ol=l.match(/^\d+[.)、]\s+(.*)/);
    if(ul||ol){const tag=ul?"ul":"ol"; if(list!==tag){if(list)out+=`</${list}>`;out+=`<${tag}>`;list=tag;} out+=`<li>${inline((ul||ol)[1])}</li>`;continue;}
    if(list){out+=`</${list}>`;list=null;}
    if(l) out+=`<p>${inline(l)}</p>`;}
  if(list) out+=`</${list}>`; return out;
}

async function explain(s,level,label){
  const out=$("#explainOut");
  const how={eli5:"像對五歲小孩解釋：用生活比喻（水管、道路、送貨），完全不用符號，150 字內。",
    eli14:"像對國中生解釋：可用簡單的數學與一個具體小例子，但不用專有名詞或先定義它，250 字內。",
    intern:"像對剛進實驗室的實習生解釋：說清楚要解決的問題、輸入輸出、演算法每一步在做什麼，以及實作時要注意的坑（去重、邊界情況），300 字內。",
    deep:"以研究生深挖的角度：說明關鍵定理為什麼成立、假設在哪裡被用到、這篇的限制或可能的漏洞，以及可延伸的研究問題，最後提出一個追問給學生思考。400 字內。"}[level];
  out.innerHTML=`<div class="ai-out"><div class="h">${esc(label)} · ${esc(s.short)}</div><div class="body">思考中…</div></div>`;
  const body=out.querySelector(".body");
  try{ await runSample(BASE+"\n\n任務："+how+"\n請解釋這一站的核心內容。\n\n"+kbFor(s.id),{onText:({text})=>{body.innerHTML=md(text);}}); }
  catch(e){ body.textContent=e.code==="unavailable"?NO_AI:errCopy(e.code); }
}

async function reviewOpen(s,i){
  const ta=document.getElementById(`open-${s.id}-${i}`), slot=document.getElementById("rv-"+i);
  const ans=ta.value.trim();
  if(ans.length<10){slot.innerHTML=`<div class="fb no">先寫下至少一兩句你的理解，再請 AI 助教批改。</div>`;return;}
  slot.innerHTML=`<div class="ai-out" style="margin-top:10px"><div class="h">AI 助教批改</div><div class="body">思考中…</div></div>`;
  const body=slot.querySelector(".body");
  const prompt=BASE+`\n\n任務：批改學生用自己的話寫的說明。請依序給出：
- **你掌握的部分**：具體指出說對的地方
- **缺漏或誤解**：逐點指出，並解釋正確的觀念與原因
- **往下追問**：提出 1 個更深一層的「為什麼」問題（不要附答案）
最後給一個整體判斷：「已掌握／大致掌握／需要再加強」。

題目：${strip(s.open[i])}
學生的說明：${ans}

${kbFor(s.id)}`;
  try{ await runSample(prompt,{onText:({text})=>{body.innerHTML=md(text);}}); }
  catch(e){ body.textContent=e.code==="unavailable"?NO_AI:errCopy(e.code); }
}

/* ---------- AI 抽屜（多輪對話） ---------- */
let ctxId=null, mode="ask", turns=[], ctl=null;
const SUGG={ask:["d-MP 和 d-MC 的差別是什麼？為什麼兩種都需要？","為什麼排容原理會隨 d-MP 數量爆炸？","這一站的方法有哪些可能的漏洞？"],
  socratic:["開始考我這一站","用選擇題考我","考我邊界情況"],
  review:["我來說明 d-MP 的定義，請批改","我來說明這一站的演算法，請批改"]};
function updateCtx(){ $("#aiCtx").textContent="目前脈絡："+(ctxId&&byId[ctxId]?byId[ctxId].short+" "+byId[ctxId].label:"全部九篇");
  $("#sugg").innerHTML=SUGG[mode].map(q=>`<button type="button">${esc(q)}</button>`).join("");
  $("#sugg").querySelectorAll("button").forEach(b=>b.onclick=()=>{$("#aiInput").value=b.textContent;$("#aiForm").requestSubmit();});}
function openDrawer(){ $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden","false"); $("#scrim").hidden=false; updateCtx();
  if(!turns.length) addMsg("a",md("你好！我是這九篇論文的 AI 助教。\n- **自由問答**：問任何概念、證明或例子\n- **考考我**：我會一次問你一個問題，等你回答後再追問\n- **批改我的說明**：用你自己的話解釋，我來找出缺漏\n請先選一個站點，或直接提問。"),true);
  setTimeout(()=>$("#aiInput").focus(),50);}
function closeDrawer(){ $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden","true"); $("#scrim").hidden=true; }
$("#aiOpen").onclick=()=>{ if(!location.hash.match(/^#(p\d|basics|frontier)$/)) ctxId=null; openDrawer(); };
$("#aiClose").onclick=closeDrawer; $("#scrim").onclick=closeDrawer;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();});
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.setAttribute("aria-pressed",x===b));updateCtx();});
function addMsg(who,html,isHtml){const d=document.createElement("div");d.className="msg "+who;if(isHtml)d.innerHTML=html;else d.textContent=html;$("#msgs").appendChild(d);$("#msgs").scrollTop=1e9;return d;}
$("#aiReset").onclick=()=>{turns=[];$("#msgs").innerHTML="";openDrawer();};
$("#aiStop").onclick=()=>ctl&&ctl.abort();
$("#aiForm").addEventListener("submit",async e=>{
  e.preventDefault(); const q=$("#aiInput").value.trim(); if(!q||ctl) return;
  $("#aiInput").value=""; addMsg("u",q); turns.push({role:"user",content:q});
  const modeRule={ask:"模式：自由問答。直接、清楚地回答，必要時舉論文中的例子。",
    socratic:"模式：考考我（蘇格拉底式）。一次只問一個問題（可以是開放題或附 A–D 選項的選擇題，正確選項的位置要隨機變換），然後停下來等學生回答。學生回答後，先評估對錯與缺漏、補充原因，再問下一個更深一層的問題。在學生作答之前，絕不公布答案。",
    review:"模式：批改我的說明。學生會用自己的話解釋概念；請指出說對的部分、缺漏與誤解（附原因），並提出一個追問。若學生還沒開始說明，請請他先用自己的話說說看。"}[mode];
  const rules=BASE+"\n"+modeRule+"\n\n"+kbFor(ctxId);
  const bubble=addMsg("a","思考中…"); ctl=new AbortController(); $("#aiStop").hidden=false; $("#aiSend").disabled=true; $("#aiStatus").textContent="";
  try{ const {text,truncated}=await runSample([{role:"user",content:rules},{role:"assistant",content:"好的，我會依照這些規則與筆記回答。"},...turns],{signal:ctl.signal,onText:({text})=>{bubble.innerHTML=md(text);$("#msgs").scrollTop=1e9;}});
    bubble.innerHTML=md(text); turns.push({role:"assistant",content:text}); if(truncated)$("#aiStatus").textContent="回答被截斷，可以請它繼續。";
    if(turns.length>16) turns=turns.slice(-16);
  }catch(err){ turns.pop(); if(err.text){bubble.innerHTML=md(err.text);} else bubble.textContent=err.code==="unavailable"?NO_AI:errCopy(err.code); }
  finally{ ctl=null; $("#aiStop").hidden=true; $("#aiSend").disabled=false; }
});
$("#aiInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();$("#aiForm").requestSubmit();}});

/* ---------- 演算法實驗室 ---------- */
const cge=(d,v)=>Object.entries(d).reduce((s,[k,p])=>+k>=v?s+p:s,0);
const cle=(d,v)=>Object.entries(d).reduce((s,[k,p])=>+k<=v?s+p:s,0);
const leq=(a,b)=>a.every((x,i)=>x<=b[i]);
const uniq=V=>{const u=[];V.forEach(v=>{if(!u.some(w=>w.join()===v.join()))u.push(v);});return u;};
function unionProb(dists,pts,dir){ // dir: "ge" | "le"
  let R=0; const k=pts.length; if(k>16) return NaN;
  for(let s=1;s<1<<k;s++){let v=null,c=0;for(let i=0;i<k;i++)if(s>>i&1){c++;v=v?v.map((x,t)=>dir==="ge"?Math.max(x,pts[i][t]):Math.min(x,pts[i][t])):pts[i].slice();}
    let p=1; v.forEach((x,t)=>p*=dir==="ge"?cge(dists[t],x):cle(dists[t],x)); R+=(c%2?1:-1)*p;}
  return R;
}
const PRESETS={
  bridgeMP:{name:"P1 例 2：橋式網路（6 弧、4 條 MP）",type:"mp",n:6,M:[3,2,1,1,1,2],paths:[[0,1],[0,2,5],[1,3,4],[4,5]],
    dist:[{3:.6,2:.25,1:.1,0:.05},{2:.6,1:.3,0:.1},{1:.9,0:.1},{1:.9,0:.1},{1:.9,0:.1},{2:.7,1:.25,0:.05}],dmax:4,d:3,paper:{1:"0.98892",2:"0.883",3:"0.611415",4:"0.20412"},cyclic:true},
  spMP:{name:"P1 例 1：串並聯網路（5 弧、3 條 MP）",type:"mp",n:5,M:[1,2,2,2,1],paths:[[0,1],[2],[3,4]],
    dist:[{1:.9,0:.1},{2:.7,1:.2,0:.1},{2:.7,1:.2,0:.1},{2:.7,1:.2,0:.1},{1:.9,0:.1}],dmax:4,d:2,paper:{},cyclic:false,distNote:"論文例 1 沒有給機率分配，此處的分配為示範用。"},
  bridgeMC:{name:"P2 例 1：橋式網路（5 弧、4 個 MC）",type:"mc",n:5,M:[3,2,1,1,2],cuts:[[0,3],[1,4],[0,2,4],[1,2,3]],
    dist:[{3:.6,2:.25,1:.1,0:.05},{2:.6,1:.3,0:.1},{1:.9,0:.1},{1:.9,0:.1},{2:.7,1:.25,0:.05}],dmax:3,d:2,paper:{0:"0.98892",1:"0.883",2:"0.611415",3:"0.20412"}},
  qp:{name:"P7：最快路徑基準網路（8 弧、6 條 MP）",type:"qp",n:8,L:[2,1,3,3,1,2,2,1],paths:[[0,3],[0,4,7],[0,1,5],[0,1,6,7],[2,5],[2,6,7]],
    dist:[{3:.8,2:.1,1:.05,0:.05},{3:.8,2:.1,1:.05,0:.05},{2:.85,1:.1,0:.05},{1:.9,0:.1},{1:.9,0:.1},{4:.6,3:.2,2:.1,1:.05,0:.05},{5:.55,4:.1,3:.1,2:.1,1:.1,0:.05},{3:.8,2:.1,1:.05,0:.05}],d:8,T:9}
};
let lab={preset:"bridgeMP",d:3,T:9,step:4};
const vec=v=>"("+v.join(",")+")";
const pathName=(p,pre="a")=>"{"+p.map(i=>pre+(i+1)).join(",")+"}";

function solveMP(P,d){
  const m=P.paths.length,n=P.n,flows=[],f=Array(m).fill(0),load=Array(n).fill(0);
  (function rec(j,rem){
    if(j===m-1){for(const a of P.paths[j]) if(load[a]+rem>P.M[a]) return; f[j]=rem; flows.push(f.slice()); f[j]=0; return;}
    for(let v=0;v<=rem;v++){if(P.paths[j].some(a=>load[a]+v>P.M[a])) break; P.paths[j].forEach(a=>load[a]+=v); f[j]=v; rec(j+1,rem-v); P.paths[j].forEach(a=>load[a]-=v); f[j]=0;}
  })(0,d);
  const rows=flows.map(F=>{const x=Array(n).fill(0);P.paths.forEach((p,j)=>p.forEach(a=>x[a]+=F[j]));return {F,X:x};});
  const U=uniq(rows.map(r=>r.X));
  rows.forEach(r=>{const dom=U.find(w=>w.join()!==r.X.join()&&leq(w,r.X)); r.ok=!dom; r.why=dom?vec(dom)+" < X":""; r.dup=rows.findIndex(o=>o.X.join()===r.X.join())!==rows.indexOf(r);});
  const mins=U.filter(v=>!U.some(w=>w!==v&&leq(w,v)));
  return {rows,mins,R:unionProb(P.dist,mins,"ge")};
}
function solveMC(P,d){
  const V=C=>Math.min(...P.cuts.map(k=>k.reduce((s,a)=>s+C[a],0)));
  const rows=[];
  P.cuts.forEach((k,r)=>{(function rec(i,rem,c){
    if(i===k.length-1){if(rem>P.M[k[i]])return;const C=P.M.slice();k.forEach((a,t)=>C[a]=t<i?c[t]:rem);rows.push({K:r,C});return;}
    for(let v=0;v<=Math.min(rem,P.M[k[i]]);v++)rec(i+1,rem-v,[...c,v]);})(0,d,[]);});
  const all=[...Array(P.n).keys()];
  rows.forEach(row=>{const C=row.C,v=V(C);
    if(v<d){row.ok=false;row.why="V(C)="+v+" < d";return;}
    const I=P.cuts.filter(k=>k.reduce((s,a)=>s+C[a],0)===d), inter=all.filter(a=>I.every(k=>k.includes(a)));
    const bad=all.find(a=>!inter.includes(a)&&C[a]!==P.M[a]);
    row.ok=bad===undefined; row.why=row.ok?"":"a"+(bad+1)+" 未飽和卻不在 ∩K 中";});
  const seen=new Set(); rows.forEach(r=>{r.dup=r.ok&&seen.has(r.C.join()); if(r.ok)seen.add(r.C.join());});
  const mcs=uniq(rows.filter(r=>r.ok).map(r=>r.C));
  const le=unionProb(P.dist,mcs,"le");
  return {rows,mcs,PrLE:le,R:1-le};
}
function solveQP(P,d,T){
  const rows=P.paths.map((p,j)=>{const lead=p.reduce((s,a)=>s+P.L[a],0); let v=null;
    for(let c=1;c<=d;c++){if(lead+Math.ceil(d/c)<=T){v=c;break;}}
    const maxc=Math.min(...p.map(a=>Math.max(...Object.keys(P.dist[a]).map(Number))));
    let X=null,why="";
    if(v===null) why="即使容量 = d 也超過 T"; else if(v>maxc) why="需要 "+v+"，但路徑最大容量只有 "+maxc;
    else {X=Array(P.n).fill(0);p.forEach(a=>{X[a]=Math.min(...Object.keys(P.dist[a]).map(Number).filter(k=>k>=v));});}
    return {j,p,lead,v,maxc,X,why};});
  const pts=rows.filter(r=>r.X).map(r=>r.X);
  return {rows,pts,R:unionProb(P.dist,pts,"ge")};
}

function renderLab(){
  const P=PRESETS[lab.preset]; const v=$("#v-lab");
  if(P.type!=="qp"){lab.d=Math.min(Math.max(lab.d,P.type==="mc"?0:1),P.dmax);}
  const stepNames=P.type==="mp"?["1 列舉流量 F","2 轉換成 X","3 去除非極小","4 聯集機率"]:P.type==="mc"?["1 每個 MC 解等式","2 其餘弧設為 M","3 檢查 d-MC","4 聯集機率"]:["1 每條 MP 求最小 v","2 建立下邊界點","3 聯集機率"];
  lab.step=Math.min(lab.step,stepNames.length);
  let ctrl=`<div class="ctrl card"><label>範例網路<select id="lp">${Object.entries(PRESETS).map(([k,p])=>`<option value="${k}"${k===lab.preset?" selected":""}>${esc(p.name)}</option>`).join("")}</select></label>`;
  if(P.type==="qp") ctrl+=`<label>資料量 d<input type="number" id="ld" min="1" max="40" value="${lab.d}"></label><label>時間限制 T<input type="number" id="lT" min="1" max="40" value="${lab.T}"></label>`;
  else ctrl+=`<label>需求水準 d（${P.type==="mc"?"0–"+P.dmax:"1–"+P.dmax}）<input type="number" id="ld" min="${P.type==="mc"?0:1}" max="${P.dmax}" value="${lab.d}"></label>`;
  ctrl+=`<div class="note">${P.type==="mp"?"MP："+P.paths.map((p,j)=>"P"+(j+1)+"="+pathName(p)).join("、")+"<br>M = "+vec(P.M):P.type==="mc"?"MC："+P.cuts.map((p,j)=>"K"+(j+1)+"="+pathName(p)).join("、")+"<br>M = "+vec(P.M):"MP："+P.paths.map((p,j)=>"P"+(j+1)+"="+pathName(p)).join("、")+"<br>前置時間 L = "+vec(P.L)}${P.distNote?"<br>"+P.distNote:""}</div>
    <details><summary class="note">各弧容量分配</summary><div class="tbl"><table><tr><th>弧</th><th>容量: 機率</th></tr>${P.dist.map((d,i)=>`<tr><td>a${i+1}</td><td class="mono">${Object.entries(d).sort((a,b)=>b[0]-a[0]).map(([k,p])=>k+": "+p).join("  ")}</td></tr>`).join("")}</table></div></details></div>`;

  let res="";
  if(P.type==="mp"){const r=solveMP(P,lab.d);
    res+=table(["F（流量）",lab.step>=2?"X（容量向量）":"",lab.step>=3?"是 d-MP？":""].filter(Boolean),r.rows.map(x=>[vec(x.F),lab.step>=2?vec(x.X)+(x.dup?"（重複）":""):null,lab.step>=3?(x.ok&&!x.dup?"是":x.dup?"重複":"否："+x.why):null].filter(c=>c!==null)),r.rows.map(x=>lab.step>=3?(x.ok&&!x.dup?"yes":"no"):""));
    res+=`<p class="note">共 ${r.rows.length} 個可行流量 → ${uniq(r.rows.map(x=>x.X)).length} 個相異候選 → <b>${r.mins.length} 個 ${lab.d}-MP</b>。${P.cyclic?"這個網路有迴圈（雙向橋），所以一定要做步驟 3。":"網路無迴圈，依 Lemma 4，步驟 3 不會淘汰任何候選。"}</p>`;
    if(lab.step>=4) res+=resultBox("R<sub>"+lab.d+"</sub> = Pr{V(X) ≥ "+lab.d+"}",r.R,P.paper[lab.d],r.mins.length);
  }else if(P.type==="mc"){const r=solveMC(P,lab.d);
    res+=table(["來源 MC",lab.step>=2?"C（候選）":"C（K 上的解）",lab.step>=3?"是 d-MC？":""].filter(Boolean),r.rows.map(x=>["K"+(x.K+1),lab.step>=2?vec(x.C):P.cuts[x.K].map(a=>"c"+(a+1)+"="+x.C[a]).join(", "),lab.step>=3?(x.ok?(x.dup?"是（與前面重複）":"是"):"否："+x.why):null].filter(c=>c!==null)),r.rows.map(x=>lab.step>=3?(x.ok&&!x.dup?"yes":"no"):""));
    res+=`<p class="note">共 ${r.rows.length} 個候選 → 去重後 <b>${r.mcs.length} 個 ${lab.d}-MC</b>。Pr{V ≤ ${lab.d}} = ${lab.step>=4?r.PrLE.toFixed(6):"…"}</p>`;
    if(lab.step>=4) res+=resultBox("R<sub>"+(lab.d+1)+"</sub> = 1 − Pr{V ≤ "+lab.d+"}",r.R,P.paper[lab.d],r.mcs.length);
  }else{const r=solveQP(P,lab.d,lab.T);
    res+=table(["MP","前置時間","最小 v",lab.step>=2?"下邊界點 X":""].filter(Boolean),r.rows.map(x=>["P"+(x.j+1)+" "+pathName(x.p),x.lead,x.v===null?"—":x.v,lab.step>=2?(x.X?vec(x.X):"不存在："+x.why):null].filter(c=>c!==null)),r.rows.map(x=>lab.step>=2?(x.X?"yes":"no"):""));
    if(lab.step>=3) res+=resultBox("R<sub>"+lab.d+","+lab.T+"</sub>",r.R,lab.d===8&&lab.T===9?"0.91275":lab.d===8&&lab.T===12?"0.987359625（本頁重算 0.98209，見 P7 說明）":null,r.pts.length);
  }
  v.innerHTML=`<div class="eyebrow">演算法實驗室</div><h1 style="font-size:clamp(22px,3vw,30px);margin:4px 0 6px">一步一步重現論文的數值</h1>
    <p class="note" style="max-width:70ch">選一個範例，調整 d（或 T），逐步打開每個步驟。建議先自己手算一次，再按下一步對答案。</p>
    <div class="lab-grid" style="margin-top:14px">${ctrl}<div class="card" style="min-width:0"><div class="steps" role="group" aria-label="執行到第幾步">${stepNames.map((n,i)=>`<button type="button" data-step="${i+1}" aria-pressed="${lab.step===i+1}">${n}</button>`).join("")}</div>${res}</div></div>`;
  $("#lp").onchange=e=>{lab.preset=e.target.value;const P2=PRESETS[lab.preset];lab.d=P2.d;if(P2.T)lab.T=P2.T;renderLab();};
  $("#ld").onchange=e=>{lab.d=+e.target.value||1;renderLab();};
  if($("#lT")) $("#lT").onchange=e=>{lab.T=+e.target.value||1;renderLab();};
  v.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{lab.step=+b.dataset.step;renderLab();});
}
function table(h,rows,cls){return `<div class="tbl"><table><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr>${rows.map((r,i)=>`<tr class="${cls[i]||""}">${r.map((c,j)=>`<td class="${j<2?"mono":""}">${c}</td>`).join("")}</tr>`).join("")}</table></div>`;}
function resultBox(label,R,paper,q){return `<div class="row" style="margin-top:14px;gap:24px;align-items:flex-end"><div><div class="note">${label}</div><div class="big">${isNaN(R)?"邊界點過多":R.toFixed(6)}</div></div>
  <div class="note">${paper?"論文數值：<b class='mono'>"+paper+"</b><br>":""}排容原理項數 2<sup>${q}</sup> − 1 = ${Math.pow(2,q)-1}</div></div>`;}

/* ---------- 理解檢查清單 ---------- */
const CL=[
 ["問題本身",[
  ["why-multistate","能說明為什麼二態可靠度不夠用，以及多狀態容量的物理來源（傳輸線由多條實體線組成）"],
  ["rd","能精確定義 R<sub>d</sub> = Pr{V(X) ≥ d}，並說明需求 d 隨機時 R = ΣR<sub>d</sub>π<sub>d</sub>"],
  ["monotone","能解釋結構函數的單調性為什麼讓「只用邊界點描述成功事件」成立"],
  ["partial","能用例子說明偏序造成多個極小點"],
  ["np","能說明三個計算瓶頸：MP/MC 列舉、候選枚舉、聯集機率"]]],
 ["解決方案：核心方法",[
  ["dmc","P2：能說明 d-MC 定義（U<sub>C</sub>=S<sub>C</sub>）、JLY 必要條件為何讓 K<sub>r</sub> 外的弧全滿，以及串並聯網路為何免檢查"],
  ["dmp","P1：能推導 flow→capacity 轉換、Lemma 2 的反證，以及 Lemma 4（無迴圈 ⇒ 候選即 d-MP）"],
  ["dual","能說明 MP↔MC、下↔上邊界、取 max↔取 min 的對偶，並用 R<sub>3</sub>=0.611415 互相驗證"],
  ["ie","能手算兩三個邊界點的排容原理，並說明交集為何是逐維取 max（或 min）"],
  ["dedup","能說明去重與修剪的必要性（多對一轉換、多個 MC 產生同一候選）"]]],
 ["解決方案：延伸與設計決策",[
  ["node","P3：能說明為何節點容量是共享的、Aggarwal 的技巧為何失效，以及 f<sub>j</sub> ≤ L<sub>j</sub> 為何多餘"],
  ["multi","P4：能說明容量權重、上取整的原因，以及為何總流量不是好指標"],
  ["twoc","P5：能說明二維系統容量、預算與 (d₁,d₂,B)-MC，以及 w² ≥ w¹ 在定理 1 中的作用"],
  ["proj","P6：能說明較長與較短邊界的取捨，以及演算法 I 的漏解反例"],
  ["qp","P7：能說明 Σl + ⌈d/v⌉ 的意義、為什麼最多 m 個下邊界點，以及容量水準不連續時的進位"],
  ["spare","P8：能說明分流、預算、備援公式的獨立性來源，以及「失效 ≠ 無法達標」的邊界情況"],
  ["ga","P9：能說明 TLAMNR 為何 NP-hard、GA 的編碼與修復、死亡懲罰，以及 RSDP 的 ⊕"]]],
 ["程式實作（實驗室 MATLAB）",[
  ["c-conv","能說明實驗室程式的三個資料格式約定：路徑矩陣存弧編號、存活函數與 CDF、索引 = 容量 + 1"],
  ["c-rsdp","能手寫 RSDP 的遞迴式，說明各項為何不交，並在練習 1、2 重現 0.611415 與 0.8242"],
  ["c-dmp","能說明 dMCs／dMPs 的比較邏輯（MATLAB 的 if 向量 = all），以及原資料夾缺少 dMPs.m 的影響"],
  ["c-proj","能說明 UpperBoundary.m 的虛擬工期技巧為何補上論文演算法 I 的漏洞，以及 Project_reliability 公式的意義"],
  ["c-qp","能指出 QP.m 與論文 7 的差異（d/ca 與 ⌈d/v⌉、沒有進位到容量水準），並說明 COST = Σc(L−x) 的來源"]]],
 ["更廣泛的背景脈絡",[
  ["template","能用五步模板統整九篇，並指出每篇在哪一步加了什麼"],
  ["assume","能指出共同假設（獨立、整數容量、MP/MC 已知、單一源匯點）以及放寬後的研究機會"],
  ["critical","能批判性閱讀：說出至少兩處論文的限制、漏洞或無法重現的數值"],
  ["apply","能說明這些指標在電力、通訊、物流、專案管理中的決策用途"]]]
];
function renderChecklist(){
  const total=CL.reduce((s,g)=>s+g[1].length,0), done=Object.values(st.cl).filter(Boolean).length;
  $("#v-checklist").innerHTML=`<div class="eyebrow">理解檢查清單 · ${done} / ${total}</div><h1 style="font-size:clamp(22px,3vw,30px);margin:4px 0 6px">你真的懂了嗎？</h1>
  <p class="note" style="max-width:70ch">只有在你能<b>不看資料、用自己的話說出來</b>，並答對相關測驗時才打勾。可以搭配 AI 助教的「批改我的說明」模式自我檢查。</p>
  ${CL.map(g=>`<div class="card cl-group"><h3>${g[0]}</h3>${g[1].map(([k,t])=>`<div class="cl-item"><input type="checkbox" id="cl-${k}" ${st.cl[k]?"checked":""}><label for="cl-${k}">${t}</label></div>`).join("")}</div>`).join("")}`;
  document.querySelectorAll("[id^=cl-]").forEach(c=>c.onchange=()=>{st.cl[c.id.slice(3)]=c.checked;save();renderChecklist();});
}

/* ---------- 路由 ---------- */
function route(){
  const h=(location.hash||"#map").slice(1);
  const views={map:"v-map",lab:"v-lab",checklist:"v-checklist",practice:"v-practice",code:"v-code",files:"v-files"};
  const isSt=!!byId[h];
  document.querySelectorAll(".view").forEach(v=>v.hidden=true);
  document.querySelectorAll("[data-nav]").forEach(a=>a.removeAttribute("aria-current"));
  if(isSt){$("#v-station").hidden=false;renderStation(h);}
  else{const id=views[h]||"v-map";$("#"+id).hidden=false;const n=document.querySelector(`[data-nav="${views[h]?h:"map"}"]`);n&&n.setAttribute("aria-current","page");
    if(id==="v-map"){drawMap();ctxId=null;} if(id==="v-lab")renderLab(); if(id==="v-checklist")renderChecklist(); if(window.PRACTICE_VIEWS&&window.PRACTICE_VIEWS[h]) window.PRACTICE_VIEWS[h]();}
  window.scrollTo(0,0); updateProgress();
}
window.addEventListener("hashchange",route);
route();
getSample().then(s=>{ if(!s){ $("#aiOpen").title="在 claude.ai 開啟才能使用 AI 助教"; } });
})();
