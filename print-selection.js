/* Session-only flat selection for the print center. No ledger or backup data is changed. */
const PrintSelection=(()=>{
  let context='',target='all',scope='all',skipZero=false,selected=new Set(),seen=new Set();
  const candidates=()=>m().tenants.filter(t=>target==='all'||t.id===target);
  function syncCandidates(){
    const records=candidates(),ids=new Set(records.map(t=>t.id));
    selected=new Set([...selected].filter(id=>ids.has(id)));
    for(const id of ids)if(!seen.has(id))selected.add(id);
    seen=ids;
    return records;
  }
  function configure(nextTarget='all'){
    const next=String(nextTarget),key=state.active+'|'+next;
    if(context!==key){context=key;target=next;scope='all';skipZero=false;selected=new Set();seen=new Set();}
    syncCandidates();
  }
  function ensure(){
    if(context!==state.active+'|'+target)configure(target);
    return syncCandidates();
  }
  function list(){
    return ensure().filter(t=>{
      const b=C.bill(t,m());
      if(skipZero&&b.total===0&&!b.invalid)return false;
      if(scope==='unpaid')return b.invalid||b.balance>0;
      if(scope==='custom')return selected.has(t.id);
      return true;
    });
  }
  function countLabel(){
    const total=ensure().length,count=list().length;
    return tr(`${num(count)} of ${num(total)} flats selected`,`${num(total)}টি ফ্ল্যাটের মধ্যে ${num(count)}টি নির্বাচিত`);
  }
  function billStatus(b){
    if(b.invalid)return tr('Check reading','রিডিং যাচাই করুন');
    if(b.balance<0)return tr('Credit available','অগ্রিম জমা');
    if(b.total===0)return tr('No charges','কোনো চার্জ নেই');
    if(b.balance===0)return tr('Paid','পরিশোধিত');
    return b.paid>0?tr('Partly paid','আংশিক পরিশোধিত'):tr('Unpaid','অপরিশোধিত');
  }
  function controls(){
    const records=ensure();
    const choices=[['all',target==='all'?tr('All flats','সব ফ্ল্যাট'):tr('This flat','এই ফ্ল্যাট')],['unpaid',tr('Unpaid balances, including partly paid','বকেয়া আছে, আংশিক পরিশোধিতসহ')],['custom',tr('Choose individual flats','আলাদা ফ্ল্যাট বাছুন')]];
    return `<section id="printSelection" class="print-selection" aria-labelledby="printSelectionHeading"><h3 id="printSelectionHeading">${tr('Flats to print','যে ফ্ল্যাটের বিল প্রিন্ট হবে')}</h3><label for="printScope">${tr('Print selection','প্রিন্টের জন্য বাছাই')}</label><select id="printScope" aria-describedby="printSelectionHelp">${choices.map(([value,label])=>`<option value="${value}" ${scope===value?'selected':''}>${label}</option>`).join('')}</select><p id="printSelectionHelp" class="hint">${tr('Unpaid includes every flat with an amount still due.','যে ফ্ল্যাটে টাকা বাকি আছে, সেটি অপরিশোধিত বাছাইয়ে থাকবে।')}</p><label class="check print-zero-option"><input id="printSkipZero" type="checkbox" ${skipZero?'checked':''}>${tr('Skip zero-total bills','মোট বিল শূন্য হলে বাদ দিন')}</label><p class="print-zero-help">${tr('Paid bills with a nonzero bill total remain eligible.','মোট বিল শূন্য নয় এমন পরিশোধিত বিল বাদ যাবে না।')}</p><fieldset id="printCustomSelection" class="print-custom-selection" ${scope==='custom'?'':'hidden'}><legend>${tr('Choose flats','ফ্ল্যাট বাছুন')}</legend><label class="check print-select-all"><input id="printSelectAll" type="checkbox" ${records.length&&records.every(t=>selected.has(t.id))?'checked':''}>${tr('Select all listed flats','তালিকার সব ফ্ল্যাট বাছুন')}</label><div class="print-flat-list" tabindex="0" aria-label="${tr('Flat checklist. Scroll to see more flats.','ফ্ল্যাটের বাছাই তালিকা। আরও ফ্ল্যাট দেখতে স্ক্রল করুন।')}">${records.map(t=>{
      const b=C.bill(t,m());
      return `<label class="print-flat-choice"><input type="checkbox" data-print-tenant="${esc(t.id)}" ${selected.has(t.id)?'checked':''}><span class="print-flat-identity"><strong>${esc(t.name)}</strong><small>${billStatus(b)}</small></span><span class="print-flat-balance">${b.invalid?'—':money(Math.abs(b.balance))}</span></label>`;
    }).join('')}</div><p class="print-list-hint">${tr('Scroll the checklist for more flats. Clear all to start a new selection.','আরও ফ্ল্যাটের জন্য তালিকা স্ক্রল করুন। নতুন বাছাই শুরু করতে সব টিক সরান।')}</p></fieldset><p id="printSelectionCount" class="print-selection-count" role="status" aria-live="polite">${countLabel()}</p></section>`;
  }
  function refresh(){
    const root=document.querySelector('#printSelection');if(!root)return;
    const records=ensure(),select=root.querySelector('#printScope'),zero=root.querySelector('#printSkipZero'),custom=root.querySelector('#printCustomSelection'),all=root.querySelector('#printSelectAll'),count=root.querySelector('#printSelectionCount');
    if(select)select.value=scope;
    if(zero)zero.checked=skipZero;
    if(custom)custom.hidden=scope!=='custom';
    if(all){const checked=records.filter(t=>selected.has(t.id)).length;all.checked=records.length>0&&checked===records.length;all.indeterminate=checked>0&&checked<records.length;all.disabled=!records.length;}
    root.querySelectorAll('[data-print-tenant]').forEach(el=>{el.checked=selected.has(el.dataset.printTenant);});
    if(count)count.textContent=countLabel();
  }
  function change(el){
    if(!el)return false;
    if(el.id==='printScope'){
      if(!['all','unpaid','custom'].includes(el.value))return false;
      scope=el.value;
    }else if(el.id==='printSkipZero')skipZero=!!el.checked;
    else if(el.id==='printSelectAll'){
      const records=ensure();
      if(el.checked)for(const t of records)selected.add(t.id);
      else for(const t of records)selected.delete(t.id);
    }else if(el.dataset&&Object.hasOwn(el.dataset,'printTenant')){
      const id=el.dataset.printTenant;if(!ensure().some(t=>t.id===id))return false;
      if(el.checked)selected.add(id);else selected.delete(id);
    }else return false;
    refresh();refreshPrintPreview();return true;
  }
  return {configure,controls,list,change,refresh,countLabel};
})();
