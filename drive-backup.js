/* Optional Google app-data backups. Credentials live only in this tab's closure. */
'use strict';
const DriveBackup=(()=>{
  const CONFIG='building-ledger-google-client',GUEST='building-ledger-guest-mode',SCOPE='https://www.googleapis.com/auth/drive.appdata';
  let guestRequested=false,clientId='',token='',expiresAt=0,epoch=0,busy='',files=[],listed=false,shown=20,pending=null,sdkPromise=null,message='',isError=false;
  try{clientId=localStorage.getItem(CONFIG)||'';guestRequested=localStorage.getItem(GUEST)==='1';}catch{}
  const validClient=value=>/^\d{5,}-[A-Za-z0-9_-]{5,}\.apps\.googleusercontent\.com$/.test(value);
  const connected=()=>!!token&&Date.now()+5000<expiresAt;
  const sdkReady=()=>!!window.google?.accounts?.oauth2?.initTokenClient;
  const copy=(en,bn)=>tr(en,bn);
  function status(en,bn,error=false){message=copy(en,bn);isError=error;paint();}
  function date(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString(state.lang==='bn'?'bn-BD':'en-GB',{timeZone:'Asia/Dhaka',dateStyle:'medium',timeStyle:'short'}):copy('Date unavailable','তারিখ পাওয়া যায়নি');}
  function action(name,label,disabled=false,primary=false,id=''){return `<button type="button" data-drive-action="${name}" ${id?`data-drive-id="${esc(id)}"`:''} ${disabled?'disabled':''} class="${primary?'primary':''}">${label}</button>`;}
  function loadSDK(){
    if(sdkReady())return Promise.resolve();
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
      const timer=setTimeout(()=>finish(false),15000);
      function finish(ok){clearTimeout(timer);script.onload=script.onerror=null;if(ok&&sdkReady())resolve();else{script.remove();sdkPromise=null;reject(Error('sdk'));}}
      script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.append(script);
    });return sdkPromise;
  }
  const saveLabel=()=>connected()?copy('Saved on this device','এই ডিভাইসে সংরক্ষিত'):copy('Guest · Saved on this device','অতিথি · এই ডিভাইসে সংরক্ষিত');
  function paint(){
    const saved=document.querySelector('#saveStatus');if(!storageBlocked&&saved?.dataset.saved==='true')saved.textContent=saveLabel();
    const panel=document.querySelector('#driveBackupPanel');if(!panel)return;
    const on=connected(),working=!!busy,origin=location.origin==='null'?'':location.origin;
    panel.innerHTML=`<div><h2>${copy('Google Drive backup','Google Drive ব্যাকআপ')}</h2><p>${copy('Keep versioned copies in Google’s private app-data folder. Restore them here on another device.','Google-এর ব্যক্তিগত অ্যাপ-ডেটা ফোল্ডারে আলাদা ব্যাকআপ রাখুন। অন্য ডিভাইসে এখান থেকে ফিরিয়ে আনুন।')}</p></div><div class="sheet sheet-body drive-card"><div class="drive-heading"><span class="drive-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17H6a4 4 0 0 1-.4-8A6.5 6.5 0 0 1 18 8a4.5 4.5 0 0 1 0 9h-1M12 20V11m-4 4 4-4 4 4"/></svg></span><div><h3>${copy('Your private backup space','আপনার ব্যক্তিগত ব্যাকআপ')}</h3><p>${on?copy('Connected for this tab','এই ট্যাবে সংযুক্ত'):copy('Guest mode · no account required','অতিথি মোড · অ্যাকাউন্ট লাগবে না')}</p></div></div><p class="hint">${copy('Backups happen when you press the button. Local edits do not sync automatically. These files are hidden from your normal Drive file list.','বোতাম চাপলে ব্যাকআপ হবে। স্থানীয় পরিবর্তন স্বয়ংক্রিয় সিঙ্ক হবে না। সাধারণ Drive ফাইলের তালিকায় এই ব্যাকআপ দেখা যাবে না।')}</p><div class="drive-actions">${action('connect',copy('Connect Google account','Google অ্যাকাউন্ট সংযুক্ত করুন'),!validClient(clientId)||working||on,true)}${action(on||working?'disconnect':'guest',copy('Use guest mode','অতিথি মোডে ব্যবহার করুন'))}${action('upload',copy('Back up to Google Drive','Google Drive-এ ব্যাকআপ নিন'),!on||working||storageBlocked)}${action('refresh',copy('Refresh backups','ব্যাকআপ তালিকা আনুন'),!on||working)}</div><p id="driveBackupStatus" class="drive-status${isError?' error':''}" role="status" aria-live="polite">${esc(busy?({auth:copy('Waiting for Google sign-in…','Google সাইন-ইনের অপেক্ষায়…'),list:copy('Loading backups…','ব্যাকআপ আসছে…'),upload:copy('Saving a new backup…','নতুন ব্যাকআপ সংরক্ষণ হচ্ছে…'),read:copy('Checking this backup…','ব্যাকআপ যাচাই হচ্ছে…')})[busy]:message||copy('Guest mode is ready. Readings, bills, printing and local JSON backups work without Google.','অতিথি মোড প্রস্তুত। Google ছাড়াই রিডিং, বিল, প্রিন্ট ও স্থানীয় JSON ব্যাকআপ ব্যবহার করুন।'))}</p>${on?`<div class="drive-backups"><h3>${copy('Saved versions','সংরক্ষিত ব্যাকআপ')}</h3>${files.length?`<ol>${files.slice(0,shown).map(file=>`<li class="drive-backup-row"><div><strong>${esc(date(file.createdTime||file.modifiedTime))}</strong><span>${esc(file.name)}</span><small>${Number.isFinite(Number(file.size))?esc(new Intl.NumberFormat(state.lang==='bn'?'bn-BD':'en-GB',{maximumFractionDigits:1}).format(Number(file.size)/1024))+' KB':''}</small></div>${action('restore',copy('Review & restore','দেখুন ও ফিরিয়ে আনুন'),working,false,file.id)}</li>`).join('')}</ol>${files.length>shown?action('more',copy('Show older backups','আগের ব্যাকআপ দেখুন'),working):''}`:listed?`<p class="drive-empty">${copy('No backups here yet. Save your first version above.','এখনও ব্যাকআপ নেই। উপরের বোতামে প্রথম ব্যাকআপ রাখুন।')}</p>`:''}</div>`:''}<details class="drive-setup" ${validClient(clientId)?'':'open'}><summary>${copy('Google connection setup','Google সংযোগের সেটআপ')}</summary><p class="hint">${copy('Create one Web OAuth client for this app, enable the Google Drive API, and paste its public client ID. Use the same client on every device.','এই অ্যাপের জন্য একটি Web OAuth ক্লায়েন্ট বানিয়ে Google Drive API চালু করুন এবং পাবলিক ক্লায়েন্ট ID দিন। সব ডিভাইসে একই ক্লায়েন্ট ব্যবহার করুন।')}</p><label for="googleClientId">${copy('Google OAuth client ID','Google OAuth ক্লায়েন্ট ID')}</label><input id="googleClientId" type="text" autocomplete="off" spellcheck="false" maxlength="250" value="${esc(clientId)}" placeholder="123456789-…apps.googleusercontent.com" ${working?'disabled':''}><div class="drive-setup-actions">${action('save-client',copy('Save client ID','ক্লায়েন্ট ID সংরক্ষণ'),working)}<a href="GOOGLE-DRIVE-SETUP.md" target="_blank" rel="noopener">${copy('Setup guide','সেটআপ নির্দেশিকা')} ↗</a></div><p class="hint">${copy('Authorized JavaScript origin for this device:','এই ডিভাইসের Authorized JavaScript origin:')} <code>${esc(origin||copy('Use the local server or HTTPS','লোকাল সার্ভার বা HTTPS ব্যবহার করুন'))}</code></p><p class="hint">${copy('Only app-data access is requested. No client secret is needed. Guest mode clears this tab’s token; your backups stay in Google.','শুধু অ্যাপ-ডেটার অনুমতি চাওয়া হবে। ক্লায়েন্ট সিক্রেট লাগবে না। অতিথি মোডে এই ট্যাবের টোকেন মুছবে; Google-এ ব্যাকআপ থাকবে।')}</p></details></div>`;
  }
  function mount(){
    if(view!=='settings')return;
    if(!document.querySelector('#driveBackupPanel')){const section=document.createElement('section');section.id='driveBackupPanel';section.className='settings-row no-print';document.querySelector('#workspace .settings-row:last-child')?.before(section);}
    paint();
    if(!guestRequested&&validClient(clientId)&&!sdkReady())loadSDK().catch(()=>{});
  }
  function disconnect(){
    epoch++;token='';expiresAt=0;busy='';files=[];listed=false;shown=20;pending=null;
    if(document.querySelector('#editor [data-action="drive-restore-confirm"]'))document.querySelector('#editor').close();
    status('Disconnected. Local records and Google backups have been kept.','সংযোগ বিচ্ছিন্ন হয়েছে। স্থানীয় হিসাব ও Google ব্যাকআপ রাখা হয়েছে।');
  }
  function useGuest(){
    guestRequested=true;try{localStorage.setItem(GUEST,'1');}catch{}
    disconnect();status('Guest mode is active. Records stay on this device; local JSON backup and all billing tools remain available.','অতিথি মোড চালু। হিসাব এই ডিভাইসে থাকবে; স্থানীয় JSON ব্যাকআপ ও সব বিলিং সুবিধা ব্যবহার করুন।');
  }
  function saveClient(){
    if(busy)return;const value=document.querySelector('#googleClientId').value.trim();
    if(value&&!validClient(value))return status('Enter a Web OAuth client ID ending in .apps.googleusercontent.com.','শেষে .apps.googleusercontent.com আছে এমন Web OAuth ক্লায়েন্ট ID লিখুন।',true);
    try{if(value)localStorage.setItem(CONFIG,value);else localStorage.removeItem(CONFIG);}catch{return status('The client ID could not be saved. Allow browser storage and try again.','ক্লায়েন্ট ID সংরক্ষিত হয়নি। ব্রাউজারের সংরক্ষণ চালু করে আবার চেষ্টা করুন।',true);}
    disconnect();clientId=value;status(value?'Client ID saved. Connect your Google account.':'Client ID removed.','ক্লায়েন্ট ID '+(value?'সংরক্ষিত। Google অ্যাকাউন্ট সংযুক্ত করুন।':'সরানো হয়েছে।'));
    if(value&&!guestRequested)loadSDK().catch(()=>status('Google sign-in could not load. Check your connection, then press Connect again.','Google সাইন-ইন লোড হয়নি। ইন্টারনেট যাচাই করে আবার সংযোগ করুন।',true));
  }
  function connect(){
    if(busy||connected()||!validClient(clientId))return;
    guestRequested=false;try{localStorage.removeItem(GUEST);}catch{}
    if(location.protocol==='file:')return status('Open start-app.cmd or an HTTPS installation to use Google sign-in.','Google সাইন-ইনে start-app.cmd অথবা HTTPS অ্যাপ খুলুন।',true);
    if(!sdkReady()){const loadingEpoch=epoch;status('Loading Google sign-in…','Google সাইন-ইন লোড হচ্ছে…');loadSDK().then(()=>{if(loadingEpoch===epoch)status('Google sign-in is ready. Press Connect Google account.','Google সাইন-ইন প্রস্তুত। সংযুক্ত করার বোতাম চাপুন।');}).catch(()=>{if(loadingEpoch===epoch)status('Google sign-in could not load. Check your connection and try again.','Google সাইন-ইন লোড হয়নি। ইন্টারনেট যাচাই করে আবার চেষ্টা করুন।',true);});return;}
    disconnect();const session=epoch;busy='auth';paint();
    try{const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SCOPE,include_granted_scopes:false,
      callback:response=>{
        if(session!==epoch)return;
        busy='';
        if(response.error||typeof response.access_token!=='string'||!response.access_token||!Number.isFinite(Number(response.expires_in))||Number(response.expires_in)<=5||!(response.scope||'').split(/\s+/).includes(SCOPE))return status('Google access was not granted. Connect again and allow app-data access.','Google অনুমতি পাওয়া যায়নি। আবার সংযোগ করে অ্যাপ-ডেটার অনুমতি দিন।',true);
        token=response.access_token;expiresAt=Date.now()+Number(response.expires_in)*1000;message=copy('Connected. Loading your backups.','সংযুক্ত। ব্যাকআপ আনা হচ্ছে।');isError=false;refresh();
      },error_callback:()=>{if(session!==epoch)return;busy='';status('Google sign-in was closed or blocked. Allow the popup and press Connect again.','Google সাইন-ইন বন্ধ বা আটকানো হয়েছে। পপআপের অনুমতি দিয়ে আবার সংযোগ করুন।',true);}
    });client.requestAccessToken({prompt:'select_account'});}catch{busy='';status('Google sign-in could not start. Check the client ID and authorized origin.','Google সাইন-ইন শুরু হয়নি। ক্লায়েন্ট ID ও অনুমোদিত origin যাচাই করুন।',true);}
  }
  function api(){return DriveAPI.create({getToken:()=>{if(!connected())throw Error('auth');return token;},validate:value=>C.validate(value)});}
  function failure(error){
    if(error.code==='auth'){busy='';token='';expiresAt=0;files=[];listed=false;pending=null;epoch++;}
    const messages={auth:['Google access expired or was denied. Connect again.','Google অনুমতি শেষ বা প্রত্যাখ্যাত হয়েছে। আবার সংযোগ করুন।'],network:['Google Drive could not be reached. Check the connection and try again.','Google Drive-এ পৌঁছানো যায়নি। ইন্টারনেট যাচাই করে আবার চেষ্টা করুন।'],configuration:['Enable the Google Drive API in the OAuth project, then try again.','OAuth প্রকল্পে Google Drive API চালু করে আবার চেষ্টা করুন।'],quota:['Google’s storage or request limit was reached. Check Drive storage or try later.','Google-এর স্টোরেজ বা অনুরোধের সীমা শেষ। Drive স্টোরেজ দেখুন অথবা পরে চেষ্টা করুন।'],'not-found':['That backup is no longer available. Refresh the list.','ব্যাকআপটি পাওয়া যাচ্ছে না। তালিকা আবার আনুন।'],'too-large':['Backups must be 10 MB or smaller. Export a local JSON copy instead.','ব্যাকআপ ১০ MB বা কম হতে হবে। স্থানীয় JSON কপি নিন।'],'invalid-data':['This is not a valid Building Ledger backup. Local records have been kept.','এটি সঠিক Building Ledger ব্যাকআপ নয়। স্থানীয় হিসাব রাখা হয়েছে।'],'invalid-file':['This is not a private Building Ledger backup. Local records have been kept.','এটি ব্যক্তিগত Building Ledger ব্যাকআপ নয়। স্থানীয় হিসাব রাখা হয়েছে।']};
    const text=messages[error.code]||['Google Drive could not complete this action. Try again.','Google Drive কাজটি শেষ করতে পারেনি। আবার চেষ্টা করুন।'];status(...text,true);
  }
  async function refresh(keepMessage=false){
    if(busy)return;const session=epoch;busy='list';paint();
    try{const result=await api().list();if(session!==epoch)return;files=result;listed=true;if(!keepMessage){message=copy(`${files.length} saved backup(s) found.`,`সংরক্ষিত ${num(files.length)}টি ব্যাকআপ পাওয়া গেছে।`);isError=false;}}
    catch(error){if(session!==epoch)return;failure(error);}
    finally{if(session===epoch){busy='';paint();}}
  }
  async function upload(){
    if(busy||storageBlocked)return;const session=epoch,source=state,fingerprint=JSON.stringify(state),at=new Date().toISOString();
    let snapshot;try{snapshot=C.validate(JSON.parse(fingerprint));snapshot.lastBackupAt=at;snapshot.lastBackupMonth=snapshot.active;snapshot.lastBackupDestination='google-drive';delete snapshot.backupPendingSince;}catch{return status('Current records could not be backed up. Export a local recovery copy.','বর্তমান হিসাবের ব্যাকআপ হয়নি। স্থানীয় পুনরুদ্ধার কপি নিন।',true);}
    busy='upload';paint();
    try{await api().upload(snapshot);if(session!==epoch)return;
      if(state===source&&JSON.stringify(state)===fingerprint&&!storageBlocked&&localStorage.getItem(KEY)===lastSavedRaw){state.lastBackupAt=at;state.lastBackupMonth=snapshot.active;state.lastBackupDestination='google-drive';delete state.backupPendingSince;save();Features.onSaved();message=copy('A new backup was saved to Google’s private app-data folder.','Google-এর ব্যক্তিগত অ্যাপ-ডেটা ফোল্ডারে নতুন ব্যাকআপ সংরক্ষিত হয়েছে।');}
      else message=copy('The earlier snapshot was saved. Records changed during upload; back up again to include the latest edits.','আগের কপি সংরক্ষিত। আপলোডের সময় হিসাব বদলেছে; সর্বশেষ পরিবর্তন রাখতে আবার ব্যাকআপ নিন।');
      isError=false;busy='';await refresh(true);
    }catch(error){if(session===epoch)failure(error);}
    finally{if(session===epoch){busy='';paint();}}
  }
  async function review(id){
    if(busy)return;if(storageBlocked&&recoveryRaw===null)return status('Reload the newer saved records before restoring a Drive backup.','Drive ব্যাকআপ ফেরানোর আগে নতুন সংরক্ষিত হিসাব পুনরায় লোড করুন।',true);
    const session=epoch;busy='read';pending=null;paint();
    try{const result=await api().read(id);if(session!==epoch)return;
      if(storageBlocked&&recoveryRaw===null)return;
      if(localStorage.getItem(KEY)!==lastSavedRaw){storageConflict();return;}
      const restored=C.validate(JSON.parse(JSON.stringify(result.state)));
      pending={state:restored,file:result.file,session,fingerprint:JSON.stringify(state),raw:localStorage.getItem(KEY),lastRaw:lastSavedRaw};
      modal(copy('Restore Google Drive backup?','Google Drive ব্যাকআপ ফিরিয়ে আনবেন?'),`<div class="drive-restore-summary"><p>${copy('Replace this device’s ledger with the reviewed backup. All saved months, readings and payments on this device will be replaced.','যাচাই করা ব্যাকআপ দিয়ে এই ডিভাইসের হিসাব প্রতিস্থাপন হবে। এই ডিভাইসের সব মাস, রিডিং ও পেমেন্ট বদলাবে।')}</p><dl><div><dt>${copy('Backup building','ব্যাকআপের ভবন')}</dt><dd>${esc(restored.building||'Building Ledger')}</dd></div><div><dt>${copy('Saved months','সংরক্ষিত মাস')}</dt><dd>${num(Object.keys(restored.months).length)}</dd></div><div><dt>${copy('Backup created','ব্যাকআপের তারিখ')}</dt><dd>${esc(date(result.file.createdTime))}</dd></div><div><dt>${copy('Current local building','বর্তমান স্থানীয় ভবন')}</dt><dd>${esc(state.building||'Building Ledger')}</dd></div></dl><p class="hint">${copy('First, this app will request a JSON download of your current local records. Keep that recovery file. Google backups stay unchanged.','প্রথমে বর্তমান স্থানীয় হিসাবের JSON ডাউনলোডের অনুরোধ হবে। পুনরুদ্ধারের সেই ফাইল রাখুন। Google ব্যাকআপ অপরিবর্তিত থাকবে।')}</p><p id="driveRestoreError" class="drive-status error" role="alert" hidden></p></div>`,btn(copy('Cancel','বাতিল'),'close')+btn(copy('Download local copy & restore','স্থানীয় কপি নিয়ে ফিরিয়ে আনুন'),'drive-restore-confirm','primary'));
    }catch(error){if(session===epoch)failure(error);}
    finally{if(session===epoch){busy='';paint();}}
  }
  function restoreError(en,bn){const el=document.querySelector('#driveRestoreError');if(el){el.hidden=false;el.textContent=copy(en,bn);}else status(en,bn,true);}
  function confirmRestore(){
    const preview=pending;if(!preview||!document.querySelector('#editor').open)return;
    if(preview.session!==epoch||!connected()){pending=null;return restoreError('Google connection changed or expired. Cancel and review this backup again.','Google সংযোগ বদলেছে বা শেষ হয়েছে। বাতিল করে ব্যাকআপ আবার দেখুন।');}
    if((storageBlocked&&recoveryRaw===null)||JSON.stringify(state)!==preview.fingerprint||localStorage.getItem(KEY)!==preview.raw||lastSavedRaw!==preview.lastRaw){pending=null;return restoreError('Local records changed after this preview. Cancel, reload if needed, and review the backup again.','দেখার পরে স্থানীয় হিসাব বদলেছে। বাতিল করে প্রয়োজনে পুনরায় লোড করুন ও ব্যাকআপ আবার দেখুন।');}
    try{
      const restored=C.validate(JSON.parse(JSON.stringify(preview.state)));
      backup();
      if(preview.session!==epoch||(storageBlocked&&recoveryRaw===null)||localStorage.getItem(KEY)!==lastSavedRaw)throw Error('changed');
      const raw=JSON.stringify(restored);localStorage.setItem(KEY,raw);
      state=restored;lastSavedRaw=raw;storageBlocked=false;recoveryRaw=null;pending=null;document.querySelector('#editor').close();query='';filter='all';render();
      notice(copy('Drive backup restored and saved on this device. Keep the downloaded recovery copy.','Drive ব্যাকআপ ফিরিয়ে এই ডিভাইসে সংরক্ষিত হয়েছে। ডাউনলোডের পুনরুদ্ধার কপি রাখুন।'));
    }catch{restoreError('Restore could not finish. Local records have been kept. Allow the recovery download and browser storage, then review and try again.','ফিরিয়ে আনা শেষ হয়নি। স্থানীয় হিসাব রাখা হয়েছে। পুনরুদ্ধার ডাউনলোড ও ব্রাউজারের সংরক্ষণ চালু করে আবার দেখুন ও চেষ্টা করুন।');}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-drive-action],[data-action="drive-restore-confirm"]');if(!button||button.disabled)return;
    if(button.dataset.action==='drive-restore-confirm')return confirmRestore();
    const name=button.dataset.driveAction;
    if(name==='save-client')saveClient();if(name==='connect')connect();if(name==='disconnect'||name==='guest')useGuest();if(name==='refresh')refresh();if(name==='upload')upload();if(name==='restore')review(button.dataset.driveId);if(name==='more'){shown+=20;paint();}
  });
  window.addEventListener('storage',event=>{if(event.key===GUEST){guestRequested=event.newValue==='1';if(guestRequested)useGuest();}if(event.key===CONFIG&&event.newValue!==clientId){disconnect();clientId=validClient(event.newValue||'')?event.newValue:'';paint();}});
  return {mount,saveLabel};
})();
