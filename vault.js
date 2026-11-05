/* 加密檔案庫：公開 repo 只放加密檔，輸入密碼後在瀏覽器內解密（AES-GCM-256，金鑰以 PBKDF2-SHA256 推導） */
(function(){
"use strict";
const KEYNAME="sfn-vault-key";
let manifest=null, key=null, pending=null;
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const toB64=u=>{let s="";new Uint8Array(u).forEach(b=>s+=String.fromCharCode(b));return btoa(s);};
const TYPES={pdf:"application/pdf",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",json:"application/json",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};

async function getManifest(){
  if(manifest) return manifest;
  try{const r=await fetch("vault/manifest.json",{cache:"no-cache"}); if(r.ok) manifest=await r.json();}catch(e){}
  return manifest;
}
async function decrypt(k,b64text){const u=b64(b64text.trim());return crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},k,u.slice(12));}
async function tryKey(k){const m=await getManifest();try{const t=new TextDecoder().decode(await decrypt(k,m.check));return t==="sfn-vault-ok";}catch(e){return false;}}

async function restore(){
  if(key) return true;
  let raw=null; try{raw=sessionStorage.getItem(KEYNAME);}catch(e){}
  if(!raw||!(await getManifest())) return false;
  try{const k=await crypto.subtle.importKey("raw",b64(raw),"AES-GCM",true,["decrypt"]); if(await tryKey(k)){key=k;return true;}}catch(e){}
  return false;
}
async function unlock(pw){
  const m=await getManifest(); if(!m) throw {code:"no_vault"};
  if(!window.crypto||!crypto.subtle) throw {code:"insecure"};
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  const k=await crypto.subtle.deriveKey({name:"PBKDF2",hash:m.kdf.hash,salt:b64(m.kdf.salt),iterations:m.kdf.iterations},base,{name:"AES-GCM",length:256},true,["decrypt"]);
  if(!(await tryKey(k))) throw {code:"wrong"};
  key=k; try{sessionStorage.setItem(KEYNAME,toB64(await crypto.subtle.exportKey("raw",k)));}catch(e){}
  document.dispatchEvent(new CustomEvent("vault-unlocked"));
}

/* 密碼視窗 */
function modal(){
  return new Promise((resolve,reject)=>{
    const wrap=document.createElement("div"); wrap.className="vault-scrim";
    wrap.innerHTML=`<form class="vault-box" role="dialog" aria-modal="true" aria-labelledby="vaultTitle">
      <h2 id="vaultTitle">輸入密碼以解鎖檔案</h2>
      <p class="note">論文原文、實驗室程式與練習檔已加密，僅供實驗室內部使用。密碼請向管理者索取，請勿外流。</p>
      <input type="password" id="vaultPw" autocomplete="current-password" placeholder="例如 XXXX-XXXX-XXXX-XXXX" aria-label="密碼">
      <div class="note" id="vaultMsg" aria-live="polite"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" id="vaultCancel">取消</button><button type="submit" class="btn solid" id="vaultGo">解鎖</button></div></form>`;
    document.body.appendChild(wrap);
    const pw=wrap.querySelector("#vaultPw"), msg=wrap.querySelector("#vaultMsg"), go=wrap.querySelector("#vaultGo");
    setTimeout(()=>pw.focus(),30);
    const close=()=>wrap.remove();
    wrap.querySelector("#vaultCancel").onclick=()=>{close();reject({code:"cancelled"});};
    wrap.addEventListener("keydown",e=>{if(e.key==="Escape"){close();reject({code:"cancelled"});}});
    wrap.querySelector("form").addEventListener("submit",async e=>{
      e.preventDefault(); if(!pw.value.trim()) return;
      go.disabled=true; msg.textContent="驗證中…（需要幾秒鐘）";
      try{await unlock(pw.value.trim().toUpperCase()); close(); resolve(true);}
      catch(err){go.disabled=false; msg.textContent=err.code==="wrong"?"密碼不正確，請再試一次。":err.code==="insecure"?"這個瀏覽器環境不支援解密，請用 https 或 localhost 開啟。":"找不到加密檔案庫。"; pw.select();}
    });
  });
}
async function ensureUnlocked(){
  if(await restore()) return true;
  if(!(await getManifest())) throw {code:"no_vault"};
  if(!pending) pending=modal().finally(()=>{pending=null;});
  return pending;
}
async function fileFromVault(path){
  const m=await getManifest(); const f=m&&m.files.find(x=>x.path===path); if(!f) throw {code:"missing"};
  await ensureUnlocked();
  const r=await fetch(f.enc); if(!r.ok) throw {code:"missing"};
  const buf=await decrypt(key,await r.text());
  const h=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",buf))).map(b=>b.toString(16).padStart(2,"0")).join("");
  if(h!==f.sha256) throw {code:"corrupt"};
  return new Blob([buf],{type:TYPES[path.split(".").pop()]||"application/octet-stream"});
}
/* 先找未加密的檔案（私人儀表板），找不到再用加密檔案庫（公開 repo） */
async function fetchBlob(path){
  try{const r=await fetch(path); if(r.ok){const ct=r.headers.get("content-type")||""; if(!ct.includes("text/html")) return await r.blob();}}catch(e){}
  return fileFromVault(path);
}
async function loadPracticeData(){
  if(window.PRACTICE_DATA) return window.PRACTICE_DATA;
  const blob=await fileFromVault("practice-data.json");
  window.PRACTICE_DATA=JSON.parse(await blob.text()); return window.PRACTICE_DATA;
}
const errText=e=>({cancelled:"已取消。",missing:"找不到這個檔案。",corrupt:"檔案驗證失敗（內容可能已損毀）。",no_vault:"這個版本沒有附上檔案。",wrong:"密碼不正確。"}[e&&e.code]||"無法取得檔案（"+((e&&e.code)||"錯誤")+"）。");
async function isLocked(){ if(window.PRACTICE_DATA) return false; return !(await restore()); }
function lock(){key=null;try{sessionStorage.removeItem(KEYNAME);}catch(e){}}

window.VAULT={getManifest,ensureUnlocked,fetchBlob,loadPracticeData,errText,isLocked,lock,restore};
})();
