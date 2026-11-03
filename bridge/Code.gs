/**
 * ברוק · גשר בין אפליקציית הביקור לגוגל דרייב
 * רץ בחשבון Google שלך. מקבל מהטאבלט תמונות, תשריט ונתוני ביקור ושומר אותם בתיקיית התיק.
 * הסקריפט לא מוחק ולא מעביר לפח שום קובץ: הוא רק קורא קבצים ויוצר חדשים.
 *
 * לפני הפריסה: שנו את KEY למילה סודית משלכם (אותה מילה מוזנת במערכת התיקים).
 * גרסה 2: העלאת תמונות במקביל (מהיר יותר).
 */
const KEY = 'CHANGE-ME';
const PARENT_ID = '1pd6vpfouPGmAWrCkISrXzpz19cIxEunl'; // התיקייה "שומות פרטיות"

function doGet(e) {
  const p = e.parameter || {};
  if (p.key !== KEY) return out({ error: 'key' });
  try {
    if (p.action === 'ping') return out({ ok: true });
    if (p.action === 'cases') {
      // the office system writes a new bruck-cases-*.json each time; use the newest one
      const it = DriveApp.getFolderById(PARENT_ID).searchFiles("title contains 'bruck-cases' and trashed = false");
      let newest = null;
      while (it.hasNext()) { const f = it.next(); if (!newest || f.getDateCreated() > newest.getDateCreated()) newest = f; }
      return out(newest ? JSON.parse(newest.getBlob().getDataAsString('UTF-8')) : { cases: [] });
    }
    if (p.action === 'files') {
      const folder = DriveApp.getFolderById(p.folderId);
      const files = [];
      collect_(folder, files, 0);
      return out({ files: files });
    }
    if (p.action === 'file') {
      const f = DriveApp.getFileById(p.id);
      const blob = f.getBlob();
      return out({ name: f.getName(), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) });
    }
    return out({ error: 'action' });
  } catch (err) {
    return out({ error: 'fail', message: String(err) });
  }
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out({ error: 'json' }); }
  if (b.key !== KEY) return out({ error: 'key' });
  try {
    // fast path: a photo goes straight into a folder that "prep" already found, so several photos can upload side by side
    if (b.action === 'upload' && b.targetId) {
      const target = DriveApp.getFolderById(b.targetId);
      if (findFile_(target, b.name)) return out({ ok: true, skipped: true });
      const f = target.createFile(Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'application/octet-stream', b.name));
      return out({ ok: true, id: f.getId() });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const folder = caseFolder_(b);
      if (!folder) return out({ error: 'nofolder' });
      if (b.action === 'prep') {
        return out({ ok: true, folderId: folder.getId(), photosId: sub_(folder, 'תמונות').getId() });
      }
      if (b.action === 'upload') {
        const target = b.sub ? sub_(folder, b.sub) : folder;
        if (findFile_(target, b.name)) return out({ ok: true, folderId: folder.getId(), skipped: true });
        const f = target.createFile(Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'application/octet-stream', b.name));
        return out({ ok: true, id: f.getId(), folderId: folder.getId() });
      }
      if (b.action === 'visit') {
        // each upload is a new version with a time stamp; older versions stay untouched
        const no = b.caseNo ? ' ' + b.caseNo : '';
        const stamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH.mm');
        folder.createFile(Utilities.newBlob(b.json, 'application/json', 'ביקור בנכס' + no + ' (' + stamp + ').json'));
        const pdf = Utilities.newBlob(b.html, 'text/html', 'visit.html').getAs('application/pdf').setName('טופס ביקור בנכס' + no + ' (' + stamp + ').pdf');
        folder.createFile(pdf);
        return out({ ok: true, folderId: folder.getId() });
      }
      return out({ error: 'action' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return out({ error: 'fail', message: String(err) });
  }
}

function caseFolder_(b) {
  if (b.folderId) { try { return DriveApp.getFolderById(b.folderId); } catch (e) {} }
  if (!b.caseNo) return null;
  const it = DriveApp.getFolderById(PARENT_ID).getFoldersByName(b.caseNo);
  return it.hasNext() ? it.next() : null;
}
function sub_(folder, name) {
  const it = folder.getFoldersByName(name);
  return it.hasNext() ? it.next() : folder.createFolder(name);
}
function findFile_(folder, name) {
  const it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function collect_(folder, files, depth) {
  const it = folder.getFiles();
  const fname = folder.getName();
  while (it.hasNext()) {
    const f = it.next();
    const m = f.getMimeType();
    if (m === 'application/pdf' || m.indexOf('image/') === 0) files.push({ id: f.getId(), name: f.getName(), folder: depth ? fname : '', mime: m, size: f.getSize() });
  }
  if (depth < 1) {
    const sub = folder.getFolders();
    while (sub.hasNext()) collect_(sub.next(), files, depth + 1);
  }
}
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
