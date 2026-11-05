/* 練習題與程式教學（原始碼與 Excel 檔在 practice-data.js，只隨儀表板發布，不進 git） */
(function(){
"use strict";
const $=(q,el=document)=>el.querySelector(q);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const vec=v=>"("+v.join(",")+")";
const leq=(a,b)=>a.every((x,i)=>x<=b[i]);
const D=()=>window.PRACTICE_DATA;
const NODATA=`<div class="card"><b>這部分的資料已加密。</b><p class="note">實驗室程式與 Excel 練習檔僅供內部使用，請輸入密碼解鎖。</p><div class="row" style="margin-top:8px"><button class="btn solid" type="button" data-unlock>輸入密碼解鎖</button><span class="note dlmsg"></span></div></div>`;
function wireUnlock(root,again){root.querySelectorAll("[data-unlock]").forEach(b=>b.onclick=async()=>{const m=b.parentElement.querySelector(".dlmsg");
  try{m.textContent="";await window.VAULT.loadPracticeData();again();}catch(e){m.textContent=window.VAULT?window.VAULT.errText(e):"這個版本沒有附上資料。";}});}

/* ---------- 下載（downloads 能力；不在 claude.ai 時退回一般下載） ---------- */
let dlP=null;
async function save(name,blob,msgEl){
  msgEl&&(msgEl.textContent="準備檔案中…");
  try{
    if(!dlP) dlP=(window.claude&&window.claude.use)?window.claude.use("downloads").catch(()=>null):Promise.resolve(null);
    const dl=await dlP;
    if(!dl){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);msgEl&&(msgEl.textContent="");return;}
    await dl.save({filename:name,data:blob}); msgEl&&(msgEl.textContent="已送出下載："+name);
  }catch(e){ msgEl&&(msgEl.textContent=e.code==="declined"?"已取消下載。":e.code==="rate_limited"?"已有下載視窗開著，請稍後再試。":"目前無法下載（"+(e.code||"錯誤")+"）。"); }
}
const b64blob=(b64,type)=>{const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Blob([u],{type});};
const XLSX_NAMES={"RSDP_MATLAB_practice.xlsx":"RSDP_MATLAB_practice.xlsx","論文6_JORSJ_練習.xlsx":"paper6_JORSJ_practice.xlsx","程式資料_QP_d128_T20_B20000.xlsx":"QP_program_data_d128_T20_B20000.xlsx"};
const XLSX_T="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
function xlsxBtn(name,label){return `<button class="btn" type="button" data-xlsx="${esc(name)}">${label||"下載原始 Excel"}</button>`;}
function wireXlsx(root){root.querySelectorAll("[data-xlsx]").forEach(b=>b.onclick=async()=>{const d=D();const m=b.parentElement.querySelector(".dlmsg")||b.insertAdjacentElement("afterend",Object.assign(document.createElement("span"),{className:"note dlmsg"}));
  if(!d){try{await window.VAULT.loadPracticeData();}catch(e){m.textContent=window.VAULT?window.VAULT.errText(e):"這個版本沒有附上 Excel 檔。";return;}}
  save(XLSX_NAMES[b.dataset.xlsx]||b.dataset.xlsx,b64blob(D().xlsx[b.dataset.xlsx],XLSX_T),m);});}

/* ---------- RSDP（逐字對應 RSDP.m 的遞迴） ---------- */
function minimalUniq(X){const u=[];X.forEach(v=>{if(!u.some(w=>w.join()===v.join()))u.push(v)});return u.filter(x=>!u.some(y=>y!==x&&leq(y,x)));}
function surv(pm){return pm.map(r=>{const s=[1];for(let k=1;k<r.length;k++)s.push(+(s[k-1]-r[k-1]).toFixed(12));return s;});}
const PrGE=(x,S)=>x.reduce((p,v,i)=>p*(v<S[i].length?S[i][v]:0),1);
function RSDP(sols,S){let R=PrGE(sols[0],S);for(let i=1;i<sols.length;i++){const Y=sols.slice(0,i).map(s=>s.map((v,t)=>Math.max(v,sols[i][t])));const r2=i===1?PrGE(Y[0],S):RSDP(minimalUniq(Y),S);R+=PrGE(sols[i],S)-r2;}return R;}
function rsdpTrace(sols,S){
  const rows=[];let R=PrGE(sols[0],S);
  rows.push({i:1,x:sols[0],p:PrGE(sols[0],S),Y:[],r2:0,R});
  for(let i=1;i<sols.length;i++){const Yall=sols.slice(0,i).map(s=>s.map((v,t)=>Math.max(v,sols[i][t])));const Y=i===1?Yall:minimalUniq(Yall);
    const r2=i===1?PrGE(Y[0],S):RSDP(Y,S); const p=PrGE(sols[i],S); R+=p-r2; rows.push({i:i+1,x:sols[i],p,Yall,Y,r2,R});}
  return rows;
}

/* ---------- 練習資料 ---------- */
const EX1={pm:[[.05,.1,.25,.6],[.1,.3,.6],[.1,.9],[.1,.9],[.1,.9],[.05,.25,.7]],
  X:[[3,2,1,0,0,1],[2,2,1,1,1,1],[2,2,0,0,1,1],[2,1,1,0,1,2]],ans:0.611415};
const EX3={pm:[[.01,.01,.98],[.01,.01,.02,.96],[.01,.01,.98],[.01,.01,.02,.96],[.01,.01,.01,.97],[.01,.01,.02,.96],[.005,.005,.005,.01,.01,.01,.955],[.005,.005,.005,.01,.01,.965],[.005,.005,.01,.01,.97],[.005,.005,.005,.01,.01,.965]],
  X:[[2,2,0,0,3,3,5,2,3,5],[2,3,0,1,3,2,5,3,3,5],[2,2,1,1,3,3,5,3,4,5],[2,3,1,2,3,2,5,4,4,5],[2,2,2,2,3,3,5,4,5,5],[2,3,2,3,3,2,5,5,5,5]],ans:0.824241794};
const PJ={L:[2,3,1,2,3],U:[4,5,3,4,5],W:[8,8,7,6,8],P:[[0,1],[0,2,4],[3,4]]};
const pjT=x=>Math.max(...PJ.P.map(p=>p.reduce((s,a)=>s+x[a],0))), pjB=x=>x.reduce((s,v,i)=>s+PJ.W[i]-(v-PJ.L[i]),0);
const pjAll=(()=>{const a=[];(function r(i,x){if(i===5){a.push(x.slice());return;}for(let v=PJ.L[i];v<=PJ.U[i];v++){x[i]=v;r(i+1,x);}})(0,[]);return a;})();

let pst={ex:"rsdp1",step:1,inclX2:true,T:7,B:34,showLong:false,showShort:false,qpRow:0};

function rsdpBlock(EX,label,inclToggle){
  const S=surv(EX.pm); const sols=pst.inclX2||!inclToggle?EX.X:EX.X.filter((_,i)=>i!==1);
  const tr=rsdpTrace(sols,S);
  return `<h3 style="font-size:16px;margin:14px 0 6px">${label}</h3>
  ${inclToggle?`<label class="switch"><input type="checkbox" id="inclX2" ${pst.inclX2?"checked":""}> 保留非極小候選 X² = (2,2,1,1,1,1)（Excel 練習中的寫法）</label>`:""}
  <div class="tbl" style="margin-top:8px"><table><tr><th>i</th><th>X<sup>i</sup></th><th>Pr{X ≥ X<sup>i</sup>}</th><th>與前面取 max 後的集合（去非極小）</th><th>遞迴 RSDP(·)</th><th>累計 R</th></tr>
  ${tr.map(r=>`<tr><td>${r.i}</td><td class="mono">${vec(r.x)}</td><td class="mono">${r.p.toFixed(6)}</td><td class="mono" style="white-space:normal;min-width:220px">${r.i===1?"—":r.Y.map(vec).join("<br>")}${r.Yall&&r.Yall.length!==r.Y.length?`<br><span class="note">（原本 ${r.Yall.length} 個，去掉 ${r.Yall.length-r.Y.length} 個非極小／重複）</span>`:""}</td><td class="mono">${r.i===1?"—":r.r2.toFixed(6)}</td><td class="mono"><b>${r.R.toFixed(9)}</b></td></tr>`).join("")}</table></div>
  <p class="note">R = Σ<sub>i</sub> [ Pr{X ≥ X<sup>i</sup>} − RSDP({max(X<sup>i</sup>,X<sup>j</sup>) : j &lt; i}) ]。第 i 項是「X ≥ X<sup>i</sup> 但不 ≥ 任何前面的 X<sup>j</sup>」的機率，所以各項彼此不交。結果 <b class="mono">${tr[tr.length-1].R.toFixed(9)}</b>，與 Excel／論文的 <b class="mono">${EX.ans}</b> ${Math.abs(tr[tr.length-1].R-EX.ans)<5e-6?"一致":"不一致"}。</p>`;
}

function renderPractice(){
  const v=$("#v-practice"); const ex=pst.ex;
  const tabs=[["rsdp1","1 · RSDP 手算（論文 1）"],["rsdp3","2 · RSDP 節點故障（論文 3）"],["proj","3 · 專案網路窮舉（論文 6）"],["qp","4 · 多路徑最快路徑＋預算（研究資料）"]];
  let body="";
  if(ex==="rsdp1"){
    const S=surv(EX1.pm);
    body=`<p>資料就是論文 1 例 2 的橋式網路（6 弧、d=3）。Excel 的 <span class="mono">RSDP練習01</span> 分成三步：把機率分配轉成 <b>Pr{x ≥ k}</b>（程式中的 <span class="mono">asign_pmf</span>）、列出 d-MP 候選、呼叫 <span class="mono">RSDP(x, 4, 6, pmf)</span>。</p>
    <div class="qitem"><div class="qq">步驟 1：自己算算看。a<sub>1</sub> 的分配是 0:0.05、1:0.1、2:0.25、3:0.6，請填 Pr{x<sub>1</sub> ≥ k}。</div>
      <div class="row">${[0,1,2,3].map(k=>`<label class="note">k=${k} <input type="number" step="0.01" id="sv${k}" style="width:90px"></label>`).join("")}<button class="btn solid" type="button" id="svChk">檢查</button></div><div id="svFb"></div>
      <details class="proof"><summary>Excel 怎麼算？（先自己填完再看）</summary><div>Excel 的公式是 <span class="mono">K2 = J2 − B26</span>、<span class="mono">L2 = K2 − C26</span>…：從 1 開始，每一格減掉前一個容量的機率。這就是存活函數 Pr{x ≥ k} = 1 − Pr{x ≤ k−1}。程式用 <span class="mono">asign_pmf(i, x+1)</span> 取值，<b>+1</b> 是因為 MATLAB 從 1 開始編號，而容量從 0 開始。</div></details></div>
    <div class="qitem" style="margin-top:12px"><div class="qq">步驟 2：Excel 列了 4 個候選。哪一個不是 3-MP？</div><div class="opts" id="ex1opts">${EX1.X.map((x,i)=>`<button class="opt" type="button" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span class="mono">${vec(x)}</span></button>`).join("")}</div><div id="ex1fb"></div></div>
    <div class="row" style="margin-top:14px;gap:8px">${[1,2,3].map(s=>`<button type="button" class="pill" data-pstep="${s}" ${pst.step===s?'style="border-color:var(--accent);color:var(--accent)"':""}>步驟 ${s}</button>`).join("")}<span class="note">選「步驟 3」逐項看 RSDP 遞迴</span></div>
    ${pst.step>=3?rsdpBlock(EX1,"步驟 3：RSDP 逐項追蹤",true)+`<div class="qitem" style="margin-top:10px"><div class="qq">思考題：保留或拿掉非極小的 X²，答案都一樣。為什麼？那為什麼論文還是要先去掉非極小的候選？</div><details class="proof"><summary>想好再看</summary><div>{X ≥ X²} ⊆ {X ≥ X³}，因為 X³ ≤ X²，所以聯集不變。去掉它是為了效率：RSDP 每多一個向量，就多一輪遞迴，排容原理則是項數加倍。</div></details></div>`:""}
    <div class="row" style="margin-top:12px">${xlsxBtn("RSDP_MATLAB_practice.xlsx")}</div>`;
  }else if(ex==="rsdp3"){
    body=`<p>Excel 的 <span class="mono">RSDP練習03</span> 用的是論文 3 的電腦網路（6 條弧 + 4 台交換機 = 10 個元件，d=5）。步驟 2 由 6 個流量向量 F 轉出 6 個候選 X，步驟 4 在 MATLAB 呼叫 <span class="mono">RSDP(x, 6, 10, pmf)</span> 得到 0.8242。</p>
    <div class="qitem"><div class="qq">先自己判斷：這 6 個候選中，哪些是 5 的下邊界點？</div><div class="opts" id="ex3opts" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${EX3.X.map((x,i)=>`<button class="opt" type="button" data-i="${i}"><span class="k">X${i+1}</span><span class="mono">${vec(x)}</span></button>`).join("")}</div><div class="row" style="margin-top:8px"><button class="btn solid" type="button" id="ex3chk">檢查我的選擇</button><span class="note" id="ex3fb"></span></div></div>
    ${rsdpBlock(EX3,"RSDP 逐項追蹤（直接用 Excel 的 6 個候選）",false)}
    <p class="note">注意第 3 列之後：「取 max 再去非極小」讓遞迴的子問題變小，這就是 RSDP 比排容原理有效率的地方。排容原理要算 2⁶ − 1 = 63 項。</p>
    <div class="row">${xlsxBtn("RSDP_MATLAB_practice.xlsx")}</div>`;
  }else if(ex==="proj"){
    const F=pjAll.filter(x=>pjT(x)<=pst.T&&pjB(x)<=pst.B);
    const longB=F.filter(x=>!F.some(y=>y!==x&&leq(x,y))), shortB=F.filter(x=>!F.some(y=>y!==x&&leq(y,x)));
    const sheet5=[3,4,5].flatMap(x2=>[2,3,4].map(x4=>{const x1=7-x2,x5=7-x4,x3=7-x1-x5,x=[x1,x2,x3,x4,x5];const ok=x.every((v,i)=>v>=PJ.L[i]&&v<=PJ.U[i]);return {x,ok,c:pjB(x)};}));
    body=`<p>Excel 的 <span class="mono">Duration</span>、<span class="mono">Cost</span> 工作表把論文 6 例子的 3⁵ = <b>243</b> 種工期組合全部列出，並計算三條路徑的長度與總成本；<span class="mono">工作表5</span> 則用參數法解演算法 I 的方程組。</p>
    <div class="row"><label class="note">期限 T <input type="number" id="pjT" value="${pst.T}" min="5" max="14" style="width:80px"></label><label class="note">預算 B <input type="number" id="pjB" value="${pst.B}" min="25" max="40" style="width:80px"></label>
      <span class="note">可行組合：<b>${F.length}</b> / 243</span></div>
    <div class="qitem" style="margin-top:10px"><div class="qq">先自己想：在 (T,B)=(${pst.T},${pst.B}) 下，較長邊界與較短邊界各有幾個？想好再按按鈕揭曉。</div>
      <div class="row"><button class="btn" type="button" id="showLong">${pst.showLong?"隱藏":"揭曉"}較長邊界（${pst.showLong?longB.length:"?"}）</button><button class="btn" type="button" id="showShort">${pst.showShort?"隱藏":"揭曉"}較短邊界（${pst.showShort?shortB.length:"?"}）</button></div></div>
    <div class="tbl" style="max-height:340px;overflow:auto;margin-top:10px"><table><tr><th>(x₁,…,x₅)</th><th>P₁</th><th>P₂</th><th>P₃</th><th>T(X)</th><th>B(X)</th><th>標記</th></tr>
    ${F.map(x=>{const isL=pst.showLong&&longB.includes(x),isS=pst.showShort&&shortB.includes(x);return `<tr class="${isL||isS?"yes":""}"><td class="mono">${vec(x)}</td>${PJ.P.map(p=>`<td class="mono">${p.reduce((s,a)=>s+x[a],0)}</td>`).join("")}<td class="mono">${pjT(x)}</td><td class="mono">${pjB(x)}</td><td>${[isL?"較長邊界":"",isS?"較短邊界":""].filter(Boolean).join("、")}</td></tr>`;}).join("")}</table></div>
    <h3 style="font-size:16px;margin:16px 0 6px">工作表 5：演算法 I 的參數解法（T=7）</h3>
    <p class="note">令 x₂、x₄ 為自由變數：x₁ = 7 − x₂、x₅ = 7 − x₄、x₃ = 7 − x₁ − x₅。9 組中只有落在 [l,u] 範圍內的才有效。</p>
    <div class="tbl"><table><tr><th>x₂</th><th>x₄</th><th>X</th><th>範圍內？</th><th>B(X)</th></tr>${sheet5.map(r=>`<tr class="${r.ok?"yes":"no"}"><td>${r.x[1]}</td><td>${r.x[3]}</td><td class="mono">${vec(r.x)}</td><td>${r.ok?"是":"否"}</td><td class="mono">${r.c}</td></tr>`).join("")}</table></div>
    <div class="qitem" style="margin-top:12px"><div class="qq">研究型思考題：論文的演算法 I 要求「每條路徑剛好等於 T」，在某些網路會漏解（見 P6 站點）。實驗室的 <span class="mono">UpperBoundary.m</span> 改成讓<b>虛擬工期</b>可以超過上限、算完再截回上限。為什麼這個技巧能補上漏洞？</div>
      <details class="proof"><summary>想好再看</summary><div>漏解發生在某條路徑「全部拉到上限也到不了 T」的時候。虛擬工期允許超過上限，讓這條路徑在虛擬空間裡仍能剛好等於 T，截回上限後就對應到「這條路徑上的活動都已達上限」。本儀表板以窮舉驗證：在 P6 的反例中，程式邏輯找到全部 3 個較長邊界向量，論文的演算法 I 只找到 1 個；在這個例子的 6 組 (T,B) 下，程式的 <span class="mono">Project_reliability</span> 公式也都和窮舉的真實機率一致。</div></details></div>
    <div class="row" style="margin-top:12px">${xlsxBtn("論文6_JORSJ_練習.xlsx")}</div>`;
  }else{
    const d=D(); if(!d){body=NODATA;}else{
      const q=d.qp, on=new Set(q.paths.flat()), Lm=q.cap.map((c,i)=>on.has(i+1)?c:0);
      const lead=q.paths.map(p=>p.reduce((s,a)=>s+q.lead[a-1],0));
      const r=q.X[pst.qpRow], x=r.slice(0,32), cost=x.reduce((s,v,i)=>s+q.cost[i]*(Lm[i]-v),0);
      const over=q.X.filter(row=>row[32]>20000).length;
      body=`<p>這是實驗室研究用的資料（<span class="mono">程式資料.xlsx</span>）：32 弧網路，取 4 條 MP 同時傳送，需求 d=128、時間 T=20、預算 B=20000，對應 <span class="mono">FourQP.m</span>（四條路徑分流，延伸自論文 7、8）與 <span class="mono">BB.m / branch.m</span>（預算分支）。</p>
      <div class="tbl"><table><tr><th>MP</th><th>弧</th><th>前置時間合計</th></tr>${q.paths.map((p,j)=>`<tr><td>P${j+1}</td><td class="mono" style="white-space:normal">{${p.map(a=>"a"+a).join(", ")}}</td><td class="mono">${lead[j]}</td></tr>`).join("")}</table></div>
      <div class="qitem" style="margin-top:12px"><div class="qq">成本是怎麼算的？表格 X(d=128,t=20) 有 38 個候選，每個都附有 COST。選一列，先自己猜公式。</div>
        <div class="row"><label class="note">候選列 <select id="qpRow" style="width:auto">${q.X.map((row,i)=>`<option value="${i}" ${i===pst.qpRow?"selected":""}>#${i+1}（COST ${row[32]}）</option>`).join("")}</select></label></div>
        <p class="mono" style="font-size:13px;overflow-wrap:anywhere">X = ${vec(x)}</p>
        <details class="proof"><summary>揭曉公式</summary><div>COST = Σ c<sub>i</sub> (L<sub>i</sub> − x<sub>i</sub>)，L<sub>i</sub> 是「在任一 MP 上的弧」的最大容量，不在路徑上的弧記為 0，對應 <span class="mono">BB.m</span> 註解中的 L。這一列算出 <b class="mono">${cost}</b>，Excel 為 <b class="mono">${r[32]}</b>（${cost===r[32]?"一致":"不一致"}）。本儀表板驗證過 38 列全部一致。<br><b>注意：</b><span class="mono">COST.m</span> 的參數名稱是 M，但這份資料實際傳入的是 L（只算路徑上的弧）。若傳入全部弧的最大容量 M，38 列都會對不上。</div></details></div>
      <div class="qitem" style="margin-top:12px"><div class="qq">x 越大，COST 越小。38 個候選中有 ${over} 個超過預算 20000。<span class="mono">BB.m</span> 怎麼處理超過預算的向量？</div>
        <details class="proof"><summary>想好再看</summary><div>對每個超預算向量 Y，嘗試每個弧 j：Z = Y + e<sub>j</sub>（若不超過 L<sub>j</sub>），每加 1 會讓成本下降 c<sub>j</sub>。<span class="mono">branch_finder.m</span> 反覆執行這個分支，直到全部落在預算內，最後用 dMPs 保留極小者。工作表 branch_dmps 列出了 ${q.branch.length} 個結果，最高成本剛好是 20000。<br>延伸問題：為什麼「增加容量」會讓成本「下降」？請試著從研究問題的情境解釋 c<sub>i</sub>(L<sub>i</sub> − x<sub>i</sub>) 的意義（例如：未被使用或釋出的容量的成本），並和指導老師確認。</div></details></div>
      <div class="row" style="margin-top:12px">${xlsxBtn("程式資料_QP_d128_T20_B20000.xlsx")}</div>`;}
  }
  v.innerHTML=`<div class="eyebrow">練習題 · 來自實驗室的 Excel 練習檔</div><h1 style="font-size:clamp(22px,3vw,30px);margin:4px 0 6px">先動手算，再對答案</h1>
    <p class="note" style="max-width:70ch">每個練習都先請你自己判斷或計算，再揭曉。數值由本頁重新計算，並與 Excel／論文交叉驗證。</p>
    <div class="steps" role="group" aria-label="練習" style="margin-top:12px">${tabs.map(t=>`<button type="button" data-ex="${t[0]}" aria-pressed="${ex===t[0]}">${t[1]}</button>`).join("")}</div>
    <div class="card" style="min-width:0">${body}</div>`;
  v.querySelectorAll("[data-ex]").forEach(b=>b.onclick=()=>{pst.ex=b.dataset.ex;pst.step=pst.ex==="rsdp1"?1:3;renderPractice();});
  wireUnlock(v,renderPractice);
  v.querySelectorAll("[data-pstep]").forEach(b=>b.onclick=()=>{pst.step=+b.dataset.pstep;renderPractice();});
  wireXlsx(v);
  const ix=$("#inclX2"); if(ix) ix.onchange=()=>{pst.inclX2=ix.checked;renderPractice();};
  if(ex==="rsdp1"){
    $("#svChk").onclick=()=>{const want=[1,.95,.85,.6];const got=want.map((_,k)=>parseFloat($("#sv"+k).value));
      const ok=got.every((g,k)=>Math.abs(g-want[k])<1e-6);
      $("#svFb").innerHTML=`<div class="fb ${ok?"ok":"no"}">${ok?"正確：(1, 0.95, 0.85, 0.6)。注意 k=0 永遠是 1。":"還不對。提示：Pr{x ≥ k} = 1 − (容量小於 k 的機率總和)。"}</div>`;};
    $("#ex1opts").querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;
      $("#ex1opts").querySelectorAll(".opt").forEach(o=>o.classList.remove("right","wrong"));
      b.classList.add(i===1?"right":"wrong");
      $("#ex1fb").innerHTML=`<div class="fb ${i===1?"ok":"no"}">${i===1?"正確。X³=(2,2,0,0,1,1) &lt; X²=(2,2,1,1,1,1)，X² 在 a₃、a₄ 上多繞了一圈（橋的兩個方向）。":"再想想：找一個「比另一個候選每一維都大」的向量。"}</div>`;});
  }
  if(ex==="rsdp3"){
    const sel=new Set();
    $("#ex3opts").querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;sel.has(i)?sel.delete(i):sel.add(i);b.style.borderColor=sel.has(i)?"var(--accent)":"";});
    $("#ex3chk").onclick=()=>{const right=minimalUniq(EX3.X).map(m=>EX3.X.findIndex(x=>x.join()===m.join()));const ok=right.length===sel.size&&right.every(i=>sel.has(i));
      $("#ex3fb").innerHTML=ok?"正確：只有 X1 和 X2 是下邊界點，其他 4 個都至少大於其中一個。":`還不對（你選了 ${sel.size} 個）。提示：拿每個候選和 X1、X2 逐維比較。`;};
  }
  if(ex==="proj"){
    $("#pjT").onchange=e=>{pst.T=+e.target.value;pst.showLong=pst.showShort=false;renderPractice();};
    $("#pjB").onchange=e=>{pst.B=+e.target.value;pst.showLong=pst.showShort=false;renderPractice();};
    $("#showLong").onclick=()=>{pst.showLong=!pst.showLong;renderPractice();};
    $("#showShort").onclick=()=>{pst.showShort=!pst.showShort;renderPractice();};
  }
  if(ex==="qp"&&$("#qpRow")) $("#qpRow").onchange=e=>{pst.qpRow=+e.target.value;renderPractice();};
}

/* ---------- 程式教學 ---------- */
const GROUPS=[
 ["core","核心：比較、去重與聯集機率","所有 d-MP／d-MC 論文都會用到的共同零件。"],
 ["proj","專案網路（論文 6）","較長／較短邊界工期向量與專案可靠度，分為窮舉版與遞迴版。"],
 ["qp","最快路徑與預算（論文 7、8 的延伸）","單一路徑、兩條、四條 MP 分流，以及超出預算時的分支調整。"],
 ["other","其他研究主題（不在九篇範圍內）","製造系統的重工與良率、緩衝區、模糊需求。這裡只做簡介。"]
];
const NOTES={
 "MATLAB/RSDP.m":{g:"core",paper:"P1–P5、P9 的「聯集機率」步驟（P9 明確使用 RSDP）",
  what:"以遞迴不交積和（RSDP）計算 Pr{∪{X ≥ X<sup>i</sup>}}，也就是由 d-MP 求可靠度 R<sub>d</sub>。",
  io:"輸入：solutions（q×n，每列一個 d-MP）、num_solutions、arcs_n、asign_pmf（n×(M+1)，第 (i,k+1) 格 = Pr{x<sub>i</sub> ≥ k}）。輸出：系統可靠度。",
  walk:["第一個 d-MP 直接相乘：Π Pr{x<sub>i</sub> ≥ X<sup>1</sup><sub>i</sub>}","對第 i 個 d-MP：R_temp1 = Pr{X ≥ X<sup>i</sup>}","Y_temp：把 X<sup>i</sup> 和前面每個 X<sup>j</sup> 逐維取 max，代表 {X ≥ X<sup>i</sup>} ∩ {X ≥ X<sup>j</sup>}","呼叫 dMPs 去掉非極小者後<b>遞迴</b>呼叫 RSDP，得到「X ≥ X<sup>i</sup> 且 ≥ 某個前面的 X<sup>j</sup>」的機率","Reliability += R_temp1 − R_temp2：只加上新增的不交部分"],
  pit:["需要 dMPs.m，但原資料夾中<b>沒有這支檔案</b>。本頁補上了依 dMCs.m 改寫的版本。","asign_pmf 必須是<b>存活函數</b>，不是機率質量函數（Excel 練習的步驟 1 就是在做這個轉換）。","用 <span class='mono'>solutions(…)+1</span> 當索引，表示容量必須是連續整數 0,1,…,M。容量水準不連續時（論文 7、9）要先轉成索引。"],
  think:"把 RSDP 的遞迴寫成數學式，並證明各項彼此不交。它和排容原理的項數各是多少？"},
 "MATLAB/RSDP_MC.m":{g:"core",paper:"P2、P5 與專案網路的上邊界版本",
  what:"RSDP 的對偶版：計算 Pr{∪{X ≤ X<sup>i</sup>}}。交集改為逐維取 <b>min</b>，機率改用累積分配 Pr{x ≤ v}。",
  io:"輸入的 asign_pmf 是 CDF（由 distribution.m 產生）；Activity_duration 用來把「值」對應到「欄位索引」。",
  walk:["用 find(Activity_duration(:,i) == 值) 找欄位，因此支援不連續的值（例如工期 2、3、4）","交集為 min(solutions(i,:), solutions(j,:))","去重時呼叫 dMCs（保留極大）"],
  pit:["值必須正好出現在 Activity_duration 中，否則 find 會回傳空集合而出錯。"],
  think:"為什麼上邊界要用 min、要保留極大？試著用「下集（down-set）」的語言說明。"},
 "MATLAB/dMCs.m":{g:"core",paper:"所有論文的「去除非極大／去重」步驟",
  what:"保留極大向量並去除重複：若 X(i) ≤ 另一個不同的向量，就淘汰 X(i)。",
  io:"輸入候選矩陣與數量，輸出極大且不重複的向量。",
  walk:["雙層迴圈兩兩比較，時間 O(q²·n)","MATLAB 的 <span class='mono'>if 向量</span> 等於 all(…)：X(i,:) <= X(j,:) 為真代表每一維都 ≤","相等時先保留，最後的迴圈再去重"],
  pit:["函式名叫 dMCs，但也被專案網路程式拿來用。對專案網路來說，它保留的是「工期極大」的向量。"],
  think:"這個兩兩比較法在 q 很大時會變慢。你能想到更快的做法嗎？（提示：先依總和排序）"},
 "MATLAB/dMPs.m（補上）":{g:"core",paper:"P1、P3、P4、P7、P8、P9 的「去除非極小」步驟",
  what:"本儀表板依 dMCs.m 補寫的對偶版：保留極小向量。原資料夾沒有這支檔案，RSDP.m 等多支程式卻都會呼叫它。",
  io:"與 dMCs.m 相同。",walk:["只把比較方向從 <= 改成 >="],pit:["這是補寫的版本，正式使用前請和實驗室原本的版本比對。"],think:"為什麼 d-MP 要保留極小、d-MC 要保留極大？"},
 "MATLAB/RSDPSA.m":{g:"core",paper:"敏感度分析：P3、P5、P7 結論中提到的「找出最重要的元件」",
  what:"把某個弧 p_arc 設為完美（它在各 d-MP 上要求的容量機率設為 1），再計算可靠度。和原本的可靠度相比，就能衡量這個弧的重要度。",
  io:"多一個參數 p_arc。",walk:["只在 solutions 中出現過的值上把機率設為 1","遞迴時取 max，結果仍然是其中一個 solution 的值，所以設定一路都有效"],
  pit:["遞迴呼叫的是 RSDP 而不是 RSDPSA，但修改過的 asign_pmf 會一路傳下去，所以結果正確。"],think:"「完美」的重要度和 Birnbaum 重要度有什麼關係？"},
 "MATLAB/distribution.m":{g:"core",paper:"上邊界計算的前處理",what:"把機率質量轉成累積分配 CDF，供 RSDP_MC 使用。",io:"輸入 Activiy_probability（狀態×活動），輸出 Activiy_CDF（活動×狀態）。",walk:["逐列累加"],pit:["輸入矩陣是「狀態×活動」，輸出卻是「活動×狀態」，方向相反，要特別留意。"],think:""},
 "MATLAB/pmf_gen.m":{g:"core",paper:"P9 的二項分配容量（多條實體線組成一條傳輸線）",what:"由每條實體線的成功率 p 與相關係數 ro，產生弧容量的存活函數。ro=0 時就是二項分配。",io:"輸出 pmf(j, i+1) = Pr{x<sub>j</sub> ≥ i}。",walk:["β = 1 + ρ(1−p)/p，做相關修正","pmf_temp 為各容量的機率，翻轉後累減成存活函數"],pit:["combntns 是舊函式，新版 MATLAB 請改用 nchoosek(cap, i)。"],think:"驗證：ro=0、cap=3、p=0.9 時，是否得到 P9 表 1 的 0.001／0.027／0.243／0.729？"},
 "MATLAB/Project_reliability.m":{g:"proj",paper:"P6 延伸：完工機率（論文的未來研究）",what:"專案可靠度 = Pr{∪{X ≤ 上界}} − Pr{∪{X ≤ 下界}} + Σ Pr{X = 下界}。",io:"輸入期限、預算、路徑矩陣、各活動的成本／工期／機率表。",walk:["上界（較長邊界）以下是「時間可行」的區域","減掉下界（較短邊界）以下的區域（太快、太貴），但下界本身可行，所以再加回 Σ Pr{X = 下界}"],
  pit:["本儀表板以論文 6 的資料加上假設機率，在 6 組 (T,B) 下驗證：結果都和窮舉一致。","這個公式依賴「工期每加 1，成本就減 1」的結構，換成其他成本函數時要重新檢查。"],think:"證明：在單位成本斜率下，{X ≤ 某個下界} 與 {X ≥ 某個下界} 的交集恰好是那些下界點本身。"},
 "MATLAB/UpperBoundary.m":{g:"proj",paper:"P6 演算法 I（較長邊界），窮舉版",what:"以「虛擬工期」窮舉：每一維從最短工期到 T，保留每條路徑虛擬和剛好等於 T 的向量，再截回可用的工期、檢查預算，最後保留極大者。",io:"",walk:["虛擬工期可以<b>超過上限</b>，截回時取 ≤ 虛擬值的最大可用工期","這個技巧補上了論文演算法 I 在 M(P<sub>j</sub>) &lt; T 時的漏解（本儀表板已驗證）"],pit:["窮舉範圍是 (T − l + 1)<sup>n</sup>，活動一多就爆炸，因此有遞迴版。"],think:"為什麼截回上限後，向量仍然是「時間可行」的？"},
 "MATLAB/LowerBoundary.m":{g:"proj",paper:"P6 演算法 II（較短邊界），窮舉版",what:"窮舉虛擬成本向量，總和剛好等於預算 B，轉成實際成本與工期，再檢查 T(X) ≤ T。",io:"",walk:["成本轉換：找第一個 ≤ 虛擬成本的成本水準","最後呼叫 dMCs（保留極大）"],pit:["遞迴版的 LowerPr.m 保留的是<b>極小</b>工期（用 >= 比較）。兩版做法不同：在單位成本斜率下所有 B(X)=B 的向量互不可比，所以結果相同；換成其他成本結構時就可能不同。"],think:"什麼樣的成本表會讓兩個版本得到不同結果？"},
 "MATLAB/Find_vector.m":{g:"proj",paper:"驗證基準（窮舉全部組合）",what:"窮舉所有工期組合，挑出同時滿足期限與預算的向量。",io:"",walk:["combination 是各活動的狀態索引，用「代值演算法」像里程表一樣進位"],pit:["成本在路徑迴圈內被重複加了 mps 次，最後再除以 mps。結果正確，但寫法容易出錯。"],think:"把成本計算移到路徑迴圈外面，改寫得更清楚。"},
 "MATLAB/Main_Project.m":{g:"proj",paper:"驗證基準的主程式",what:"呼叫 Find_vector 與 ProbCalculation，以窮舉加總機率得到精確的專案可靠度，可用來檢驗邊界向量法。",io:"",walk:[],pit:["CPU 時間用 clock 相減換算，月份以 365/12 天近似。建議改用 tic/toc。"],think:""},
 "MATLAB/ProbCalculation.m":{g:"proj",paper:"驗證基準",what:"把所有可行向量的機率加總，並找出機率最高的單一排程。",io:"",walk:[],pit:[],think:"「最可能的可行排程」在管理上有什麼用途？"},
 "MATLAB/找上下界用遞迴/UpperPr.m":{g:"proj",paper:"P6 演算法 I，遞迴版",what:"逐條路徑用遞迴列舉「z₁+…+z<sub>k</sub> = 剩餘時間」的非負整數解，已在前面路徑中決定的活動會被帶入後面的路徑。",io:"",walk:["先做平移：z<sub>i</sub> ≥ l<sub>i</sub> 改成 z<sub>i</sub>' = z<sub>i</sub> − l<sub>i</sub> ≥ 0","共用活動：把前面路徑已決定的值扣掉，剩餘的才遞迴","最後截回可用工期、檢查預算、保留極大"],pit:["Minimal_path 的列長不一，用 0 補齊後再刪除，要注意索引。"],think:"這種逐條路徑帶入共用變數的做法，等同於哪一種搜尋樹策略？"},
 "MATLAB/找上下界用遞迴/LowerPr.m":{g:"proj",paper:"P6 演算法 II，遞迴版",what:"以遞迴列舉 Σ 成本 = B 的解（先扣掉最低成本），轉成工期並檢查期限，保留極小者，同時回傳 Σ Pr{X = 下界}。",io:"",walk:[],pit:["<span class='mono'>if Paths(t,i) == i</span> 假設路徑矩陣的第 i 欄存的是「弧編號 i」，而不是 0/1。換成 0/1 格式就會出錯。"],think:""},
 "MATLAB/找上下界用遞迴/UpperBoundary.m":{g:"proj",paper:"遞迴核心",what:"把 a+b+c=n 的列舉寫成遞迴（隔板法），這就是隱式枚舉最基本的形式。",io:"",walk:["前 k−1 個變數逐一嘗試 0…剩餘值，最後一個變數直接等於剩餘值"],pit:[],think:"這樣的解共有幾個？（C(n+k−1, k−1)）"},
 "MATLAB/找上下界用遞迴/LowerBoundary.m":{g:"proj",paper:"遞迴核心",what:"與上一支相同的遞迴，用於成本向量。",io:"",walk:[],pit:[],think:""},
 "MATLAB/找上下界用遞迴/Project_reliability.m":{g:"proj",paper:"遞迴版主程式",what:"與窮舉版公式相同，改呼叫 UpperPr 與 LowerPr。",io:"",walk:[],pit:[],think:"比較兩版在 10、15、20 個活動時的 CPU 時間。"},
 "MATLAB/QP.m":{g:"qp",paper:"P7（單一 MP 的最快路徑）",what:"對每條 MP 求能在 T 內送完 d 的最小容量 v，產生下邊界點候選，再以 dMPs 去非極小。",io:"paths 的每個元素是<b>弧編號</b>（0 代表沒有）；T 是各弧的前置時間。",walk:["path_capacity：路徑上的最小容量","sum_T + demand/ca ≤ T_constrain：由小到大找第一個可行的 ca"],pit:["<b>和論文 7 不同</b>：論文用 ⌈d/v⌉（傳送時間以整數單位計），這裡用 demand/ca（連續時間）。兩者在邊界附近會得到不同的 v。","X 直接設為 v，沒有「進位到下一個可用容量水準」，等於假設容量是連續整數。","不可行的路徑會放入全部為 100 的向量；若它沒被淘汰，之後 RSDP 用 +1 當索引時會超出範圍。"],think:"把 demand/ca 改成 ceil(demand/ca)，用論文 7 的例子比較 R<sub>8,9</sub>。"},
 "MATLAB/DQP.m":{g:"qp",paper:"P8（兩條 MP 分流）",what:"列舉 d₁ + d₂ = d 的所有拆分，各自對一條路徑呼叫 QP，再把兩個向量相加。",io:"",walk:["d₁ 從 0 到 d 逐一嘗試","X = X1 + X2：兩條路徑不相交，所以直接相加"],pit:["沒有預算檢查（論文 8 有）；預算由 BB.m／branch.m 另外處理。","以 1 為單位拆分。論文 8 以 10 為單位以減少計算量。"],think:"若兩條路徑共用某個弧，X1 + X2 還對嗎？"},
 "MATLAB/FourQP.m":{g:"qp",paper:"P8 的延伸（四條 MP，兩組成對）",what:"先把 d 拆給兩組路徑（各呼叫 DQP），再組合所有 X1 + X2。",io:"",walk:["三層列舉：組間拆分 × 組內拆分","結果數量可能非常多，最後用 dMPs 去非極小"],pit:["X1、X2 都是多列矩陣，組合時是笛卡兒積，數量會成倍增加。"],think:"總計算量大約是 d 的幾次方？"},
 "MATLAB/BB.m":{g:"qp",paper:"預算限制下的調整（延伸自 P5、P8）",what:"把候選分成超預算與預算內兩組。超預算的向量對每個弧嘗試 +1（不超過 L），讓成本下降。",io:"成本 = Σ c<sub>i</sub>(L<sub>i</sub> − x<sub>i</sub>)，見 COST.m。",walk:["Z = Y_over + e<sub>j</sub>，若 Z(j) ≤ L(j) 就保留","合併後用 dMPs 去非極小"],pit:["一次只加 1，所以要由 branch_finder 反覆呼叫。"],think:""},
 "MATLAB/branch.m":{g:"qp",paper:"預算分支主程式",what:"對每個候選呼叫 branch_finder，合併後去非極小。",io:"",walk:[],pit:[],think:""},
 "MATLAB/branch_finder.m":{g:"qp",paper:"預算分支",what:"反覆呼叫 BB，次數為 sum(L − X + 1)，直到所有分支都落在預算內。",io:"",walk:[],pit:["迴圈次數是保守上界，可能做很多次多餘的 BB。"],think:"能不能在全部都落在預算內時就提早停止？"},
 "MATLAB/COST.m":{g:"qp",paper:"成本函數",what:"cost = Σ c<sub>i</sub>(M<sub>i</sub> − x<sub>i</sub>)。",io:"",walk:[],pit:["參數名稱是 M，但「程式資料.xlsx」的 COST 欄實際上是用 L（只計路徑上的弧）算出來的，本儀表板已驗證 38 列全部一致。呼叫時請傳入 L。"],think:""},
 "MATLAB/CN.m":{g:"qp",paper:"工具",what:"回傳矩陣的列數（候選數）。",io:"",walk:[],pit:[],think:""},
 "MATLAB/CA.m":{g:"qp",paper:"工具",what:"回傳矩陣的欄數（弧數）。",io:"",walk:[],pit:[],think:""},
 "MATLAB/Dassign.m":{g:"qp",paper:"未完成",what:"看起來是要列舉三條路徑的需求分配，但 d2、d3 未定義，<b>無法執行</b>。",io:"",walk:[],pit:["這是未完成的草稿。"],think:""}
};
const OTHER_DESC="製造系統的延伸研究：把生產線視為多狀態網路，工作站有良率 p，第 r 站失敗時回到第 r−k 站重工。main.m 的流程：indeter 求投入量、mudeter／mudetern 以二分法求目標系統良率、nyield 系列反推各工作站需要的良率。SRK／DRK 分別是單一與兩個重工點的流量計算；buff_* 與 simu_buffer 處理工作站間的緩衝區與蒙地卡羅模擬；Fuzzy* 處理模糊需求下的系統可靠度（Einstein、代數積、Dubois–Prade、Yager 等 t-norm）。";
let cst={file:"MATLAB/RSDP.m"};

function hl(src){
  const kw=/\b(function|end|if|else|elseif|for|while|break|return|switch|case|otherwise)\b/g;
  return src.split("\n").map((line,i)=>{
    let code=line, cm=""; const k=line.indexOf("%"); if(k>=0){code=line.slice(0,k);cm=line.slice(k);}
    code=esc(code).replace(kw,'<b class="kw">$1</b>');
    return `<span class="ln">${i+1}</span>${code}${cm?`<span class="cm">${esc(cm)}</span>`:""}`;}).join("\n");
}
function renderCode(){
  const v=$("#v-code"), d=D();
  if(!d){v.innerHTML=`<div class="eyebrow">程式教學</div><h1 style="font-size:28px;margin:4px 0 10px">從論文到程式</h1>`+NODATA;wireUnlock(v,renderCode);return;}
  const files=Object.keys(d.code);
  const grp=f=>(NOTES[f]&&NOTES[f].g)||"other";
  const n=NOTES[cst.file]||{g:"other",paper:"其他研究主題",what:OTHER_DESC,io:"",walk:[],pit:[],think:""};
  v.innerHTML=`<div class="eyebrow">程式教學 · ${files.length} 支 MATLAB 程式</div><h1 style="font-size:clamp(22px,3vw,30px);margin:4px 0 6px">從論文到程式</h1>
  <p class="note" style="max-width:72ch">每支程式都標出它對應哪一篇論文的哪一個步驟、輸入輸出的格式，以及需要注意的地方。讀程式時，先找出「候選產生 → 比較去重 → 聯集機率」三段，再對照論文的演算法。</p>
  <div class="card" style="margin:12px 0"><h3>先讀這裡：實驗室程式的三個資料格式約定</h3><ol style="margin:.4em 0;padding-left:1.3em">
    <li><b>路徑矩陣存的是弧編號</b>：第 j 列第 i 欄的值是 i（不在路徑上則為 0），不是 0/1。QP.m 的 <span class="mono">T(paths(k,l))</span>、LowerPr.m 的 <span class="mono">Paths(t,i)==i</span> 都依賴這個約定。</li>
    <li><b>機率表有兩種</b>：下邊界（RSDP）用存活函數 Pr{x ≥ k}，上邊界（RSDP_MC）用累積分配 Pr{x ≤ k}。</li>
    <li><b>索引 = 容量 + 1</b>：MATLAB 從 1 開始編號，容量從 0 開始。容量水準不連續時要先轉成索引。</li></ol>
    <div class="row" style="margin-top:8px"><button class="btn solid" type="button" id="zipAll">下載全部程式（.zip）</button><span class="note dlmsg" id="zipMsg"></span></div></div>
  <div class="lab-grid">
    <nav class="card ctrl" aria-label="程式列表" style="max-height:640px;overflow:auto">${GROUPS.map(g=>`<div><div class="eyebrow" style="margin:4px 0">${g[1]}</div>${files.filter(f=>grp(f)===g[0]).map(f=>`<button type="button" class="pill" data-file="${esc(f)}" style="display:block;width:100%;text-align:left;margin:3px 0;${f===cst.file?"border-color:var(--accent);color:var(--accent)":""}">${esc(f.replace("MATLAB/",""))}</button>`).join("")}</div>`).join("")}</nav>
    <div style="min-width:0;display:grid;gap:14px">
      <div class="card"><div class="eyebrow">${esc(n.paper)}</div><h2 style="font-size:20px;margin:4px 0 8px" class="mono">${esc(cst.file.replace("MATLAB/",""))}</h2>
        <p>${n.what}</p>${n.io?`<p class="note">${n.io}</p>`:""}
        ${n.walk.length?`<h3 style="font-size:15px;margin-top:8px">逐段說明</h3><ol class="algo">${n.walk.map(w=>`<li><span>${w}</span></li>`).join("")}</ol>`:""}
        ${n.pit.length?`<h3 style="font-size:15px;margin-top:8px">注意事項</h3><ul class="edge">${n.pit.map(w=>`<li>${w}</li>`).join("")}</ul>`:""}
        ${n.think?`<div class="qitem" style="margin-top:8px"><div class="qq">思考題：${n.think}</div></div>`:""}
        <div class="explain" style="margin-top:10px"><span class="lbl">請 AI 助教：</span><button class="pill" type="button" data-ai="line">逐行解釋</button><button class="pill" type="button" data-ai="map">對應論文步驟</button><button class="pill" type="button" data-ai="bug">找潛在問題</button><button class="pill" type="button" data-ai="py">改寫成 Python</button></div><div id="codeAi"></div></div>
      <div class="card" style="min-width:0"><div class="row" style="justify-content:space-between"><b class="mono">原始碼</b><span class="row"><button class="btn" type="button" id="copyCode">複製</button><span class="note" id="copyMsg"></span></span></div>
        <pre class="code" id="codePre">${hl(d.code[cst.file])}</pre></div>
    </div></div>
  <div class="card" style="margin-top:16px"><h3>研究工具</h3><p class="note">同一個壓縮檔中的研究寫作工具（APA 簡報已轉成 PDF）。</p>
    <div class="row" style="margin-top:8px"><button class="btn" type="button" data-tool="tools/EndNote_quick_start.pdf">EndNote 基礎快速上手（PDF）</button><button class="btn" type="button" data-tool="tools/APA_thesis_structure.pdf">論文架構與 APA 格式（PDF）</button><span class="note dlmsg"></span></div></div>`;
  v.querySelectorAll("[data-file]").forEach(b=>b.onclick=()=>{cst.file=b.dataset.file;renderCode();document.getElementById("codePre").scrollTop=0;});
  $("#copyCode").onclick=async()=>{try{await navigator.clipboard.writeText(d.code[cst.file]);$("#copyMsg").textContent="已複製";}catch(e){const r=document.createRange();r.selectNodeContents($("#codePre"));const s=getSelection();s.removeAllRanges();s.addRange(r);$("#copyMsg").textContent="已選取，請按 Ctrl/Cmd+C";}};
  $("#zipAll").onclick=async()=>{const m=$("#zipMsg");if(!window.JSZip){m.textContent="壓縮元件沒有載入，請重新整理後再試。";return;}
    const z=new JSZip();Object.entries(d.code).forEach(([k,s])=>z.file(k.replace("（補上）","_added_by_dashboard"),s));m.textContent="壓縮中…";
    const blob=await z.generateAsync({type:"blob"});save("MATLAB_reliability_code.zip",blob,m);};
  v.querySelectorAll("[data-tool]").forEach(b=>b.onclick=async()=>{const m=b.parentElement.querySelector(".dlmsg");try{m.textContent="準備檔案中…";save(b.dataset.tool.split("/").pop(),await window.VAULT.fetchBlob(b.dataset.tool),m);}catch(e){m.textContent=window.VAULT.errText(e);}});
  v.querySelectorAll("[data-ai]").forEach(b=>b.onclick=()=>codeAI(b.dataset.ai,b.textContent,n));
}
async function codeAI(kind,label,n){
  const out=$("#codeAi"); const src=D().code[cst.file];
  out.innerHTML=`<div class="ai-out"><div class="h">${esc(label)} · ${esc(cst.file)}</div><div class="body">思考中…</div></div>`; const body=out.querySelector(".body");
  const task={line:"逐段（不必每一行）解釋這支 MATLAB 程式在做什麼，特別說明變數的意義、迴圈與遞迴的目的。",
    map:"說明這支程式對應到哪篇論文、演算法的哪一步，以及程式和論文的寫法有哪些差異。",
    bug:"以嚴謹的程式審查角度，找出潛在的錯誤、邊界情況、效能問題，或與論文定義不一致的地方，並給出具體的修正建議。不要捏造不存在的問題，不確定時要說明。",
    py:"把這支程式改寫成清楚、可讀、加上中文註解的 Python（使用 numpy），並說明索引從 0 開始時要修改哪些地方。"}[kind];
  const prompt=`你是研究所導師，指導碩博士生閱讀「多狀態流量網路可靠度」實驗室的 MATLAB 程式。一律用繁體中文（台灣用語），數學用 Unicode，不用 LaTeX。格式：短段落、- 項目符號、**粗體**；程式碼用 \`行內\` 表示，Python 改寫可以用多行（每行之前加四個空格）。
背景筆記：${strip(n.paper)}；${strip(n.what)}；注意事項：${n.pit.map(strip).join("；")}
實驗室約定：路徑矩陣存的是弧編號；RSDP 用存活函數 Pr{x≥k}，RSDP_MC 用 CDF；索引 = 容量 + 1。
任務：${task}

檔名：${cst.file}
\`\`\`matlab
${src}
\`\`\``;
  try{ await window.AI.ask(prompt,{onText:({text})=>{body.innerHTML=mdLite(text);}}); }
  catch(e){ body.textContent=window.AI.errText(e); }
}
function strip(h){return String(h).replace(/<[^>]+>/g,"");}
function mdLite(t){
  const lines=esc(t).split("\n");let out="",list=false,pre=false,ind=false;
  const PRE='<pre class="code" style="max-height:none">';
  for(const raw of lines){
    if(/^\s*```/.test(raw)){if(ind){out+="</pre>";ind=false;}out+=pre?"</pre>":PRE;pre=!pre;continue;}
    if(pre){out+=raw+"\n";continue;}
    if(/^ {4}/.test(raw)){if(list){out+="</ul>";list=false;}if(!ind){out+=PRE;ind=true;}out+=raw.slice(4)+"\n";continue;}
    if(ind){out+="</pre>";ind=false;}
    const l=raw.trim(), m=l.match(/^[-•*]\s+(.*)|^\d+[.)、]\s+(.*)/);
    const inl=s=>s.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/`([^`]+)`/g,"<code>$1</code>");
    if(m){if(!list){out+="<ul>";list=true;}out+=`<li>${inl(m[1]||m[2])}</li>`;continue;}
    if(list){out+="</ul>";list=false;} if(l) out+=`<p>${inl(l)}</p>`;
  }
  if(list)out+="</ul>"; if(pre||ind)out+="</pre>"; return out;
}

/* ---------- 下載區 ---------- */
async function renderFiles(){
  const v=$("#v-files"); const m=await window.VAULT.getManifest();
  const plainCode=!!D();
  const groups={};(m?m.files:[]).filter(f=>f.group!=="_data").forEach(f=>{(groups[f.group]=groups[f.group]||[]).push(f);});
  const kb=n=>n>1048576?(n/1048576).toFixed(1)+" MB":Math.round(n/1024)+" KB";
  const locked=await window.VAULT.isLocked();
  v.innerHTML=`<div class="eyebrow">下載區 · 僅供實驗室內部使用</div><h1 style="font-size:clamp(22px,3vw,30px);margin:4px 0 6px">論文、程式與練習檔</h1>
  <p class="note" style="max-width:72ch">檔案以 AES-256 加密存放，第一次下載時會要求輸入密碼，同一個分頁之後不必再輸入。請勿將檔案或密碼轉傳給實驗室以外的人。</p>
  <div class="row" style="margin:10px 0">${locked?`<button class="btn solid" type="button" id="fUnlock">輸入密碼解鎖</button>`:`<span class="chip ms">已解鎖</span><button class="btn" type="button" id="fLock">鎖上</button>`}<span class="note dlmsg" id="fMsg"></span></div>
  ${m?Object.entries(groups).map(([g,fs])=>`<div class="card cl-group"><h3>${esc(g)}</h3>${fs.map(f=>`<div class="cl-item" style="align-items:center;justify-content:space-between"><span class="mono" style="overflow-wrap:anywhere">${esc(f.name)} <span class="note">${kb(f.size)}</span></span><span class="row"><button class="btn" type="button" data-get="${esc(f.path)}">下載</button><span class="note dlmsg"></span></span></div>`).join("")}</div>`).join(""):`<div class="card"><p class="note">這個版本沒有附上加密檔案庫。</p></div>`}
  <div class="card cl-group"><h3>實驗室程式與練習</h3>
    <div class="cl-item" style="align-items:center;justify-content:space-between"><span>全部 MATLAB 程式（51 支，.zip）</span><span class="row"><button class="btn" type="button" id="fZip">下載</button><span class="note dlmsg"></span></span></div>
    ${["RSDP_MATLAB_practice.xlsx","論文6_JORSJ_練習.xlsx","程式資料_QP_d128_T20_B20000.xlsx"].map(n=>`<div class="cl-item" style="align-items:center;justify-content:space-between"><span class="mono">${esc(n)}</span><span class="row">${xlsxBtn(n,"下載")}<span class="note dlmsg"></span></span></div>`).join("")}</div>`;
  wireXlsx(v);
  const fu=$("#fUnlock"); if(fu) fu.onclick=async()=>{try{await window.VAULT.ensureUnlocked();renderFiles();}catch(e){$("#fMsg").textContent=window.VAULT.errText(e);}};
  const fl=$("#fLock"); if(fl) fl.onclick=()=>{window.VAULT.lock();if(!plainCode)window.PRACTICE_DATA=undefined;renderFiles();};
  v.querySelectorAll("[data-get]").forEach(b=>b.onclick=async()=>{const msg=b.parentElement.querySelector(".dlmsg");b.disabled=true;
    try{msg.textContent="解密中…";save(b.dataset.get.split("/").pop(),await window.VAULT.fetchBlob(b.dataset.get),msg);}catch(e){msg.textContent=window.VAULT.errText(e);}finally{b.disabled=false;}});
  $("#fZip").onclick=async()=>{const msg=$("#fZip").parentElement.querySelector(".dlmsg");
    try{const d=D()||await window.VAULT.loadPracticeData(); if(!window.JSZip){msg.textContent="壓縮元件沒有載入，請重新整理後再試。";return;}
      const z=new JSZip();Object.entries(d.code).forEach(([k,s])=>z.file(k.replace("（補上）","_added_by_dashboard"),s));msg.textContent="壓縮中…";save("MATLAB_reliability_code.zip",await z.generateAsync({type:"blob"}),msg);}
    catch(e){msg.textContent=window.VAULT.errText(e);}};
}

window.PRACTICE_VIEWS={practice:renderPractice,code:renderCode,files:renderFiles};
})();
