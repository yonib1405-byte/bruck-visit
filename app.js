/* Bruck · ביקור בנכס — offline-first visit app.
   Data lives in IndexedDB on the tablet; "סנכרון" sends it through the Google Apps Script bridge to the case folder in Drive. */
'use strict';
const VERSION='1.3.1';

/* ---------------- form schema (from the paper visit form) ---------------- */
const SECTIONS=[
 {id:'env',title:'סביבה',groups:[
  {k:'street',l:'רחוב',o:['חד סטרי','דו סטרי','מעגלי','ללא מוצא','ש. גישה']},
  {k:'streetDir',l:'כיוון הרחוב',o:['צפון','דרום','מזרח','מערב'],mIf:{k:'street',v:['דו סטרי','מעגלי']}},
  {k:'areaBuild',l:'אופי הבנייה בסביבה',o:['צמודי קרקע','רוויה','מסחר/משרדים','תעשיה/אחסנה'],m:1},
  {k:'hood',l:'אופי השכונה',o:['שקטה','רועשת','מרכזית','צדדית'],m:1},
  {k:'hoodAge',l:'גיל השכונה',o:['ותיקה','חדשה','בבנייה']},
  {k:'areaNew',l:'הבנייה בסביבה',o:['חדשה','מתקופות שונות','ותיקה','בבנייה']},
  {k:'dev',l:'פיתוח סביבתי',o:['מלא','חלקי','בבנייה']},
  {k:'near',l:'היבטים סביבתיים',o:['מרכז מסחרי','קניון','ים','ביה"ס','גן ציבורי','גן ילדים','קופ"ח','מבני ציבור','מבני דת','שצ"פ'],m:1}
 ]},
 {id:'bld',title:'בניין',groups:[
  {k:'propType',l:'סוג הנכס',o:['דירה רגילה','דופלקס','דירת גן','דירת גג','קוטג\' טורי','חד משפחתי','דו משפחתי']},
  {k:'bldFace',l:'בניין בודד/משותף',o:['צפון','דרום','מזרח','מערב'],m:1},
  {k:'bldCond',l:'מצב הבניין',o:['נמוך','בינוני','סביר','טוב','טוב מאוד','חדש (איכלוס)']},
  {k:'entries',l:'מס\' כניסות',o:['צפון','דרום','מזרח','מערב'],m:1,extra:[{k:'entryNo',l:'כניסה',n:1},{k:'entryOf',l:'מתוך',n:1}]},
  {k:'built',l:'הבניין בנוי',o:['בלוקים ובטון','טרומי','מתועש']},
  {k:'clad',l:'חיפוי הבניין',o:['אבן','שיש','טיח חלק','טיח שפריץ','פסיפס קרמי','גרנוליט'],m:1},
  {k:'roof',l:'סוג גג',o:['בטון שטוח','רעפים','קל'],m:1},
  {k:'garden',l:'גינה/חצר',o:['מוזנחת','חלקית','מטופחת','מרוצפת']},
  {k:'lobby',l:'לובי',o:['פשוט','סטנדרט','טוב','משופר']},
  {k:'elev',l:'מעליות',o:['אין','1','2','3','4']},
  {k:'ground',l:'קומת קרקע',o:['דירות','מסחרי','עמודים','קרקע','מחסנים'],m:1}
 ]},
 {id:'apt',title:'דירה',nums:[
  {k:'bldFloors',l:'מס\' קומות בבניין'},{k:'bldUnits',l:'מס\' דירות בכל הבניין'},{k:'entryUnits',l:'מס\' דירות בכניסה'},
  {k:'floorUnits',l:'מס\' דירות בקומה'},{k:'floor',l:'הנכס בקומה'},{k:'aptNo',l:'דירה מס\'',t:1},
  {k:'rooms',l:'חדרים מלאים'},{k:'halfRooms',l:'חצאי חדרים'},{k:'aptLevels',l:'מס\' קומות בדירה'}],
  yn:[{k:'lastFloor',l:'קומה אחרונה'}],
  layout:1
 },
 {id:'fin',title:'גמרים',groups:[
  {k:'loc',l:'מיקום',o:['חזית','עורף','צד','פנימי','לרחוב'],m:1},
  {k:'air',l:'כיווני אוויר',o:['צפון','דרום','מזרח','מערב'],m:1},
  {k:'view',l:'נוף',o:['עירוני','עירוני פתוח','לים','נוף פתוח'],m:1},
  {k:'shLiving',l:'תריסים סלון',o:['גלילה חשמלי','גלילה ידני','שלבים'],m:1},
  {k:'doorIn',l:'דלת כניסה',o:['מחוסמת','עץ','מעוצבת','דו-כנפית'],m:1},
  {k:'doorsInt',l:'דלתות פנים',o:['פשוט','עץ','מעוצבת'],m:1},
  {k:'baths',l:'חדרי רחצה',o:['פשוט','סטנדרט','טוב','משופר']},
  {k:'sanit',l:'כלים סניטריים',o:['פשוטים','סטנדרטים','נאים','משופרים']},
  {k:'floorAll',l:'ריצוף הדירה',o:['קרמיקה','גרניט פורצלן','פרקט','טראצו','שיש','למינציה','שטיח'],m:1},
  {k:'ac',l:'מיזוג',o:['מרכזי','עילי','תחתי','מפוצל','אין'],m:1},
  {k:'mamad',l:'ממ"ד',o:['יש','אין']},
  {k:'windows',l:'חלונות',o:['אלומיניום','עץ'],m:1},
  {k:'shRooms',l:'תריסים חדרים',o:['גלילה חשמלי','גלילה ידני','שלבים'],m:1},
  {k:'bars',l:'סורגים',o:['יש','חלקי','אין']},
  {k:'bathCab',l:'ארונות אמבט',o:['יש','אין']},
  {k:'bathWall',l:'חיפוי קירות חדר רחצה',o:['קרמיקה','חרסינה','טיח חלק'],m:1},
  {k:'bathFloor',l:'ריצוף חדר רחצה',o:['קרמיקה','טראצו'],m:1}
 ]},
 {id:'kit',title:'מטבח וחוץ',groups:[
  {k:'kitchen',l:'מטבח',o:['פשוט','סטנדרט','טוב','משופר']},
  {k:'kitCab',l:'ארונות מטבח',o:['עילי','תחתי'],m:1},
  {k:'kitWall',l:'חיפוי מטבח',o:['קרמיקה','טיח חלק','שיש'],m:1},
  {k:'kitTop',l:'משטח עבודה',o:['שיש','עץ','נירוסטה'],m:1},
  {k:'balRail',l:'מעקה מרפסת',o:['בטון','זכוכית','מתכת','עץ'],m:1},
  {k:'balFloor',l:'ריצוף מרפסת',o:['קרמיקה','גרניט פורצלן','טראצו','פרקט','דק עץ'],m:1},
  {k:'fence',l:'גדר',o:['בטון','אבנים','זכוכית','מתכת','עץ'],m:1},
  {k:'storage',l:'מחסן',o:['אין','בקומת הנכס','קומת קרקע','קומת גלריה','קומת מרתף','בחצר'],m:1},
  {k:'parking',l:'חניה',o:['אין','משותפת','פרטית','תת קרקעית'],m:1,extra:[{k:'parkCount',l:'כמות',n:1}]},
  {k:'finish',l:'רמת גימור',o:['פשוט','סטנדרט','טוב','משופר','טוב מאוד']},
  {k:'maint',l:'מצב תחזוקתי',o:['נמוך','בינוני','סביר','טוב','טוב מאוד','במהלך שיפוץ']}
 ]},
 {id:'dev2',title:'חריגות והערות',text:[{k:'deviations',l:'חריגות בנייה',ph:'מה נמצא שונה מההיתר/מהתשריט, איפה, ובאיזה שטח'},{k:'remarks',l:'הערות / תוספות',ph:''}]},
 {id:'photos',title:'תמונות'},
 {id:'plan',title:'תשריט'},
 {id:'head',title:'פרטי הביקור',head:1}
];
const TAB_ORDER=['head','env','bld','apt','fin','kit','dev2','photos','plan'];
const HEAD_FIELDS=[
  {k:'address',l:'רחוב ומספר'},{k:'aptNo',l:'מס\' דירה'},{k:'hood',l:'רובע / שכונה'},{k:'city',l:'יישוב'},
  {k:'presenter',l:'מציג הנכס (קרבה לנכס)'},{k:'occupant',l:'מחזיק בפועל'},{k:'visitor',l:'עורך הביקור'},
  {k:'date',l:'תאריך ביקור',type:'date'},{k:'time',l:'שעת הביקור',type:'time'}];

/* ---------------- storage (IndexedDB) ---------------- */
let dbp=null;
function idb(){if(dbp)return dbp;dbp=new Promise((res,rej)=>{const r=indexedDB.open('bruck-visit',1);
  r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv');d.createObjectStore('visits',{keyPath:'id'});d.createObjectStore('blobs')};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbp}
async function tx(store,mode,fn){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction(store,mode);const s=t.objectStore(store);let out;
  Promise.resolve(fn(s)).then(v=>{out=v});t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const kvGet=k=>tx('kv','readonly',s=>req(s.get(k)));
const kvSet=(k,v)=>tx('kv','readwrite',s=>{s.put(v,k)});
const visitGet=id=>tx('visits','readonly',s=>req(s.get(id)));
const visitAll=()=>tx('visits','readonly',s=>req(s.getAll()));
const visitPut=v=>tx('visits','readwrite',s=>{s.put(v)});
const visitDel=id=>tx('visits','readwrite',s=>{s.delete(id)});
const blobGet=k=>tx('blobs','readonly',s=>req(s.get(k)));
const blobPut=(k,b)=>tx('blobs','readwrite',s=>{s.put(b,k)});
const blobDel=k=>tx('blobs','readwrite',s=>{s.delete(k)});
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}

/* ---------------- helpers ---------------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const fmtDate=d=>{if(!d)return '';const [y,m,dd]=d.split('-');return `${dd}.${m}.${y.slice(2)}`};
function toast(m,ms=2600){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),ms)}
function netState(){const n=$('#net');const on=navigator.onLine;n.textContent=on?'מחובר':'לא מחובר';n.classList.toggle('on',on)}
addEventListener('online',netState);addEventListener('offline',netState);

/* ---------------- settings & bridge ---------------- */
let cfg={bridge:'',key:'',visitor:''};
async function loadCfg(){cfg={...cfg,...(await kvGet('cfg')||{})};
  const h=location.hash;const m=/setup=([^&]+)/.exec(h);
  if(m){try{const o=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));if(o.bridge)cfg.bridge=o.bridge;if(o.key)cfg.key=o.key;await kvSet('cfg',cfg);toast('החיבור לדרייב הוגדר');}catch(_){toast('קישור ההגדרה לא תקין')}history.replaceState(null,'',location.pathname)}}
async function bridgeGet(params){if(!cfg.bridge)throw new Error('nobridge');const u=new URL(cfg.bridge);Object.entries({...params,key:cfg.key}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u.toString(),{redirect:'follow'});let j;try{j=await r.json()}catch(_){throw new Error(/\/dev(\?|$)/.test(cfg.bridge)?'dev':'notjson')}if(j.error)throw new Error(j.error);return j}
async function bridgePost(body){if(!cfg.bridge)throw new Error('nobridge');
  const r=await fetch(cfg.bridge,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,key:cfg.key}),redirect:'follow'});
  let j;try{j=await r.json()}catch(_){throw new Error(/\/dev(\?|$)/.test(cfg.bridge)?'dev':'notjson')}if(j.error)throw new Error(j.error);return j}
function blobToB64(b){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(',')[1]);fr.onerror=rej;fr.readAsDataURL(b)})}
function b64ToBlob(b64,mime){const bin=atob(b64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:mime})}

/* ---------------- state ---------------- */
let cases=[];       // from the office system (cached)
let cur=null;       // current visit record
let tab='head';
let saveT=null;

function newVisit(c){return {id:c?.id||('m'+uid()),caseId:c?.id||'',caseNo:c?.caseNo||'',folderId:c?.driveFolderId||'',
  title:[c?.address,c?.city].filter(Boolean).join(', ')||'ביקור חדש',
  head:{address:c?.address||'',aptNo:c?.apt||'',hood:'',city:c?.city||'',presenter:c?.contactName||c?.client||'',occupant:'',visitor:cfg.visitor||'',date:c?.visitDate||today(),time:c?.visitTime||''},
  sel:{},notes:{},nums:{floor:c?.floor||'',aptNo:c?.apt||''},yn:{},text:{},photos:[],plan:null,
  created:new Date().toISOString(),updated:new Date().toISOString(),synced:null,dirtyAfterSync:true}}
function touch(){if(!cur)return;cur.updated=new Date().toISOString();cur.dirtyAfterSync=true;clearTimeout(saveT);saveT=setTimeout(()=>visitPut(cur),400)}

/* ---------------- home ---------------- */
async function home(){cur=null;$('#title').textContent='ביקור בנכס';$('#backBtn').classList.add('hidden');
  cases=await kvGet('cases')||[];const visits=await visitAll();const byId=Object.fromEntries(visits.map(v=>[v.id,v]));
  const upcoming=cases.filter(c=>!byId[c.id]).sort((a,b)=>(a.visitDate||'9')<(b.visitDate||'9')?-1:1);
  const vs=visits.sort((a,b)=>b.updated.localeCompare(a.updated));
  const lastSync=await kvGet('casesAt');
  $('#main').innerHTML=`
   ${!cfg.bridge?`<div class="card" style="border-color:var(--gold)"><h2>חיבור לדרייב עוד לא הוגדר</h2><div class="hint">אפשר לעבוד ולמלא ביקורים כבר עכשיו. כדי לקבל את רשימת התיקים ולהעלות לדרייב, פותחים בטאבלט את "קישור ההגדרה לטאבלט" מהמערכת במשרד.</div></div>`:''}
   <div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">ביקורים בטאבלט</h2><button class="btn" type="button" data-act="manual">+ ביקור ללא תיק</button></div>
     <div class="list" style="margin-top:12px">${vs.map(v=>`<button class="case" type="button" data-open="${esc(v.id)}"><span class="no">${esc(v.caseNo||'—')}</span><span class="main"><b>${esc(v.title)}</b><span class="hint">${fmtDate(v.head.date)} ${esc(v.head.time||'')} · ${v.photos.length} תמונות${plansOf(v).length?' · '+plansOf(v).length+' תשריטים':''}</span></span><span class="st ${v.synced&&!v.dirtyAfterSync?'done':'draft'}">${v.synced&&!v.dirtyAfterSync?'הועלה לדרייב':v.synced?'יש שינויים':'לא הועלה'}</span></button>`).join('')||'<div class="hint">אין ביקורים פתוחים בטאבלט.</div>'}</div></div>
   <div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">תיקים מהמשרד</h2><button class="btn dark" type="button" data-act="refresh" ${navigator.onLine&&cfg.bridge?'':'disabled'}>עדכון מהמשרד</button></div>
     <div class="hint" style="margin-top:4px">${lastSync?'עודכן לאחרונה '+new Date(lastSync).toLocaleString('he-IL'):'עוד לא עודכן'}${navigator.onLine?'':' · אין חיבור כרגע, מוצגת הרשימה השמורה'}</div>
     <div class="list" style="margin-top:12px">${upcoming.map(c=>`<button class="case" type="button" data-start="${esc(c.id)}"><span class="no">${esc(c.caseNo||'—')}</span><span class="main"><b>${esc([c.address,c.city].filter(Boolean).join(', '))}</b><span class="hint">${esc(c.client||'')}${c.visitDate?' · ביקור '+fmtDate(c.visitDate)+' '+esc(c.visitTime||''):''}${c.plans&&c.plans.length?' · '+c.plans.length+' תשריטים שמורים':''}</span></span><span class="st">התחלת ביקור</span></button>`).join('')||'<div class="hint">אין תיקים ברשימה.</div>'}</div></div>
   <div class="card"><h2>הגדרות</h2><div class="fields">
     <label>עורך הביקור (שם קבוע)<input class="t" id="cfgVisitor" value="${esc(cfg.visitor)}"></label>
     <label>כתובת הגשר לדרייב<input class="t" id="cfgBridge" dir="ltr" value="${esc(cfg.bridge)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
     <label>מפתח<input class="t" id="cfgKey" dir="ltr" value="${esc(cfg.key)}"></label></div>
     <label class="row" style="margin-top:10px;gap:8px"><input type="checkbox" id="cfgPenDiag" ${cfg.penDiag?'checked':''} style="width:22px;height:22px"> הצגת "בדיקת עט" במסך התשריט (לאיתור תקלה בכפתור העט)</label>
     <div class="row" style="margin-top:10px"><button class="btn" type="button" data-act="savecfg">שמירת הגדרות</button><span class="hint">גרסה ${VERSION}</span></div></div>`;
}
async function refreshCases(){try{toast('מעדכן מהמשרד…');const j=await bridgeGet({action:'cases'});cases=j.cases||[];
  // keep downloaded plans on the cached case list
  const old=await kvGet('cases')||[];const oldBy=Object.fromEntries(old.map(c=>[c.id,c]));cases.forEach(c=>{if(oldBy[c.id]?.plans)c.plans=oldBy[c.id].plans});
  await kvSet('cases',cases);await kvSet('casesAt',Date.now());toast(`התקבלו ${cases.length} תיקים`);
  // pre-download plan files for upcoming visits so they are available offline
  let n=0;for(const c of cases){if(!c.driveFolderId||(c.plans&&c.plans.length))continue;try{const f=await bridgeGet({action:'files',folderId:c.driveFolderId});const pick=(f.files||[]).filter(x=>x.mime==='application/pdf'||/היתר|תשריט|תכנית|תוכנית/.test(x.name)).filter(x=>/היתר|תשריט|תכנית|תוכנית|תיק בניין|בית משותף|plan/i.test(x.name+' '+(x.folder||''))).slice(0,6);
      c.plans=[];for(const x of pick){if(x.size>15e6)continue;const d=await bridgeGet({action:'file',id:x.id});const k='plan:'+x.id;await blobPut(k,b64ToBlob(d.data,d.mime));c.plans.push({k,name:x.name,mime:d.mime});n++}}catch(_){}}
  await kvSet('cases',cases);if(n)toast(`נשמרו ${n} קבצי תשריט/היתר לשימוש בלי אינטרנט`);
}catch(e){toast(errText(e),6000)}home()}
function errText(e){const m=e&&e.message;return m==='key'?'המפתח שגוי. בדקו את ההגדרות.':m==='dev'?'כתובת הגשר מסתיימת ב-/dev (כתובת בדיקה). צריך את הכתובת שמסתיימת ב-/exec מ-Deploy ← Manage deployments.':m==='notjson'?'הגשר לא החזיר נתונים. בדקו שהגשר פרוס כ-Web app עם גישה ל-Anyone ושהכתובת מסתיימת ב-/exec.':m==='nobridge'?'החיבור לדרייב עוד לא הוגדר.':'העדכון נכשל. בדקו את החיבור לאינטרנט.'}

/* ---------------- visit editor ---------------- */
async function openVisit(id){cur=await visitGet(id);if(!cur)return home();tab='head';renderVisit()}
async function startVisit(caseId){const c=cases.find(x=>x.id===caseId);const ex=await visitGet(caseId);cur=ex||newVisit(c);if(!ex)await visitPut(cur);tab='head';renderVisit()}
const isMulti=g=>!!g.m||!!(g.mIf&&(cur.sel[g.mIf.k]||[]).some(x=>g.mIf.v.includes(x)));
function chipGroup(g0){const g={...g0,m:isMulti(g0)};const vals=cur.sel[g.k]||[];const notes=cur.notes[g.k]||{};
  return `<div class="grp"><div class="lbl">${esc(g.l)}${g.m?'<small>אפשר לבחור כמה</small>':''}</div>
   <div class="chips">${g.o.map(o=>`<button type="button" class="chip" data-g="${g.k}" data-v="${esc(o)}" aria-pressed="${vals.includes(o)}">${esc(o)}</button>`).join('')}</div>
   ${g.m&&vals.length>1?`<div class="notes">${vals.map(v=>`<div class="note"><span>${esc(v)}:</span><input class="t" data-note="${g.k}" data-v="${esc(v)}" value="${esc(notes[v]||'')}" placeholder="איפה? למשל: סלון / חדרים / קומה עליונה"></div>`).join('')}</div>`:''}
   ${(g.extra||[]).map(x=>numField(x)).join('')}
   ${!g.m||vals.length<=1?`<div class="notes"><input class="t" data-note="${g.k}" data-v="_" value="${esc(notes._||'')}" placeholder="הערה (לא חובה)"></div>`:''}
  </div>`}
function numField(x){const v=cur.nums[x.k]??'';return `<label class="grp" style="display:inline-flex;flex-direction:column;gap:4px;margin-inline-end:16px"><span class="hint">${esc(x.l)}</span>${x.t?`<input class="t" inputmode="numeric" data-num="${x.k}" value="${esc(v)}" style="width:140px">`:`<span class="step"><button type="button" data-dec="${x.k}" data-s="${x.step||1}">−</button><input class="t" inputmode="decimal" data-num="${x.k}" value="${esc(v)}"><button type="button" data-inc="${x.k}" data-s="${x.step||1}">+</button></span>`}</label>`}
function renderVisit(){$('#backBtn').classList.remove('hidden');$('#title').textContent=(cur.caseNo?cur.caseNo+' · ':'')+cur.title;
  const sec=SECTIONS.find(s=>s.id===tab);let body='';
  if(sec.head){body=`<div class="card"><h2>פרטי הביקור</h2><div class="fields">${HEAD_FIELDS.map(f=>`<label>${esc(f.l)}<input class="t" data-head="${f.k}" type="${f.type||'text'}" value="${esc(cur.head[f.k]||'')}"></label>`).join('')}</div></div>
    <div class="card"><div class="row"><button class="btn danger" type="button" data-act="delvisit">מחיקת הביקור מהטאבלט</button><span class="hint">לא משפיע על מה שכבר הועלה לדרייב.</span></div></div>`}
  else if(sec.id==='photos'){body=photosHtml()}
  else if(sec.id==='plan'){body=planHtml()}
  else{body=`<div class="card"><h2>${esc(sec.title)}</h2>${(sec.nums||[]).map(numField).join('')}${(sec.yn||[]).map(y=>`<div class="grp"><div class="lbl">${esc(y.l)}</div><div class="chips">${['כן','לא'].map(o=>`<button type="button" class="chip" data-yn="${y.k}" data-v="${o}" aria-pressed="${cur.yn[y.k]===o}">${o}</button>`).join('')}</div></div>`).join('')}
    ${sec.layout?layoutHtml():''}
    ${(sec.groups||[]).map(chipGroup).join('')}
    ${(sec.text||[]).map(t=>`<div class="grp"><div class="lbl">${esc(t.l)}</div>${t.quick?`<div class="chips" style="margin-bottom:8px">${t.quick.map(q=>`<button type="button" class="chip" data-quick="${t.k}" data-v="${esc(q)}" aria-pressed="false">+ ${esc(q)}</button>`).join('')}</div>`:''}<textarea class="t" data-text="${t.k}" placeholder="${esc(t.ph||'')}">${esc(cur.text[t.k]||'')}</textarea></div>`).join('')}</div>`}
  const idx=TAB_ORDER.indexOf(tab);
  $('#main').innerHTML=`<nav class="tabs" role="tablist">${TAB_ORDER.map(id=>{const s=SECTIONS.find(x=>x.id===id);const n=filledCount(s);return `<button type="button" class="tab" role="tab" data-tab="${id}" aria-selected="${id===tab}">${esc(s.title)}${n?` · ${n}`:''}</button>`}).join('')}</nav>${body}
   <div class="bar"><button class="btn" type="button" data-tab="${TAB_ORDER[Math.max(0,idx-1)]}" ${idx===0?'disabled':''}>→ הקודם</button>
   <button class="btn primary" type="button" data-act="sync">${cur.synced&&!cur.dirtyAfterSync?'הועלה ✓':'העלאה לדרייב'}</button>
   <button class="btn" type="button" data-tab="${TAB_ORDER[Math.min(TAB_ORDER.length-1,idx+1)]}" ${idx===TAB_ORDER.length-1?'disabled':''}>הבא ←</button></div>`;
  window.scrollTo(0,0)}
function filledCount(s){if(!s.groups)return s.id==='photos'?cur.photos.length:0;return s.groups.filter(g=>(cur.sel[g.k]||[]).length).length}

/* ---------------- internal layout (חלוקה פנימית) ---------------- */
const SPACES=['מבואה','חדר מגורים','מטבח','פינת אוכל','פינת משפחה','יחידת הורים','חדר שינה','ממ"ד','חדר רחצה','תא שירותים','חדר ארונות','חדר כביסה','מרפסת שירות','מרפסת שמש','מרפסת','חצר','מחסן','חלל','חדר עבודה','גלריה','מעבר'];
const PLURAL={'חדר שינה':'חדרי שינה','חדר רחצה':'חדרי רחצה','תא שירותים':'תאי שירותים','מרפסת שמש':'מרפסות שמש','מרפסת':'מרפסות','מחסן':'מחסנים','חדר עבודה':'חדרי עבודה','חדר ארונות':'חדרי ארונות','מרפסת שירות':'מרפסות שירות','חלל':'חללים','ממ"ד':'ממ"דים','חצר':'חצרות','מעבר':'מעברים'};
const FLOORS=['קומת מרתף','קומת קרקע','קומה א\'','קומה ב\'','קומה ג\'','קומת גלריה','קומת גג'];
let addTo=null; // {f, i} when choosing a sub-space ("כולל") for an item
function lay(){if(!cur.layout)cur.layout=[{floor:'',items:[],mamadRoom:false}];return cur.layout}
const vav=w=>'ו'+w;
function joinHe(arr){if(arr.length<2)return arr.join('');return arr.slice(0,-1).join(', ')+' '+vav(arr[arr.length-1])}
function floorText(fl){const groups=[];const seen={};
  fl.items.forEach(it=>{const subs=it.subs||[];if(!subs.length){if(seen[it.n]!==undefined){groups[seen[it.n]].c++;return}seen[it.n]=groups.length;groups.push({n:it.n,c:1})}else groups.push({n:it.n,c:1,subs})});
  const parts=groups.map(g=>{let t=g.c>1?`${g.c} ${PLURAL[g.n]||g.n}`:g.n;
    if(g.n==='חדר שינה'&&fl.mamadRoom)t+=g.c>1?' (אחד מהם ממ"ד)':' (משמש כממ"ד)';
    if(g.subs)t+=' עם '+joinHe(g.subs);return t});
  return joinHe(parts)}
function layoutText(){const L=lay();const multi=L.length>1||L.some(f=>f.floor);
  return L.filter(f=>f.items.length).map(f=>(multi&&f.floor?f.floor+' - ':'')+floorText(f)).join('\n')}
function syncLayoutText(){cur.text.layout=layoutText()+(cur.text.layoutNote?((layoutText()?'\n':'')+cur.text.layoutNote):'')}
function layoutHtml(){const L=lay();
  return `<div class="grp"><div class="lbl">חלוקה פנימית <small>לוחצים על החללים לפי הסדר · "+ כולל" מוסיף חלק לאותו חלל (למשל מטבח עם מרפסת שירות)</small></div>
   ${L.map((fl,f)=>`<div class="floor">
     <div class="row" style="gap:8px;margin-bottom:8px">${L.length>1||fl.floor?`<select class="t" data-floorname="${f}" style="width:auto;min-width:160px"><option value="">בחירת קומה…</option>${FLOORS.map(x=>`<option ${x===fl.floor?'selected':''}>${esc(x)}</option>`).join('')}${fl.floor&&!FLOORS.includes(fl.floor)?`<option selected>${esc(fl.floor)}</option>`:''}</select>`:''}
       ${L.length>1?`<button class="btn danger" type="button" data-delfloor="${f}" style="min-height:40px;padding:6px 12px">הסרת הקומה</button>`:''}</div>
     <div class="items">${fl.items.map((it,i)=>`<span class="item${addTo&&addTo.f===f&&addTo.i===i?' on':''}"><b>${esc(it.n)}</b>${(it.subs||[]).map((sb,j)=>`<span class="sub">+ ${esc(sb)}<button type="button" data-delsub="${f}:${i}:${j}" aria-label="הסרה">×</button></span>`).join('')}<button type="button" class="incl" data-incl="${f}:${i}">+ כולל</button><button type="button" class="x" data-delitem="${f}:${i}" aria-label="הסרה">×</button></span>`).join('')||'<span class="hint">עוד לא נבחרו חללים בקומה הזו.</span>'}</div>
     ${addTo&&addTo.f===f?`<div class="hint" style="margin:8px 0 4px;color:var(--warn);font-weight:700">בחרו מה כלול ב"${esc(fl.items[addTo.i]?.n||'')}" <button type="button" class="btn" data-incldone style="min-height:36px;padding:4px 12px">סיום</button></div>`:''}
     <div class="chips" style="margin-top:8px">${SPACES.map(x=>`<button type="button" class="chip sp" data-space="${f}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
     ${fl.items.some(it=>it.n==='חדר שינה')?`<div class="chips" style="margin-top:8px"><button type="button" class="chip" data-mamadroom="${f}" aria-pressed="${!!fl.mamadRoom}">אחד מחדרי השינה הוא ממ"ד</button></div>`:''}
   </div>`).join('')}
   <div class="row" style="margin:6px 0 10px"><button class="btn" type="button" data-addfloor>+ הוספת קומה</button><span class="hint">לדופלקס, לצמוד קרקע או לדירה עם מרתף</span></div>
   <div class="preview">${esc(layoutText())||'<span class="hint">כאן יופיע התיאור, למשל: חדר מגורים, מטבח עם מרפסת שירות, 3 חדרי שינה וחדר רחצה</span>'}</div>
   <textarea class="t" data-text="layoutNote" placeholder="תוספת חופשית לחלוקה (לא חובה)" style="min-height:70px;margin-top:8px">${esc(cur.text.layoutNote||'')}</textarea></div>`}

/* ---------------- photos ---------------- */
function photosHtml(){return `<div class="card"><h2>תמונות</h2><div class="row" style="margin-bottom:12px">
  <label class="btn primary">🖼 הוספה מהגלריה<input type="file" accept="image/*" multiple data-photo hidden></label>
  <label class="btn">📷 מצלמה<input type="file" accept="image/*" capture="environment" data-photo hidden></label>
  <span class="hint">${cur.photos.length} תמונות · נשמרות בטאבלט עד ההעלאה</span></div>
  <div class="hint">הדרך המהירה: מצלמים במצלמה הרגילה של הטאבלט (עם זום 0.5, בלי אישורים), ובסוף לוחצים "הוספה מהגלריה" ומסמנים את כל התמונות של הביקור בבת אחת.</div>
  <div class="photos" id="photoGrid">${cur.photos.map(p=>`<div class="ph" data-ph="${p.k}"><img alt="" data-thumb="${p.k}"><button type="button" data-delph="${p.k}" aria-label="מחיקה">×</button>${p.up?'<span class="up">הועלה</span>':''}</div>`).join('')}</div></div>`}
let CAM=null;
async function openCamera(){
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:4032},height:{ideal:3024}},audio:false})}
  catch(e){toast('אין גישה למצלמה. אפשר לאשר גישה בהגדרות הדפדפן, או להשתמש ב"מצלמת המכשיר".',5000);return}
  const el=document.createElement('div');el.id='cam';
  el.innerHTML=`<video playsinline autoplay muted></video><div class="flash"></div>
   <div class="cam-bar"><button type="button" class="cam-done" data-cam="done">סיום</button><button type="button" class="shutter" data-cam="shot" aria-label="צילום"></button><div class="cam-last"><img alt=""><span class="cam-n">0</span></div></div>`;
  document.body.appendChild(el);const v=el.querySelector('video');v.srcObject=stream;
  const track=stream.getVideoTracks()[0];let ic=null;try{if('ImageCapture' in window)ic=new ImageCapture(track)}catch(_){}
  CAM={el,stream,v,ic,n:0,busy:0};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-cam]');if(!b)return;if(b.dataset.cam==='shot')camShot();else closeCamera()});
}
async function camShot(){const C=CAM;if(!C)return;const f=C.el.querySelector('.flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');
  C.n++;C.el.querySelector('.cam-n').textContent=C.n;C.busy++;
  try{let blob=null;
    if(C.ic){try{blob=await C.ic.takePhoto()}catch(_){blob=null}}
    if(!blob){const c=document.createElement('canvas');c.width=C.v.videoWidth;c.height=C.v.videoHeight;c.getContext('2d').drawImage(C.v,0,0);blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9))}
    const b=await shrink(blob);const k='ph:'+uid();await blobPut(k,b);const n=cur.photos.length+1;
    cur.photos.push({k,name:`${cur.caseNo||'ביקור'}_${String(n).padStart(2,'0')}.jpg`,up:false});touch();await visitPut(cur);
    const im=C.el.querySelector('.cam-last img');if(im){if(im.src)URL.revokeObjectURL(im.src);im.src=URL.createObjectURL(b)}
  }catch(_){toast('תמונה אחת לא נשמרה')}finally{C.busy--}}
async function closeCamera(){const C=CAM;if(!C)return;let w=0;while(C.busy>0&&w<40){await new Promise(r=>setTimeout(r,100));w++}
  C.stream.getTracks().forEach(t=>t.stop());C.el.remove();CAM=null;if(C.n)toast(`נשמרו ${C.n} תמונות`);renderVisit();fillThumbs()}
async function fillThumbs(){for(const img of document.querySelectorAll('[data-thumb]')){const b=await blobGet(img.dataset.thumb);if(b){img.src=URL.createObjectURL(b)}}}
async function shrink(file,max=2400,q=.85){const url=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
  const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));if(s===1&&file.size<3e6&&file.type==='image/jpeg')return file;
  const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return await new Promise(r=>c.toBlob(r,'image/jpeg',q))}finally{URL.revokeObjectURL(url)}}
async function addPhotos(files,quiet){let n=cur.photos.length;for(const f of files){const b=await shrink(f);const k='ph:'+uid();await blobPut(k,b);n++;
  cur.photos.push({k,name:`${cur.caseNo||'ביקור'}_${String(n).padStart(2,'0')}.jpg`,up:false})}touch();await visitPut(cur);renderVisit();fillThumbs();toast(quiet?`נשמרה · סה"כ ${cur.photos.length} תמונות`:`נוספו ${files.length} תמונות`,1500)}

/* ---------------- plan (תשריט) ---------------- */
function planHtml(){const c=cases.find(x=>x.id===cur.caseId);const files=c?.plans||[];const P=plansOf(cur);
  const floorsFromLayout=(cur.layout||[]).map(f=>f.floor).filter(Boolean);
  return `<div class="card"><h2>תשריטים <span class="hint">${P.length?`· ${P.length} בביקור הזה · כל תשריט בעמוד נפרד ב-PDF`:''}</span></h2>
   ${P.map((p,i)=>`<div class="plancard">
     <div class="row" style="gap:8px;margin-bottom:8px"><b>תשריט ${i+1}</b>
       <select class="t" data-planlabel="${i}" style="width:auto;min-width:170px"><option value="">ללא כותרת</option>${[...new Set([...floorsFromLayout,...PLAN_FLOORS])].map(f=>`<option ${f===p.label?'selected':''}>${esc(f)}</option>`).join('')}${p.label&&![...floorsFromLayout,...PLAN_FLOORS].includes(p.label)?`<option selected>${esc(p.label)}</option>`:''}</select>
       <span class="sp" style="flex:1"></span>
       <button class="btn primary" type="button" data-editplan="${i}">המשך סימון</button>
       <button class="btn danger" type="button" data-delplan="${i}">${p._sure?'לחצו שוב להסרה':'הסרה'}</button></div>
     <img class="planthumb" data-planthumb="${i}" alt="תשריט ${i+1}"></div>`).join('')}
   <div class="${P.length?'addplan':''}">
    <div class="hint" style="margin-bottom:10px">${P.length?'<b>הוספת תשריט נוסף</b> (למשל קומה נוספת): ':''}בוחרים קובץ היתר או תשריט (PDF או תמונה), בוחרים עמוד, חותכים ומסמנים בעט.</div>
    <div class="row">${files.map(p=>`<button class="btn dark" type="button" data-loadplan="${esc(p.k)}">${esc(p.name)}</button>`).join('')}
    <label class="btn primary">קובץ מהטאבלט<input type="file" accept="application/pdf,image/*" data-planfile hidden></label>
    <label class="btn">צילום של התשריט<input type="file" accept="image/*" capture="environment" data-planfile hidden></label></div>
    ${files.length?'':'<div class="hint" style="margin-top:8px">קבצי PDF מתיקיית התיק יורדים לטאבלט ב"עדכון מהמשרד" כשהשם שלהם, או שם תת־התיקייה שבה הם נמצאים, כולל "היתר", "תשריט", "תכנית", "תיק בניין" או "בית משותף".</div>'}</div></div>`}
async function fillPlanThumb(){const P=plansOf(cur);for(const img of document.querySelectorAll('[data-planthumb]')){const p=P[+img.dataset.planthumb];if(!p)continue;const b=await renderPlanBlob(p);if(b)img.src=URL.createObjectURL(b)}}
async function loadPlanSource(blob){
  if(blob.type==='application/pdf'||/pdf/.test(blob.type)){
    pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:await blob.arrayBuffer()}).promise;
    const pick=pdf.numPages===1?1:await choosePage(pdf);if(!pick)return;
    const page=await pdf.getPage(pick);const vp=page.getViewport({scale:1});const scale=Math.min(4,3200/Math.max(vp.width,vp.height));
    toast('מכין את העמוד…',1500);const b=await renderPdfRegion(page,scale,0,0,vp.width,vp.height);
    PDFSRC={page,scale};return openCrop(b,true)}
  PDFSRC=null;return openCrop(blob)}
let PDFSRC=null; // the PDF page being cropped, so the chosen part can be re-drawn sharp
const MAX_PX=14e6, MAX_SIDE=7000; // stay inside the tablet browser's canvas limits
// draw a region of a PDF page (in PDF units) at a given scale
async function renderPdfRegion(page,scale,x,y,w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  const vp=page.getViewport({scale,offsetX:-x*scale,offsetY:-y*scale});await page.render({canvasContext:ctx,viewport:vp}).promise;
  return await new Promise(r=>c.toBlob(r,'image/png'))}
function sharpScale(w,h){return Math.min(14,MAX_SIDE/Math.max(w,h),Math.sqrt(MAX_PX/(w*h)))}
function choosePage(pdf){return new Promise(async res=>{const pop=document.createElement('div');pop.className='pop';pop.innerHTML=`<div class="box" style="width:min(720px,100%)"><h3>באיזה עמוד התשריט?</h3><div class="pages" id="pgs"></div><button class="btn" type="button" id="pgx">ביטול</button></div>`;document.body.appendChild(pop);
  pop.querySelector('#pgx').onclick=()=>{pop.remove();res(0)};const g=pop.querySelector('#pgs');
  for(let i=1;i<=Math.min(pdf.numPages,40);i++){const b=document.createElement('button');b.type='button';b.innerHTML=`<div class="hint">עמוד ${i}</div>`;b.onclick=()=>{pop.remove();res(i)};g.appendChild(b);
    try{const p=await pdf.getPage(i);const vp=p.getViewport({scale:.25});const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;const im=new Image();im.src=c.toDataURL();b.appendChild(im)}catch(_){}}})}

function plansOf(v){if(!v.plans){v.plans=v.plan&&v.plan.base?[{id:'p0',label:'',base:v.plan.base,items:v.plan.items||[]}]:[];delete v.plan}return v.plans}
const PLAN_FLOORS=['קומת מרתף','קומת קרקע','קומה א\'','קומה ב\'','קומה ג\'','קומת גלריה','קומת גג'];
let planIdx=-1; // which plan the editor works on (-1 = adding a new one)
/* plan editor: crop first, then annotate. Pen draws; fingers pan and zoom. */
let PE=null;
function openCrop(blob,isPdf){planIdx=-1;if(!isPdf)PDFSRC=null;return openEditor({mode:'crop',src:blob})}
async function openEditor(o){
  const img=await blobToImage(o.src);
  const wrap=document.createElement('div');wrap.id='planEd';
  wrap.innerHTML=`<div class="tb" id="peTb"></div><div class="stage" id="peStage"><canvas id="peCv"></canvas><div class="msg" id="peMsg"></div>${cfg.penDiag?'<div id="penDiag" class="pendiag">בדיקת עט: געו במסך עם העט, עם הכפתור ובלעדיו</div>':''}</div>`;
  document.body.appendChild(wrap);
  PE={mode:o.mode,img,items:o.items||[],tool:'pen',color:'#1d4ed8',view:{s:1,x:0,y:0},crop:null,undo:[],cv:$('#peCv'),pointers:new Map(),cur:null};
  peToolbar();fitView();peDraw();peBind();
  try{PE.ro=new ResizeObserver(()=>{if(PE)syncCanvas()});PE.ro.observe($('#peStage'))}catch(_){}
}
function blobToImage(b){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(b)})}
function fitView(){const st=$('#peStage').getBoundingClientRect();const cv=PE.cv;const dpr=devicePixelRatio||1;cv.width=st.width*dpr;cv.height=st.height*dpr;PE.dpr=dpr;
  const s=Math.min(st.width/PE.img.width,st.height/PE.img.height)*.96;PE.view={s,x:(st.width-PE.img.width*s)/2,y:(st.height-PE.img.height*s)/2}}
function peToolbar(){const tb=$('#peTb');
  if(PE.mode==='crop'){tb.innerHTML=`<b style="color:var(--gold)">חיתוך</b><span class="hint" style="color:var(--band-muted)">גוררים מלבן סביב הדירה (בעט או באצבע אחת)</span><span class="sp"></span><button type="button" data-pe="skipcrop">בלי חיתוך</button><button type="button" data-pe="docrop">חיתוך והמשך</button><button type="button" data-pe="close">ביטול</button>`;$('#peMsg').textContent='שתי אצבעות: הזזה והגדלה';return}
  const T=[['pen','✎ עט'],['check','✓'],['measure','↔ מדידה'],['area','▨ חריגה'],['text','T טקסט'],['erase','⌫ מחיקה']];
  tb.innerHTML=T.map(([k,l])=>`<button type="button" data-tool="${k}" aria-pressed="${PE.tool===k}">${l}</button>`).join('')+
   `<button type="button" data-color="#1d4ed8" aria-pressed="${PE.color==='#1d4ed8'}" style="color:#7aa2ff">● כחול</button><button type="button" data-color="#dc2626" aria-pressed="${PE.color==='#dc2626'}" style="color:#ff8a8a">● אדום</button>
   <button type="button" data-pe="undo">↶ ביטול</button><span class="sp"></span><button type="button" data-pe="save">שמירה וסגירה</button><button type="button" data-pe="close">יציאה</button>`;
  const tips={pen:'כותבים ומסמנים בעט · כפתור העט לחוץ = מחיקה · אצבעות: הזזה והגדלה',check:'נגיעה בעט מוסיפה ✓ ליד מידה תואמת',measure:'מותחים קו בעט, ואז מקלידים את המידה שנמדדה',area:'מקיפים בעט את אזור החריגה, ואז כותבים הערה',text:'נגיעה בעט ואז מקלידים טקסט',erase:'נגיעה על סימון מוחקת אותו'};
  $('#peMsg').textContent=tips[PE.tool]}
function w2s(p){return {x:p.x*PE.view.s+PE.view.x,y:p.y*PE.view.s+PE.view.y}}
function s2w(x,y){return {x:(x-PE.view.x)/PE.view.s,y:(y-PE.view.y)/PE.view.s}}
function peDraw(){const cv=PE.cv,ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
  ctx.setTransform(PE.dpr*PE.view.s,0,0,PE.dpr*PE.view.s,PE.dpr*PE.view.x,PE.dpr*PE.view.y);
  ctx.drawImage(PE.img,0,0);drawItems(ctx,PE.items,1/PE.view.s);
  if(PE.cur)drawItems(ctx,[PE.cur],1/PE.view.s);
  if(PE.crop){const c=PE.crop;ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.rect(0,0,PE.img.width,PE.img.height);ctx.rect(Math.min(c.x1,c.x2),Math.min(c.y1,c.y2),Math.abs(c.x2-c.x1),Math.abs(c.y2-c.y1));ctx.fill('evenodd');
    ctx.strokeStyle='#c99d47';ctx.lineWidth=3/PE.view.s;ctx.strokeRect(Math.min(c.x1,c.x2),Math.min(c.y1,c.y2),Math.abs(c.x2-c.x1),Math.abs(c.y2-c.y1))}}
function drawItems(ctx,items,px){ // px = one screen pixel in image units (for live view); export passes a fixed value
  const lw=it=>Math.max(2,(it.w||3))*(px||1);
  for(const it of items){ctx.save();ctx.strokeStyle=it.c||'#1d4ed8';ctx.fillStyle=it.c||'#1d4ed8';ctx.lineCap='round';ctx.lineJoin='round';
    if(it.t==='pen'){ctx.lineWidth=it.lw;ctx.beginPath();it.p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke()}
    else if(it.t==='check'){const z=it.z;ctx.lineWidth=z*.18;ctx.beginPath();ctx.moveTo(it.x-z*.45,it.y);ctx.lineTo(it.x-z*.1,it.y+z*.35);ctx.lineTo(it.x+z*.5,it.y-z*.45);ctx.stroke()}
    else if(it.t==='measure'){ctx.lineWidth=it.lw;const {x1,y1,x2,y2}=it;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      const a=Math.atan2(y2-y1,x2-x1),h=it.lw*5;[[x1,y1,a+Math.PI],[x2,y2,a]].forEach(([x,y,an])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-h*Math.cos(an-.45),y-h*Math.sin(an-.45));ctx.moveTo(x,y);ctx.lineTo(x-h*Math.cos(an+.45),y-h*Math.sin(an+.45));ctx.stroke()});
      if(it.txt){label(ctx,it.txt,(x1+x2)/2,(y1+y2)/2,it.fs,it.c)}}
    else if(it.t==='area'){ctx.globalAlpha=.28;ctx.fillStyle='#dc2626';ctx.beginPath();it.p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#dc2626';ctx.lineWidth=it.lw;ctx.stroke();
      if(it.txt){const cx=it.p.reduce((s,q)=>s+q.x,0)/it.p.length,cy=it.p.reduce((s,q)=>s+q.y,0)/it.p.length;label(ctx,it.txt,cx,cy,it.fs,'#dc2626')}}
    else if(it.t==='text'){label(ctx,it.txt,it.x,it.y,it.fs,it.c)}
    ctx.restore()}}
function label(ctx,t,x,y,fs,c){ctx.font=`700 ${fs}px Assistant,Arial,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';const w=ctx.measureText(t).width;
  ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillRect(x-w/2-fs*.25,y-fs*.65,w+fs*.5,fs*1.3);ctx.fillStyle=c||'#1d4ed8';ctx.fillText(t,x,y)}
function peBind(){const st=$('#peStage');
  $('#peTb').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tool){PE.tool=b.dataset.tool;peToolbar();return}if(b.dataset.color){PE.color=b.dataset.color;peToolbar();return}
    const a=b.dataset.pe;if(a==='close'){closeEditor();return}if(a==='undo'){PE.items.pop();peDraw();return}
    if(a==='skipcrop'){finishCrop(null);return}if(a==='docrop'){if(!PE.crop||Math.abs(PE.crop.x2-PE.crop.x1)<20){toast('גוררים קודם מלבן סביב הדירה');return}finishCrop(PE.crop);return}
    if(a==='save'){savePlan();return}});
  st.addEventListener('pointerover',e=>{if(e.pointerType==='pen'){const r=st.getBoundingClientRect();PE.hover={x:e.clientX-r.left,y:e.clientY-r.top,t:performance.now()}}});st.addEventListener('pointerdown',pd);st.addEventListener('pointermove',pm);st.addEventListener('pointerup',pu);st.addEventListener('pointercancel',pu);
  st.addEventListener('contextmenu',e=>e.preventDefault());
  st.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,e.deltaY<0?1.12:1/1.12)},{passive:false});
  addEventListener('resize',onPeResize)}
function onPeResize(){if(PE)syncCanvas()}
function syncCanvas(){const st=$('#peStage').getBoundingClientRect();const dpr=devicePixelRatio||1;const w=Math.round(st.width*dpr),h=Math.round(st.height*dpr);if(PE.cv.width!==w||PE.cv.height!==h){PE.cv.width=w;PE.cv.height=h;PE.dpr=dpr}peDraw()}
function zoomAt(x,y,f){const v=PE.view;const ns=Math.max(.05,Math.min(20,v.s*f));const k=ns/v.s;v.x=x-(x-v.x)*k;v.y=y-(y-v.y)*k;v.s=ns;peDraw()}
const DLOG=[];
function penDiag(e){const d=$('#penDiag');if(!d)return;if(e.type==='pointermove'&&!e.buttons)return; // skip hover noise
  const h=PE&&PE.hover?Math.round(performance.now()-PE.hover.t)+'ms':'-';
  DLOG.unshift(`${e.type.replace('pointer','')} ${e.pointerType} b=${e.button} bs=${e.buttons} p=${(e.pressure||0).toFixed(2)} w=${Math.round(e.width||0)} h=${Math.round(e.height||0)} hover=${h}`);DLOG.length=Math.min(DLOG.length,6);d.textContent=DLOG.join('\n')}
// The Samsung pen with its side button held may arrive as a "touch". It is still the pen when the pen was hovering at the same spot a moment ago, or when the contact is pen-sized.
function penAsTouch(e,x,y){const h=PE.hover;if(h&&performance.now()-h.t<600&&Math.hypot(h.x-x,h.y-y)<80)return true;return (e.width<=3&&e.height<=3&&e.pressure>=.99)}
function pd(e){penDiag(e);const st=$('#peStage');try{st.setPointerCapture(e.pointerId)}catch(_){}const r=st.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
  if(e.pointerType==='touch'){
    if(PE.mode!=='crop'&&!PE.penActive&&penAsTouch(e,x,y)){PE.erasing=true;PE.erasePtr=e.pointerId;$('#peMsg').textContent='מחיקה (כפתור העט לחוץ)';eraseAt(s2w(x,y),14/PE.view.s);return}
    if(PE.penActive)return; // palm resting while writing with the pen
    if(PE.mode==='crop'&&PE.pointers.size===0){PE.pointers.set(e.pointerId,{x,y,crop:true});const w=s2w(x,y);PE.crop={x1:w.x,y1:w.y,x2:w.x,y2:w.y};PE.drag=true;peDraw();return}
    for(const [k,v] of PE.pointers){if(v.crop){v.crop=false;PE.drag=false;PE.crop=PE.prevCrop||null}}
    PE.pointers.set(e.pointerId,{x,y});return}
  PE.penActive=e.pointerType==='pen';
  const w=s2w(x,y);const px=1/PE.view.s;
  if(PE.mode!=='crop'&&e.pointerType==='pen'&&((e.buttons&2)||(e.buttons&32)||e.button===2||e.button===5)){PE.erasing=true;$('#peMsg').textContent='מחיקה (כפתור העט לחוץ)';eraseAt(w,14*px);return}
  if(PE.mode==='crop'){PE.prevCrop=PE.crop;PE.crop={x1:w.x,y1:w.y,x2:w.x,y2:w.y};PE.drag=true;peDraw();return}
  const t=PE.tool,c=PE.color,lw=Math.max(2,2.2*px*(e.pressure?(.6+e.pressure):1)),fs=Math.max(14,22*px);
  if(t==='pen')PE.cur={t:'pen',c,lw,p:[w]};
  else if(t==='measure')PE.cur={t:'measure',c,lw:Math.max(2,2.5*px),x1:w.x,y1:w.y,x2:w.x,y2:w.y,fs};
  else if(t==='area')PE.cur={t:'area',c:'#dc2626',lw:Math.max(2,2.5*px),p:[w],fs};
  else if(t==='check'){PE.items.push({t:'check',c,x:w.x,y:w.y,z:Math.max(16,26*px)})}
  else if(t==='text'){PE.penActive=false;askText('טקסט על התשריט','').then(v=>{if(v){PE.items.push({t:'text',c,x:w.x,y:w.y,txt:v,fs});peDraw()}})}
  else if(t==='erase'){eraseAt(w,14*px)}
  peDraw()}
function pm(e){penDiag(e);const st=$('#peStage');const r=st.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
  if(e.pointerType==='pen'&&!(e.pressure>0))PE.hover={x,y,t:performance.now(),btn:!!e.buttons}; // hovering (with or without the side button)
  if(PE.erasePtr===e.pointerId){eraseAt(s2w(x,y),14/PE.view.s);return}
  const ent=PE.pointers.get(e.pointerId);
  if(ent&&!ent.crop){const prev={x:ent.x,y:ent.y};ent.x=x;ent.y=y;
    if(PE.pointers.size===1){PE.view.x+=x-prev.x;PE.view.y+=y-prev.y;peDraw()}
    else{const others=[...PE.pointers.entries()].filter(([k])=>k!==e.pointerId).map(([,v])=>v);const o=others[0];
      const d0=Math.hypot(prev.x-o.x,prev.y-o.y),d1=Math.hypot(x-o.x,y-o.y);PE.view.x+=(x-prev.x)/2;PE.view.y+=(y-prev.y)/2;if(d0>4)zoomAt((x+o.x)/2,(y+o.y)/2,d1/d0);else peDraw()}
    return}
  if(e.pointerType==='touch'&&!ent)return;
  const w=s2w(x,y);
  if(PE.mode==='crop'){if(PE.drag){PE.crop.x2=w.x;PE.crop.y2=w.y;peDraw()}return}
  if(PE.erasing){eraseAt(w,14/PE.view.s);return}
  if(e.pointerType==='pen'&&PE.mode!=='crop'&&((e.buttons&2)||(e.buttons&32))){PE.cur=null;PE.erasing=true;$('#peMsg').textContent='מחיקה (כפתור העט לחוץ)';eraseAt(w,14/PE.view.s);return}
  if(!PE.cur)return;
  if(PE.cur.t==='pen'||PE.cur.t==='area'){const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];evs.forEach(ev=>PE.cur.p.push(s2w(ev.clientX-r.left,ev.clientY-r.top)))}
  else if(PE.cur.t==='measure'){PE.cur.x2=w.x;PE.cur.y2=w.y}
  peDraw()}
async function pu(e){penDiag(e);if(PE.erasePtr===e.pointerId){PE.erasePtr=null;PE.erasing=false;peToolbar();return}
  const ent=PE.pointers.get(e.pointerId);PE.pointers.delete(e.pointerId);
  if(ent&&!ent.crop)return;
  if(e.pointerType==='touch'&&!ent)return;
  if(e.pointerType==='pen')PE.penActive=false;
  if(PE.erasing){PE.erasing=false;peToolbar();return}
  if(PE.mode==='crop'){PE.drag=false;return}
  const it=PE.cur;PE.cur=null;if(!it)return;
  if(it.t==='pen'){if(it.p.length>1)PE.items.push(it)}
  else if(it.t==='measure'){if(Math.hypot(it.x2-it.x1,it.y2-it.y1)*PE.view.s<12){peDraw();return}peDraw();PE.cur=it;const v=await askText('מה המידה שנמדדה?','',true);PE.cur=null;if(v!==null){it.txt=v;PE.items.push(it)}}
  else if(it.t==='area'){if(it.p.length<3){peDraw();return}PE.cur=it;peDraw();const v=await askText('הערה לחריגה (לא חובה)','');PE.cur=null;if(v!==null){it.txt=v||'';PE.items.push(it)}}
  peDraw()}
function eraseAt(w,tol){let best=-1,bd=1e9;PE.items.forEach((it,i)=>{let d=1e9;
  if(it.t==='pen'||it.t==='area')d=Math.min(...it.p.map(q=>Math.hypot(q.x-w.x,q.y-w.y)));
  else if(it.t==='measure'){d=distSeg(w,{x:it.x1,y:it.y1},{x:it.x2,y:it.y2})}else d=Math.hypot(it.x-w.x,it.y-w.y)-(it.z||it.fs||0);
  if(d<bd){bd=d;best=i}});if(best>=0&&bd<tol*3){PE.items.splice(best,1);peDraw()}}
function distSeg(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const L=dx*dx+dy*dy;let t=L?((p.x-a.x)*dx+(p.y-a.y)*dy)/L:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function askText(title,val,num){return new Promise(res=>{const pop=document.createElement('div');pop.className='pop';pop.innerHTML=`<form class="box"><h3>${esc(title)}</h3><input class="t" id="askV" ${num?'inputmode="decimal"':''} value="${esc(val)}" autocomplete="off"><div class="row"><button class="btn primary" type="submit">אישור</button><button class="btn" type="button" id="askX">ביטול</button></div></form>`;
  document.body.appendChild(pop);const i=pop.querySelector('#askV');setTimeout(()=>i.focus(),50);
  pop.querySelector('form').onsubmit=ev=>{ev.preventDefault();pop.remove();res(i.value.trim())};pop.querySelector('#askX').onclick=()=>{pop.remove();res(null)}})}
async function finishCrop(c){let blob;
  if(PDFSRC){const {page,scale}=PDFSRC;let x=0,y=0,w=PE.img.width,h=PE.img.height;
    if(c){x=Math.max(0,Math.min(c.x1,c.x2));y=Math.max(0,Math.min(c.y1,c.y2));w=Math.min(PE.img.width-x,Math.abs(c.x2-c.x1));h=Math.min(PE.img.height-y,Math.abs(c.y2-c.y1))}
    const X=x/scale,Y=y/scale,W=w/scale,H=h/scale;$('#peMsg').textContent='מחדד את התשריט…';
    try{blob=await renderPdfRegion(page,sharpScale(W,H),X,Y,W,H)}catch(_){blob=null}
    PDFSRC=null}
  if(blob){}
  else if(c){const x=Math.max(0,Math.min(c.x1,c.x2)),y=Math.max(0,Math.min(c.y1,c.y2)),w=Math.min(PE.img.width-x,Math.abs(c.x2-c.x1)),h=Math.min(PE.img.height-y,Math.abs(c.y2-c.y1));
    const cv=document.createElement('canvas');cv.width=Math.round(w);cv.height=Math.round(h);cv.getContext('2d').drawImage(PE.img,x,y,w,h,0,0,w,h);blob=await new Promise(r=>cv.toBlob(r,'image/png'))}
  else{const cv=document.createElement('canvas');cv.width=PE.img.width;cv.height=PE.img.height;cv.getContext('2d').drawImage(PE.img,0,0);blob=await new Promise(r=>cv.toBlob(r,'image/png'))}
  const P=plansOf(cur);const id='p'+uid();const k='planbase:'+cur.id+':'+id;await blobPut(k,blob);
  const used=new Set(P.map(p=>p.label));const next=[...(cur.layout||[]).map(f=>f.floor).filter(Boolean)].find(f=>!used.has(f))||'';
  P.push({id,label:next,base:k,items:[]});planIdx=P.length-1;touch();await visitPut(cur);
  closeEditor(true);openEditor({mode:'draw',src:blob,items:[]})}
async function savePlan(){const p=plansOf(cur)[planIdx];if(p){p.items=PE.items;p.edited=new Date().toISOString()}touch();await visitPut(cur);closeEditor();toast('התשריט נשמר');renderVisit();fillPlanThumb()}
function closeEditor(silent){removeEventListener('resize',onPeResize);try{PE&&PE.ro&&PE.ro.disconnect()}catch(_){}$('#planEd')?.remove();PE=null;if(!silent&&cur&&tab==='plan'){renderVisit();fillPlanThumb()}}
async function renderPlanBlob(p){if(!p?.base)return null;const b=await blobGet(p.base);if(!b)return null;const img=await blobToImage(b);
  const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0);drawItems(ctx,p.items||[],0);
  return await new Promise(r=>cv.toBlob(r,'image/png'))}

/* ---------------- report + sync ---------------- */
function reportHtml(v,planPages){planPages=planPages||[];const sel=(k)=>{const a=v.sel[k]||[];const n=v.notes[k]||{};return a.map(x=>n[x]?`${x} (${n[x]})`:x).join(', ')+(n._?` · ${n._}`:'')};
  const cell=(l,x)=>x?`<td class="l">${esc(l)}</td><td class="v">${esc(x)}</td>`:'';
  const pairs=[];const push=(l,x)=>{if(x!==undefined&&x!==null&&String(x).trim()!=='')pairs.push([l,String(x)])};
  const sec=(title,list)=>{const p=[];list.forEach(([l,x])=>{if(x!==undefined&&x!==null&&String(x).trim()!=='')p.push([l,String(x)])});if(!p.length)return '';
    let rows='';for(let i=0;i<p.length;i+=2){rows+=`<tr>${cell(p[i][0],p[i][1])}${p[i+1]?cell(p[i+1][0],p[i+1][1]):'<td class="l"></td><td class="v"></td>'}</tr>`}
    return `<tr><td colspan="4" class="s">${esc(title)}</td></tr>${rows}`};
  const g=id=>SECTIONS.find(s=>s.id===id).groups.map(x=>[x.l,sel(x.k)+(x.extra||[]).map(e=>v.nums[e.k]?` · ${e.l} ${v.nums[e.k]}`:'').join('')]);
  const n=v.nums||{};const rooms=[n.rooms?n.rooms+' חדרים':'',n.halfRooms&&+n.halfRooms?n.halfRooms+' חצאי חדרים':''].filter(Boolean).join(' + ');
  const aptRows=[['קומה',[n.floor,n.bldFloors?'מתוך '+n.bldFloors:''].filter(Boolean).join(' ')],['דירה מס\'',n.aptNo],['חדרים',rooms],['קומות בדירה',n.aptLevels],['דירות בבניין',n.bldUnits],['דירות בכניסה',n.entryUnits],['דירות בקומה',n.floorUnits],['קומה אחרונה',v.yn?.lastFloor]];
  const head=[v.head.address,v.head.aptNo?'דירה '+v.head.aptNo:'',v.head.hood,v.head.city].filter(Boolean).join(', ');
  return `<html dir="rtl"><head><meta charset="utf-8"><style>
   @page{size:A4;margin:10mm}
   body{font-family:Arial,sans-serif;font-size:8.6pt;color:#1f3427;margin:0;direction:rtl}
   .h{border-bottom:2px solid #c99d47;padding-bottom:3px;margin-bottom:4px}
   .h b{font-size:12.5pt}.h span{color:#5b6f66}
   table{width:100%;border-collapse:collapse;table-layout:fixed}
   td{padding:2px 4px;border:1px solid #d6dfdb;vertical-align:top;word-wrap:break-word}
   td.l{width:15%;background:#eef3f1;font-weight:bold;color:#3b5247}
   td.v{width:35%}
   td.s{color:#1f3427;font-weight:bold;font-size:9.2pt;padding:4px 4px 1px;border:0;border-bottom:2px solid #c99d47}
   .t{white-space:pre-line}
   .pp{page-break-before:always;text-align:center}
   .pp h2{font-size:12pt;margin:0 0 6px;text-align:right;border-bottom:2px solid #c99d47}
   .pp img{max-width:100%;max-height:260mm}
  </style></head><body>
   <div class="h"><b>טופס ביקור בנכס ${esc(v.caseNo||'')}</b> &nbsp; <span>${esc(head)}</span></div>
   <table>
    ${sec('פרטי הביקור',[['תאריך ושעה',(fmtDate(v.head.date)+' '+(v.head.time||'')).trim()],['עורך הביקור',v.head.visitor],['מציג הנכס',v.head.presenter],['מחזיק בפועל',v.head.occupant]])}
    ${sec('סביבה',g('env'))}
    ${sec('בניין',g('bld'))}
    ${sec('דירה',aptRows)}
    ${v.text.layout?`<tr><td class="l">חלוקה פנימית</td><td class="v t" colspan="3">${esc(v.text.layout)}</td></tr>`:''}
    ${sec('גמרים',g('fin'))}
    ${sec('מטבח וחוץ',g('kit'))}
    ${v.text.deviations||v.text.remarks?`<tr><td colspan="4" class="s">חריגות והערות</td></tr>${v.text.deviations?`<tr><td class="l">חריגות בנייה</td><td class="v t" colspan="3">${esc(v.text.deviations)}</td></tr>`:''}${v.text.remarks?`<tr><td class="l">הערות</td><td class="v t" colspan="3">${esc(v.text.remarks)}</td></tr>`:''}`:''}
   </table>
   <div style="color:#5b6f66;margin-top:3px">${v.photos.length} תמונות בתיקייה "תמונות"${planPages.length?` · ${planPages.length>1?planPages.length+' תשריטים מסומנים בעמודים הבאים':'התשריט המסומן בעמוד הבא'}`:''}</div>
   ${planPages.map(pp=>`<div class="pp"><h2>תשריט${pp.label?' – '+esc(pp.label):''} · סימוני הביקור ${esc(v.caseNo||'')}</h2><img src="${pp.url}"></div>`).join('')}
  </body></html>`}
async function planJpegDataUrl(p){const b=await renderPlanBlob(p);if(!b)return '';const img=await blobToImage(b);const s=Math.min(1,3200/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85)}
function visitData(v){const out={layout:v.layout||null,caseNo:v.caseNo,caseId:v.caseId,head:v.head,nums:v.nums,yn:v.yn,text:v.text,sel:v.sel,notes:v.notes,
  labels:Object.fromEntries(SECTIONS.flatMap(s=>(s.groups||[]).map(g=>[g.k,g.l]))),photos:v.photos.map(p=>p.name),plans:plansOf(v).map(p=>p.label||''),app:VERSION,updated:v.updated};return out}
async function syncVisit(){if(!navigator.onLine){toast('אין חיבור לאינטרנט. הכול שמור בטאבלט, אפשר להעלות כשיהיה WiFi.');return}
  if(!cfg.bridge){toast('החיבור לדרייב עוד לא הוגדר (במסך הראשי ← הגדרות)');return}
  const btn=document.querySelector('[data-act="sync"]');const set=t=>{if(btn){btn.textContent=t;btn.disabled=true}};
  try{let i=0;const total=cur.photos.filter(p=>!p.up).length;
    for(const p of cur.photos){if(p.up)continue;i++;set(`מעלה תמונה ${i}/${total}…`);const b=await blobGet(p.k);if(!b){p.up=true;continue}
      const r=await bridgePost({action:'upload',folderId:cur.folderId,caseNo:cur.caseNo,sub:'תמונות',name:p.name,mime:'image/jpeg',data:await blobToB64(b)});if(r.folderId&&!cur.folderId)cur.folderId=r.folderId;p.up=true;await visitPut(cur)}
    set('מעלה טופס…');const pages=[];for(const p of plansOf(cur)){const url=await planJpegDataUrl(p);if(url)pages.push({label:p.label,url})}
    const r=await bridgePost({action:'visit',folderId:cur.folderId,caseNo:cur.caseNo,json:JSON.stringify(visitData(cur)),html:reportHtml(cur,pages)});if(r.folderId&&!cur.folderId)cur.folderId=r.folderId;
    cur.synced=new Date().toISOString();cur.dirtyAfterSync=false;await visitPut(cur);toast('הביקור הועלה לתיקיית התיק בדרייב ✓',3500)}
  catch(e){toast(['dev','notjson'].includes(e.message)?errText(e):e.message==='key'?'המפתח שגוי. בדקו את ההגדרות.':e.message==='nofolder'?'לא נמצאה תיקיית התיק בדרייב. בדקו את מספר התיק.':'ההעלאה נעצרה. מה שהועלה נשמר, ואפשר ללחוץ שוב כדי להמשיך.',4500);await visitPut(cur)}
  renderVisit();if(tab==='photos')fillThumbs();if(tab==='plan')fillPlanThumb()}

/* ---------------- events ---------------- */
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='backBtn'){if(cur)await visitPut(cur);return home()}
  if(b.dataset.open)return openVisit(b.dataset.open);
  if(b.dataset.start)return startVisit(b.dataset.start);
  const a=b.dataset.act;
  if(a==='refresh')return refreshCases();
  if(a==='manual'){const v=newVisit(null);await visitPut(v);cur=v;tab='head';return renderVisit()}
  if(a==='savecfg'){cfg.visitor=$('#cfgVisitor').value.trim();cfg.bridge=$('#cfgBridge').value.trim();cfg.key=$('#cfgKey').value.trim();cfg.penDiag=$('#cfgPenDiag').checked;await kvSet('cfg',cfg);toast('ההגדרות נשמרו');return home()}
  if(!cur)return;
  if(b.dataset.tab){await visitPut(cur);tab=b.dataset.tab;renderVisit();if(tab==='photos')fillThumbs();if(tab==='plan')fillPlanThumb();return}
  if(b.dataset.g){const g=SECTIONS.flatMap(s=>s.groups||[]).find(x=>x.k===b.dataset.g);const v=b.dataset.v;let a2=cur.sel[g.k]||[];const multi=isMulti(g);
    if(a2.includes(v))a2=a2.filter(x=>x!==v);else a2=multi?[...a2,v]:[v];cur.sel[g.k]=a2;
    // a one-way street has one direction: keep only the first if the street stops being two-way/circular
    SECTIONS.flatMap(s=>s.groups||[]).filter(x=>x.mIf&&x.mIf.k===g.k&&!isMulti(x)&&(cur.sel[x.k]||[]).length>1).forEach(x=>{cur.sel[x.k]=cur.sel[x.k].slice(0,1)});
    touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.space!==undefined){const f=+b.dataset.space;const L=lay();
    if(addTo&&addTo.f===f){const it=L[f].items[addTo.i];(it.subs||(it.subs=[])).push(b.dataset.v)}else{L[f].items.push({n:b.dataset.v,subs:[]})}
    syncLayoutText();touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.incl){const [f,i]=b.dataset.incl.split(':').map(Number);addTo=addTo&&addTo.f===f&&addTo.i===i?null:{f,i};const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.hasAttribute('data-incldone')){addTo=null;const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.delitem){const [f,i]=b.dataset.delitem.split(':').map(Number);lay()[f].items.splice(i,1);addTo=null;syncLayoutText();touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.delsub){const [f,i,j]=b.dataset.delsub.split(':').map(Number);lay()[f].items[i].subs.splice(j,1);syncLayoutText();touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.mamadroom!==undefined){const fl=lay()[+b.dataset.mamadroom];fl.mamadRoom=!fl.mamadRoom;syncLayoutText();touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.hasAttribute('data-addfloor')){const L=lay();if(L.length===1&&!L[0].floor)L[0].floor='';L.push({floor:'',items:[],mamadRoom:false});addTo=null;touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.delfloor!==undefined){lay().splice(+b.dataset.delfloor,1);addTo=null;syncLayoutText();touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.yn){cur.yn[b.dataset.yn]=cur.yn[b.dataset.yn]===b.dataset.v?'':b.dataset.v;touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(b.dataset.inc||b.dataset.dec){const k=b.dataset.inc||b.dataset.dec;const s=+b.dataset.s||1;const n=parseFloat(cur.nums[k])||0;cur.nums[k]=String(Math.max(0,b.dataset.inc?n+s:n-s));touch();const i=document.querySelector(`[data-num="${k}"]`);if(i)i.value=cur.nums[k];return}
  if(b.dataset.quick){const k=b.dataset.quick;const t=(cur.text[k]||'').trim();cur.text[k]=t?t.replace(/[,،]?\s*$/,'')+', '+b.dataset.v:b.dataset.v;touch();const ta=document.querySelector(`[data-text="${k}"]`);if(ta)ta.value=cur.text[k];return}
  if(b.dataset.delph){const k=b.dataset.delph;cur.photos=cur.photos.filter(p=>p.k!==k);await blobDel(k);touch();renderVisit();fillThumbs();return}
  if(b.dataset.loadplan){const c=cases.find(x=>x.id===cur.caseId);const p=c?.plans?.find(x=>x.k===b.dataset.loadplan);const bl=await blobGet(b.dataset.loadplan);if(!bl){toast('הקובץ לא נמצא בטאבלט');return}return loadPlanSource(bl.type?bl:new Blob([bl],{type:p?.mime||''}))}
  if(b.dataset.editplan!==undefined){const i=+b.dataset.editplan;const p=plansOf(cur)[i];const bl=await blobGet(p.base);planIdx=i;return openEditor({mode:'draw',src:bl,items:JSON.parse(JSON.stringify(p.items||[]))})}
  if(b.dataset.delplan!==undefined){const i=+b.dataset.delplan;const P=plansOf(cur);const p=P[i];if(!p._sure){p._sure=1;setTimeout(()=>{delete p._sure},4000);renderVisit();return fillPlanThumb()}
    await blobDel(p.base);P.splice(i,1);touch();await visitPut(cur);renderVisit();return fillPlanThumb()}
  if(a==='sync')return syncVisit();
  if(a==='camera')return openCamera();
  if(a==='delvisit'){if(b.dataset.sure){for(const p of cur.photos)await blobDel(p.k);for(const p of plansOf(cur))await blobDel(p.base);await visitDel(cur.id);toast('הביקור נמחק מהטאבלט');return home()}b.dataset.sure='1';b.textContent='לחצו שוב כדי למחוק';return}
});
document.addEventListener('input',e=>{if(!cur)return;const t=e.target;
  if(t.dataset.head){cur.head[t.dataset.head]=t.value;if(t.dataset.head==='address'||t.dataset.head==='city'){cur.title=[cur.head.address,cur.head.city].filter(Boolean).join(', ')||'ביקור חדש'}touch();return}
  if(t.dataset.note){const k=t.dataset.note;(cur.notes[k]||(cur.notes[k]={}))[t.dataset.v]=t.value;touch();return}
  if(t.dataset.num){cur.nums[t.dataset.num]=t.value;touch();return}
  if(t.dataset.text){cur.text[t.dataset.text]=t.value;if(t.dataset.text==='layoutNote')syncLayoutText();touch();return}});
document.addEventListener('change',async e=>{const t=e.target;
  if(t.dataset.planlabel!==undefined&&cur){plansOf(cur)[+t.dataset.planlabel].label=t.value;touch();await visitPut(cur);return}
  if(t.dataset.floorname!==undefined&&cur){lay()[+t.dataset.floorname].floor=t.value;syncLayoutText();touch();const y=scrollY;renderVisit();scrollTo(0,y);return}
  if(t.dataset.photo!==undefined&&t.files?.length){const again=t.dataset.again!==undefined;await addPhotos([...t.files],again);t.value='';if(again){const n=document.querySelector('input[data-again]');if(n)try{n.click()}catch(_){}}return}
  if(t.dataset.planfile!==undefined&&t.files?.[0]){const f=t.files[0];t.value='';try{await loadPlanSource(f)}catch(_){toast('לא הצלחתי לפתוח את הקובץ')}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&cur)visitPut(cur)});

/* keyboard hints: Hebrew for text, digits for numbers */
const NUMERIC_HEAD=['aptNo'];
function kbHints(root){root.querySelectorAll('input:not([type=date]):not([type=time]):not([type=checkbox]):not([type=file]),textarea').forEach(el=>{
  if(el.dataset.kb)return;el.dataset.kb='1';
  if(el.dataset.head&&NUMERIC_HEAD.includes(el.dataset.head))el.setAttribute('inputmode','numeric');
  if(el.getAttribute('inputmode')==='decimal'||el.getAttribute('inputmode')==='numeric'){el.setAttribute('lang','en');el.setAttribute('dir','ltr');el.style.textAlign='center';return}
  if(el.getAttribute('dir')==='ltr')return; // urls, keys
  el.setAttribute('lang','he');el.setAttribute('dir','rtl');el.setAttribute('autocapitalize','off');el.setAttribute('autocorrect','off')})}
new MutationObserver(()=>kbHints(document.body)).observe(document.body,{childList:true,subtree:true});

/* ---------------- boot ---------------- */
(async()=>{netState();await loadCfg();
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('sw.js')}catch(_){}}
  home()})();
