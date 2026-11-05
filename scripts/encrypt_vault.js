#!/usr/bin/env node
/* 重新產生加密檔案庫 vault/（管理者使用）
 * 用法：VAULT_PASSWORD='XXXX-XXXX-XXXX-XXXX' node scripts/encrypt_vault.js <原始檔資料夾>
 * 原始檔資料夾的結構：
 *   pdf/*.pdf、pdf/*.pptx          論文原文與簡報
 *   tools/*.pdf、tools/*.pptx      研究工具
 *   practice-data.json             {code:{路徑:原始碼}, xlsx:{檔名:base64}, qp:{…}}
 * 原始檔絕對不要放進這個 repo（repo 為公開，.gitignore 已排除）。 */
const fs=require("fs"),path=require("path"),c=require("crypto");
const SRC=process.argv[2], OUT=path.join(__dirname,"..","vault"), pw=(process.env.VAULT_PASSWORD||"").trim().toUpperCase();
if(!SRC||!pw){console.error("用法：VAULT_PASSWORD=… node scripts/encrypt_vault.js <原始檔資料夾>");process.exit(1);}
const ITER=600000, salt=c.randomBytes(16), key=c.pbkdf2Sync(pw,salt,ITER,32,"sha256");
const enc=buf=>{const iv=c.randomBytes(12),ci=c.createCipheriv("aes-256-gcm",key,iv);return Buffer.concat([iv,ci.update(buf),ci.final(),ci.getAuthTag()]).toString("base64");};
const list=(dir,group)=>fs.existsSync(path.join(SRC,dir))?fs.readdirSync(path.join(SRC,dir)).filter(f=>/\.(pdf|pptx)$/.test(f)).sort().map(f=>({path:dir+"/"+f,group:group(f)})):[];
const items=[...list("pdf",f=>/slides/.test(f)?"簡報":"論文原文"),...list("tools",()=>"研究工具"),{path:"practice-data.json",group:"_data"}];
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const files=items.map((it,i)=>{const buf=fs.readFileSync(path.join(SRC,it.path)),id=String(i+1).padStart(2,"0");fs.writeFileSync(path.join(OUT,id+".txt"),enc(buf));
  return {path:it.path,name:path.basename(it.path),group:it.group,size:buf.length,enc:"vault/"+id+".txt",sha256:c.createHash("sha256").update(buf).digest("hex")};});
fs.writeFileSync(path.join(OUT,"manifest.json"),JSON.stringify({v:1,kdf:{name:"PBKDF2",hash:"SHA-256",iterations:ITER,salt:salt.toString("base64")},cipher:"AES-GCM-256",check:enc(Buffer.from("sfn-vault-ok")),files},null,1));
console.log(files.length+" 個檔案已加密到 vault/");
