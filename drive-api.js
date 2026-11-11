/* Google Drive app-data transport. Access tokens are supplied transiently by the caller. */
(function(root){
  'use strict';
  const API='https://www.googleapis.com/drive/v3';
  const UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
  const APPLICATION='building-ledger',MAX_BYTES=10*1024*1024,MULTIPART_BYTES=5*1024*1024,MAX_BACKUPS=1000;
  const FILE_FIELDS='id,name,mimeType,size,createdTime,modifiedTime,appProperties,spaces';
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(id);
  const bytes=value=>new TextEncoder().encode(value).byteLength;
  class DriveError extends Error{
    constructor(code,message,status=0){super(message);this.name='DriveError';this.code=code;this.status=status;}
  }
  const fail=(code,message,status=0)=>new DriveError(code,message,status);
  function create({getToken,fetchImpl=globalThis.fetch,validate,requestTimeoutMs=60000}={}){
    if(typeof getToken!=='function'||typeof fetchImpl!=='function')throw fail('configuration','Google Drive connection is not configured.');
    const timeoutMs=Number.isFinite(requestTimeoutMs)?Math.min(60000,Math.max(1,requestTimeoutMs)):60000;
    const requests=new WeakMap();
    const release=response=>{requests.get(response)?.();requests.delete(response);};
    async function checkedState(value){
      if(!value||typeof value!=='object'||Array.isArray(value))throw fail('invalid-data','This file does not contain a valid Building Ledger backup.');
      if(validate){try{if(await validate(value)===false)throw Error();}catch{throw fail('invalid-data','This file does not contain a valid Building Ledger backup.');}}
      return value;
    }
    async function operationToken(){
      let token;try{token=await getToken();}catch{throw fail('auth','Connect your Google account again.');}
      if(typeof token!=='string'||!token||/[\s\x00-\x1f\x7f]/.test(token))throw fail('auth','Connect your Google account again.');
      return token;
    }
    async function request(url,options={},token){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      let response;
      try{response=await fetchImpl(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});}
      catch{clearTimeout(timer);throw fail('network',controller.signal.aborted?'Google Drive timed out. Check your connection and try again.':'Could not contact Google Drive. Check your connection and try again.');}
      if(!response||typeof response.ok!=='boolean'){clearTimeout(timer);throw fail('invalid-response','Google Drive returned an unexpected response.');}
      requests.set(response,()=>clearTimeout(timer));
      if(!response.ok){
        let reasons=[];try{const error=await response.json();reasons=(error?.error?.errors||[]).map(e=>String(e.reason||''));}catch{}finally{release(response);}
        if(response.status===429||reasons.some(r=>/quota|ratelimit|dailylimit/i.test(r)))throw fail('quota','Google Drive could not complete the request because a storage or request limit was reached. Try again later or check your Drive storage.',response.status);
        if(reasons.includes('accessNotConfigured')||reasons.includes('serviceDisabled'))throw fail('configuration','Enable the Google Drive API for this OAuth project, then try again.',response.status);
        if(response.status===401||response.status===403)throw fail('auth','Google Drive access was denied or expired. Connect your account again and allow app-data access.',response.status);
        if(response.status===404)throw fail('not-found','This Drive backup is no longer available. Refresh the backup list.',response.status);
        throw fail('request-failed','Google Drive could not complete this request. Try again.',response.status);
      }
      return response;
    }
    async function jsonResponse(response){try{return await response.json();}catch{throw fail('invalid-response','Google Drive returned an unreadable response.');}finally{release(response);}}
    function checkFile(file,expectedId){
      if(!file||!validId(file.id)||(expectedId&&file.id!==expectedId)||file.appProperties?.application!==APPLICATION||file.mimeType!=='application/json')throw fail('invalid-file','This is not a Building Ledger app-data backup.');
      if(!Array.isArray(file.spaces)||!file.spaces.includes('appDataFolder'))throw fail('invalid-file','This backup is outside this app’s private Drive data folder.');
      if(file.size===undefined||!/^\d+$/.test(String(file.size)))throw fail('invalid-response','Google Drive did not report a valid backup size.');
      if(Number(file.size)>MAX_BYTES)throw fail('too-large','This backup is larger than the 10 MB restore limit.');
      return file;
    }
    async function list(){
      const token=await operationToken(),files=[],ids=new Set(),pages=new Set();let pageToken;
      for(let page=0;page<10;page++){
        const params=new URLSearchParams({spaces:'appDataFolder',q:"trashed = false and appProperties has { key='application' and value='building-ledger' }",fields:'nextPageToken,files('+FILE_FIELDS+')',orderBy:'createdTime desc',pageSize:'100'});
        if(pageToken)params.set('pageToken',pageToken);
        const data=await jsonResponse(await request(API+'/files?'+params,{},token));
        if(!data||!Array.isArray(data.files))throw fail('invalid-response','Google Drive returned an unreadable backup list.');
        for(const file of data.files){
          if(!file||!validId(file.id)||typeof file.name!=='string'||file.appProperties?.application!==APPLICATION||file.mimeType!=='application/json')throw fail('invalid-response','Google Drive returned an unexpected backup entry.');
          if(!ids.has(file.id)){ids.add(file.id);files.push(file);if(files.length===MAX_BACKUPS)break;}
        }
        if(!data.nextPageToken||files.length===MAX_BACKUPS)break;
        if(typeof data.nextPageToken!=='string'||pages.has(data.nextPageToken))throw fail('invalid-response','Google Drive repeated a backup-list page. Refresh and try again.');
        pages.add(data.nextPageToken);pageToken=data.nextPageToken;
      }
      return files;
    }
    async function upload(state){
      await checkedState(state);
      let content;try{content=JSON.stringify(state);}catch{throw fail('invalid-data','The current records could not be converted to a backup.');}
      const size=bytes(content);if(size>MAX_BYTES)throw fail('too-large','This backup exceeds the 10 MB upload limit. Export a local copy instead.');
      const token=await operationToken();
      const metadata={name:'building-ledger-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',mimeType:'application/json',parents:['appDataFolder'],appProperties:{application:APPLICATION,format:'v3'}};
      let result;
      if(size<=MULTIPART_BYTES){
        let boundary='building_ledger_'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
        while(content.includes(boundary))boundary+='x';
        const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+content+'\r\n--'+boundary+'--\r\n';
        result=await request(UPLOAD+'?'+new URLSearchParams({uploadType:'multipart',fields:FILE_FIELDS}),{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body},token);
      }else{
        const start=await request(UPLOAD+'?'+new URLSearchParams({uploadType:'resumable',fields:FILE_FIELDS}),{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/json','X-Upload-Content-Length':String(size)},body:JSON.stringify(metadata)},token);
        let location;try{location=new URL(start.headers.get('Location'));}catch{throw fail('invalid-response','Google Drive did not return a valid upload session.');}finally{release(start);}
        if(location.origin!=='https://www.googleapis.com'||location.pathname!=='/upload/drive/v3/files'||location.username||location.password||location.hash||location.searchParams.get('uploadType')!=='resumable'||!location.searchParams.get('upload_id'))throw fail('invalid-response','Google Drive returned an unexpected upload session.');
        result=await request(location.href,{method:'PUT',headers:{'Content-Type':'application/json; charset=UTF-8'},body:content},token);
      }
      const file=await jsonResponse(result);return checkFile(file);
    }
    async function read(fileId){
      if(!validId(fileId))throw fail('invalid-file','Choose a backup from the Drive backup list.');
      const token=await operationToken();
      const file=checkFile(await jsonResponse(await request(API+'/files/'+encodeURIComponent(fileId)+'?'+new URLSearchParams({fields:FILE_FIELDS}),{},token)),fileId);
      const response=await request(API+'/files/'+encodeURIComponent(fileId)+'?alt=media',{},token);
      try{
      const length=response.headers?.get?.('Content-Length');if(length!==null&&length!==undefined&&/^\d+$/.test(length)&&Number(length)>MAX_BYTES)throw fail('too-large','This backup is larger than the 10 MB restore limit.');
      let content;
      if(response.body?.getReader){
        const reader=response.body.getReader(),chunks=[];let size=0;
        try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw fail('too-large','This backup is larger than the 10 MB restore limit.');}chunks.push(part.value);}}
        catch(error){if(error instanceof DriveError)throw error;throw fail('network','The backup download was interrupted. Try again.');}
        finally{reader.releaseLock?.();}
        const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
        try{content=new TextDecoder('utf-8',{fatal:true}).decode(all);}catch{throw fail('invalid-response','This Drive backup is not valid UTF-8 JSON.');}
      }else{
        try{content=await response.text();}catch{throw fail('network','The backup download was interrupted. Try again.');}
        if(bytes(content)>MAX_BYTES)throw fail('too-large','This backup is larger than the 10 MB restore limit.');
      }
      let state;try{state=JSON.parse(content);}catch{throw fail('invalid-response','This Drive backup does not contain readable JSON.');}
      return {state:await checkedState(state),file};
      }finally{release(response);}
    }
    return {list,upload,read};
  }
  const api={create,DriveError,MAX_BYTES,MAX_BACKUPS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DriveAPI=api;
})(typeof window!=='undefined'?window:globalThis);
