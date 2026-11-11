(function(root){
  'use strict';
  const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
  const number=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
  const rates=[4.63,5.26,8.50,9.10,9.62,15.01,17.35],limits=[50,75,200,300,400,600,null];
  const id=()=>globalThis.crypto?.randomUUID?.()||'t'+Date.now().toString(36)+Math.random().toString(36).slice(2);
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const mainDefaults=()=>({prev:0,curr:0,units:0,direct:false,type:'postpaid',phase:'single',rent:10,demand:false,load:0,demandRate:42,vat:true,rebate:0.5,lifeline:true,rates:[...rates],limits:[...limits],preset:'2026-06'});
  const tenant=i=>({id:id(),name:'Flat '+i,phone:'',prev:0,curr:0,rate:'',arrears:0,extras:{service:0,gas:0,water:0,common:0,late:0},payments:[]});
  const month=key=>({key,due:'',rate:12,roundTaka:false,main:mainDefaults(),actual:'',tenants:Array.from({length:20},(_,i)=>tenant(i+1)),created:new Date().toISOString()});
  function initial(){const key=today().slice(0,7);return {version:3,building:'',address:'',lang:'en',messageLanguage:'en',banglaDigits:false,active:key,months:{[key]:month(key)},print:{readings:true,rate:true,charges:true,arrears:true,payments:true,due:true,phone:false,signature:true,note:true,compact:false},note:''};}
  function bill(t,m,asOf=m.finalizedAt||today()){
    const invalid=[t.prev,t.curr].some(v=>v===''||!Number.isFinite(Number(v))||Number(v)<0)||number(t.curr)<number(t.prev),units=invalid?0:round(number(t.curr)-number(t.prev));
    const rate=t.rate===''||t.rate==null?number(m.rate):number(t.rate),energy=round(units*rate);
    const beforeLate=round(energy+number(t.arrears)+Object.entries(t.extras).filter(([key])=>key!=='late').reduce((s,[,v])=>s+round(number(v)),0));
    const dueWithoutLate=m.roundTaka?Math.round(beforeLate):beforeLate;
    const paidByDue=round(t.payments.filter(p=>p.date&&m.due&&p.date<=m.due).reduce((s,p)=>s+number(p.amount),0));
    const lateApplies=m.due&&asOf>m.due&&paidByDue<dueWithoutLate;
    const extras=Object.entries(t.extras).map(([key,v])=>({key,amount:key==='late'&&!lateApplies?0:round(number(v))}));
    const arrears=round(number(t.arrears)),subtotal=round(energy+extras.reduce((s,e)=>s+e.amount,0)+arrears),total=m.roundTaka?Math.round(subtotal):subtotal;
    const paid=round(t.payments.reduce((s,p)=>s+number(p.amount),0)),balance=round(total-paid);
    return {invalid,units,rate,energy,extras,arrears,total,adjustment:round(total-subtotal),paid,balance,status:balance<=0?'paid':paid>0?'partial':'unpaid'};
  }
  function mainBill(m){
    const a=m.main,units=a.direct?number(a.units):round(number(a.curr)-number(a.prev));
    if((!a.direct&&([a.prev,a.curr].some(v=>v===''||!Number.isFinite(Number(v))||Number(v)<0)||number(a.curr)<number(a.prev)))||(a.direct&&(!Number.isFinite(Number(a.units))||Number(a.units)<0)))throw Error('reading');
    if(a.rates.length!==7||a.limits.length!==7||a.limits[6]!==null||a.rates.some(x=>!Number.isFinite(Number(x))||Number(x)<0)||a.limits.slice(0,6).some((x,i)=>!Number.isFinite(Number(x))||Number(x)<=0||(i>0&&Number(x)<=Number(a.limits[i-1]))))throw Error('slabs');
    const lines=[];
    if(a.lifeline&&units<=a.limits[0])lines.push({units,rate:a.rates[0],amount:round(units*a.rates[0])});
    else {let used=0;for(let i=1;i<7;i++){const count=Math.min(units-used,(a.limits[i]??Infinity)-used);if(count>0)lines.push({units:count,rate:a.rates[i],amount:round(count*a.rates[i])});used+=Math.max(0,count);if(used>=units)break;}}
    const energy=round(lines.reduce((s,l)=>s+l.amount,0)),demand=a.demand?round(number(a.load)*number(a.demandRate)):0,vat=a.vat?round((energy+demand)*.05):0,rebate=a.type==='prepaid'?round(energy*number(a.rebate)/100):0,total=round(Math.max(0,energy+demand+vat+number(a.rent)-rebate));
    return {units,lines,energy,demand,vat,rebate,rent:number(a.rent),total,average:units?round(total/units):0};
  }
  function totals(m){return m.tenants.reduce((s,t)=>{const b=bill(t,m);s.units=round(s.units+b.units);s.billed=round(s.billed+b.total);s.paid=round(s.paid+b.paid);s.outstanding=round(s.outstanding+Math.max(0,b.balance));s.energy=round(s.energy+b.energy);s.invalid+=b.invalid?1:0;return s;},{units:0,billed:0,paid:0,outstanding:0,energy:0,invalid:0});}
  function nextKey(key){const [y,m]=key.split('-').map(Number);return m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0');}
  function carry(state){
    const m=state.months[state.active],key=nextKey(state.active);
    if(state.months[key])throw Error('exists');
    if(state.active!==Object.keys(state.months).sort().at(-1))throw Error('latest');
    if(m.tenants.some(t=>bill(t,m).invalid))throw Error('reading');mainBill(m);
    if(m.tenants.some(t=>bill(t,m).balance<0))throw Error('credit');
    const copy=JSON.parse(JSON.stringify(m));copy.key=key;copy.created=new Date().toISOString();copy.due='';copy.actual='';copy.carriedFrom=state.active;
    copy.main.prev=m.main.curr;copy.main.curr=m.main.curr;copy.main.units=0;
    copy.tenants=m.tenants.map(t=>({...JSON.parse(JSON.stringify(t)),prev:t.curr,curr:t.curr,arrears:Math.max(0,bill(t,m).balance),payments:[],carrySnapshot:{sourceKey:state.active,sourceTenantId:t.id,sourceBalance:bill(t,m).balance}}));
    state.months[key]=copy;state.active=key;return key;
  }
  function accountHistory(state,tenantId){
    return Object.keys(state.months).sort().flatMap(key=>{
      const m=state.months[key],tenant=m.tenants.find(t=>t.id===tenantId);
      return tenant?[{key,tenant,bill:bill(tenant,m)}]:[];
    });
  }
  function usageAlert(state,key,tenantId){
    const currentMonth=state.months[key],tenant=currentMonth?.tenants.find(t=>t.id===tenantId);
    if(!tenant)return null;
    const current=bill(tenant,currentMonth);
    if(current.invalid||current.units<=0)return null;
    const previous=accountHistory(state,tenantId).filter(row=>row.key<key&&!row.bill.invalid&&row.bill.units>0).slice(-3);
    if(!previous.length)return null;
    const average=previous.reduce((sum,row)=>sum+row.bill.units,0)/previous.length;
    if(average<=0||current.units<2*average||current.units-average<50)return null;
    return {current:current.units,average:round(average),months:previous.length,ratio:round(current.units/average),keys:previous.map(row=>row.key)};
  }
  function carrySource(state,targetKey,tenant){
    const target=state.months[targetKey],snapshot=tenant.carrySnapshot;
    const sourceKey=snapshot?.sourceKey||target?.carriedFrom;
    if(!sourceKey)return null;
    const sourceTenantId=snapshot?.sourceTenantId||tenant.id,source=state.months[sourceKey];
    const sourceTenant=source?.tenants.find(t=>t.id===sourceTenantId);
    const result={targetKey,sourceKey,sourceTenantId,tenantId:tenant.id,name:tenant.name,opening:round(number(tenant.arrears)),baseline:round(snapshot?Number(snapshot.sourceBalance):number(tenant.arrears)),inferred:!snapshot,expected:null,sourceBalance:null};
    if(!source)return {...result,reason:'source-month-missing'};
    if(!sourceTenant)return {...result,reason:'source-tenant-missing'};
    const sourceBill=bill(sourceTenant,source);
    if(sourceBill.invalid)return {...result,reason:'source-reading-invalid'};
    return {...result,expected:Math.max(0,sourceBill.balance),sourceBalance:sourceBill.balance,reason:sourceBill.balance<0?'source-credit':'source-balance-changed'};
  }
  function carryIssues(state,targetKey){
    const keys=targetKey===undefined?Object.keys(state.months).sort():[targetKey];
    return keys.flatMap(key=>{
      const target=state.months[key];
      if(!target)return [];
      return target.tenants.flatMap(tenant=>{
        const source=carrySource(state,key,tenant);
        if(!source)return [];
        return source.sourceBalance===null||round(source.sourceBalance)!==source.baseline?[source]:[];
      });
    });
  }
  function reviewCarry(state,targetKey,tenantId){
    const target=state.months[targetKey],tenant=target?.tenants.find(t=>t.id===tenantId);
    if(!tenant)throw Error('carry-source-missing');
    const source=carrySource(state,targetKey,tenant);
    if(!source||source.reason==='source-month-missing'||source.reason==='source-tenant-missing')throw Error('carry-source-missing');
    if(source.reason==='source-reading-invalid')throw Error('reading');
    tenant.carrySnapshot={sourceKey:source.sourceKey,sourceTenantId:tenant.carrySnapshot?.sourceTenantId||tenant.id,sourceBalance:source.sourceBalance,reviewedAt:today()};
    return tenant.carrySnapshot;
  }
  function migrate(old){
    const s=initial(),key=/^\d{4}-(0[1-9]|1[0-2])$/.test(old.billingMonth)?old.billingMonth:s.active,m=month(key);s.months={[key]:m};s.active=key;s.building=old.buildingName||'';
    m.rate=number(old.fixedRate??12);m.due=old.tenantDueDate||'';m.actual=old.mainBillOverride||'';
    Object.assign(m.main,{prev:number(old.prevReading),curr:number(old.currReading),units:number(old.mainUnits),direct:number(old.mainUnits)!==Math.max(0,number(old.currReading)-number(old.prevReading)),type:old.meterType||'postpaid',phase:old.meterPhase||'single',rent:number(old.meterRent??10),demand:!!old.applyDemand,load:number(old.loadKw),demandRate:number(old.demandRate??42),vat:old.applyVat!==false,rebate:number(old.prepaidRebateRate??.5),lifeline:old.applyLifeline!==false});
    if(Array.isArray(old.slabs)&&old.slabs.length===7){m.main.rates=old.slabs.map(x=>number(x.rate));m.main.limits=old.slabs.map(x=>x.upto===''?null:number(x.upto));m.main.preset='custom';}
    m.tenants=Array.from({length:Math.min(30,Math.max(1,parseInt(old.meterCount)||20))},(_,i)=>Object.assign(tenant(i+1),{name:old.subMeters?.[i]?.name||'Flat '+(i+1),prev:number(old.subMeters?.[i]?.prev),curr:number(old.subMeters?.[i]?.curr)}));return s;
  }
  function validate(s){
    const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),nonneg=v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=1e12,key=v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
    if(!obj(s)||s.version!==3||!obj(s.months)||!key(s.active)||!Object.hasOwn(s.months,s.active)||!['en','bn'].includes(s.lang)||typeof s.building!=='string'||typeof s.address!=='string'||typeof s.note!=='string'||!obj(s.print))throw Error('backup');
    if(Object.keys(s.months).length>600||typeof s.banglaDigits!=='boolean'||['readings','rate','charges','arrears','payments','due','phone','signature','note','compact'].some(k=>typeof s.print[k]!=='boolean'))throw Error('backup');
    if((s.print.language!==undefined&&!['en','bn'].includes(s.print.language))||(s.print.includeStatement!==undefined&&typeof s.print.includeStatement!=='boolean'))throw Error('backup');
    if(s.messageLanguage!==undefined&&!['en','bn'].includes(s.messageLanguage))throw Error('backup');
    const timestamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
    if((s.lastBackupAt!==undefined&&!timestamp(s.lastBackupAt))||(s.backupPendingSince!==undefined&&!timestamp(s.backupPendingSince))||(s.lastBackupMonth!==undefined&&(typeof s.lastBackupMonth!=='string'||!key(s.lastBackupMonth)))||(s.lastBackupDestination!==undefined&&!['download','google-drive'].includes(s.lastBackupDestination)))throw Error('backup');
    for(const [k,m] of Object.entries(s.months)){
      if(!key(k)||!obj(m)||m.key!==k||!nonneg(m.rate)||!obj(m.main)||!Array.isArray(m.tenants)||m.tenants.length<1||m.tenants.length>30||typeof m.due!=='string'||(m.due&&!/^\d{4}-\d{2}-\d{2}$/.test(m.due))||(m.actual!==''&&!nonneg(m.actual)))throw Error('backup');
      if(typeof m.roundTaka!=='boolean'||['direct','demand','vat','lifeline'].some(k=>typeof m.main[k]!=='boolean'))throw Error('backup');
      if(m.finalizedAt&&!/^\d{4}-\d{2}-\d{2}$/.test(m.finalizedAt))throw Error('backup');
      if(m.carriedFrom!==undefined&&(!key(m.carriedFrom)||m.carriedFrom>=k))throw Error('backup');
      if(!['prepaid','postpaid'].includes(m.main.type)||!['single','three'].includes(m.main.phase))throw Error('backup');
      const reading=v=>v===''||((typeof v==='number'||typeof v==='string')&&Number.isFinite(Number(v))&&Math.abs(Number(v))<=1e12);
      for(const p of ['prev','curr'])if(!reading(m.main[p]))throw Error('backup');
      for(const p of ['units','rent','load','demandRate','rebate'])if(!nonneg(m.main[p]))throw Error('backup');
      if(number(m.main.rebate)>100)throw Error('backup');mainBill({...m,main:{...m.main,direct:true}});
      const ids=new Set();for(const t of m.tenants){
        if(!obj(t)||typeof t.id!=='string'||!/^[\w-]{1,100}$/.test(t.id)||ids.has(t.id)||typeof t.name!=='string'||typeof t.phone!=='string'||!reading(t.prev)||!reading(t.curr)||!nonneg(t.arrears)||(t.rate!==''&&!nonneg(t.rate))||!obj(t.extras)||!Array.isArray(t.payments))throw Error('backup');
        ids.add(t.id);if(Object.keys(t.extras).length!==5)throw Error('backup');for(const p of ['service','gas','water','common','late'])if(!nonneg(t.extras[p]))throw Error('backup');
        if(t.carrySnapshot!==undefined){const c=t.carrySnapshot;if(!obj(c)||!key(c.sourceKey)||c.sourceKey>=k||typeof c.sourceTenantId!=='string'||!/^[\w-]{1,100}$/.test(c.sourceTenantId)||typeof c.sourceBalance!=='number'||!Number.isFinite(c.sourceBalance)||Math.abs(c.sourceBalance)>1e24||(c.reviewedAt!==undefined&&(typeof c.reviewedAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.reviewedAt))))throw Error('backup');}
        const pids=new Set();for(const p of t.payments){if(!obj(p)||!nonneg(p.amount)||typeof p.id!=='string'||pids.has(p.id)||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date))throw Error('backup');pids.add(p.id);}
      }
    }return s;
  }
  function csv(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{let x=String(v??'');if(/^[\s]*[=+\-@]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
  const api={round,number,rates,limits,id,today,tenant,month,initial,bill,mainBill,totals,nextKey,carry,accountHistory,usageAlert,carryIssues,reviewCarry,migrate,validate,csv};if(typeof module!=='undefined')module.exports=api;else root.Ledger=api;
})(typeof window!=='undefined'?window:globalThis);
