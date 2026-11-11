/* Reference PDF layout. Rendering is synchronous; locale changes are scoped and never saved. */
const PrintDesign=(()=>{
  function configure(){
    if(state.print.template!=='statement-slips-v1'){
      state.print.template='statement-slips-v1';state.print.compact=true;
      state.print.includeStatement=true;state.print.language=state.lang;
    }
  }
  function localize(render){
    const lang=state.lang,digits=state.banglaDigits;
    try{state.lang=state.print.language==='bn'?'bn':'en';state.banglaDigits=state.lang==='bn';return render();}
    finally{state.lang=lang;state.banglaDigits=digits;}
  }
  const language=()=>state.print.language==='bn'?'bn':'en';
  const name=()=>esc(state.building||tr('Building electricity billing','ভবনের বিদ্যুৎ বিল'));
  function uniqueRef(id,ids){let size=Math.min(8,id.length);while(size<id.length&&ids.some(other=>other!==id&&other.slice(0,size)===id.slice(0,size)))size++;return id.slice(0,size);}
  const ref=t=>'BILL-'+state.active.replace('-','')+'-'+uniqueRef(t.id,m().tenants.map(x=>x.id));
  const balanceTitle=b=>b.balance<0?tr('Credit available','অগ্রিম জমা'):tr('Balance due','প্রদেয় বকেয়া');
  const balanceValue=b=>money(Math.abs(b.balance));
  function header(type,reference,options={}){return localize(()=>`<div class="invoice-top ref-header"><div class="document-identity"><img src="icon.svg" width="34" height="34" alt=""><div><h2>${name()}</h2><p class="ref-subtitle">${type}</p>${state.address?`<p>${esc(state.address)}</p>`:''}</div></div><div class="invoice-type"><p>${tr('Billing month','বিলের মাস')}: <strong>${monthLabel(state.active)}</strong></p>${state.print.due&&options.showDue!==false?`<p>${tr('Due date','শেষ তারিখ')}: <strong>${dateLabel(m().due)}</strong></p>`:''}<p>${options.dateCaption||tr('Statement date','বিবরণীর তারিখ')}: ${dateLabel(options.date||m().finalizedAt||C.today())}</p><p class="document-reference">${esc(reference)}</p></div></div>`);}
  function footer(label,page,total){return `<footer class="ref-footer"><span>${name()} · ${tr('Electricity billing management','বিদ্যুৎ বিল ব্যবস্থাপনা')}</span><span>${label}${page?` · ${tr('Page','পৃষ্ঠা')} ${num(page)} ${tr('of','/')} ${num(total)}`:''}</span></footer>`;}
  function summary(label,value,unit='',tone=''){return `<div class="ref-stat ${tone}"><span>${label}</span><strong>${value}${unit?` <small>${unit}</small>`:''}</strong></div>`;}
  function statement(list){return localize(()=>{
    const a=m(),tenants=list||a.tenants,s=C.totals({...a,tenants}),o=state.print,credits=C.round(tenants.reduce((sum,t)=>sum+Math.max(0,-C.bill(t,a).balance),0));
    const custom=tenants.some(t=>t.rate!==''&&Number(t.rate)!==Number(a.rate));
    const columns=[{key:'flat',label:tr('Flat / unit','ফ্ল্যাট / ইউনিট'),val:t=>esc(t.name)}];
    if(o.readings)columns.push({key:'prev',label:tr('Previous','পূর্ববর্তী'),val:t=>num(t.prev)},{key:'curr',label:tr('Current','বর্তমান'),val:t=>num(t.curr)},{key:'units',label:tr('Units (kWh)','ইউনিট (কিলোওয়াট-ঘণ্টা)'),val:(t,b)=>num(b.units)});
    if(o.rate)columns.push({key:'rate',label:tr('Rate (৳)','দর (৳)'),val:(t,b)=>money(b.rate)});
    columns.push({key:'total',label:tr('Bill total (৳)','মোট বিল (৳)'),val:(t,b)=>money(b.total)});
    if(o.payments)columns.push({key:'paid',label:tr('Paid (৳)','পরিশোধিত (৳)'),val:(t,b)=>money(b.paid)});
    columns.push({key:'balance',label:tr('Balance (৳)','বকেয়া (৳)'),val:(t,b)=>b.balance<0?`${money(-b.balance)} ${tr('credit','অগ্রিম')}`:money(b.balance)});
    const rows=tenants.map(t=>{const b=C.bill(t,a);return `<tr>${columns.map(c=>`<td class="ref-col-${c.key}">${c.val(t,b)}</td>`).join('')}</tr>`;}).join('');
    const totals={units:num(s.units),total:money(s.billed),paid:money(s.paid),balance:money(C.round(s.billed-s.paid))};
    return `<article class="invoice ref-statement" lang="${language()}">${header(tr('Building electricity bill statement','ভবনের বিদ্যুৎ বিল বিবরণী'),'STATEMENT-'+state.active)}${tenants.length!==a.tenants.length?`<p class="ref-selection-scope">${tr('Selected flats','নির্বাচিত ফ্ল্যাট')}: ${num(tenants.length)} / ${num(a.tenants.length)}</p>`:''}<div class="ref-summary">${summary(tr('Total units consumed','মোট ব্যবহৃত ইউনিট'),num(s.units),'kWh','units')}${summary(tr('Total amount payable','মোট প্রদেয়'),money(s.outstanding),'','amount')}${summary(tr('Sub-meters','সাব-মিটার'),num(tenants.length),tr('flats','ফ্ল্যাট'),'meters')}</div>${o.rate?`<p class="ref-rate-note">${tr('Shared rate','সাধারণ দর')}: ${money(a.rate)} / ${tr('unit','ইউনিট')}${custom?' · '+tr('Some flats use a custom rate.','কিছু ফ্ল্যাটে নিজস্ব দর প্রযোজ্য।'):''}</p>`:''}<p class="ref-mobile-hint">${tr('Scroll the table sideways to view every column.','সব কলাম দেখতে টেবিলটি পাশে স্ক্রল করুন।')}</p><div class="ref-table-wrap"><table class="ref-table"><thead><tr>${columns.map(c=>`<th scope="col">${c.label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr>${columns.map((c,i)=>`<td>${i===0?tr('Total / net balance','মোট / নিট বকেয়া'):totals[c.key]||''}</td>`).join('')}</tr></tfoot></table></div>${credits?`<div class="document-credit-summary">${kv(tr('Amount due','প্রদেয় টাকা'),money(s.outstanding))}${kv(tr('Credit balances','অগ্রিম জমা'),money(credits))}${kv(tr('Net balance (due − credit)','নিট বকেয়া (প্রদেয় − অগ্রিম)'),money(C.round(s.billed-s.paid)))}</div>`:''}<div class="ref-statement-bottom"><section class="ref-terms"><h3>${tr('Billing notes & instructions','বিলের নোট ও নির্দেশনা')}</h3><p>${tr('Charges use the building’s shared rate or each flat’s custom rate.','ভবনের সাধারণ দর অথবা ফ্ল্যাটের নিজস্ব দর অনুযায়ী চার্জ হিসাব করা হয়েছে।')}</p>${o.due&&a.due?`<p>${tr('Please pay building management by','ভবনের ব্যবস্থাপনায় বিল দিন')}: <strong>${dateLabel(a.due)}</strong>.</p>`:''}<p>${tr('Report a reading discrepancy to building management.','রিডিংয়ে অমিল থাকলে ভবনের ব্যবস্থাপনাকে জানান।')}</p>${o.note&&state.note?`<p>${esc(state.note)}</p>`:''}</section>${o.signature?`<div class="ref-manager-signature">${tr('Building manager / committee','ভবনের ব্যবস্থাপক / কমিটি')}</div>`:''}</div>${footer(tr('Master statement','মূল বিবরণী'))}</article>`;
  });}
  function slip(t){return localize(()=>{
    const b=C.bill(t,m()),o=state.print;
    const line=(label,value,cls='')=>`<div class="ref-slip-line ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
    let rows='';
    if(o.readings)rows+=line(tr('Previous → current','পূর্ববর্তী → বর্তমান'),num(t.prev)+' → '+num(t.curr))+line(tr('Units used','ব্যবহৃত ইউনিট'),num(b.units)+' kWh');
    if(o.rate)rows+=line(tr('Rate per unit','ইউনিটপ্রতি দর'),money(b.rate));
    if(o.readings||o.rate)rows+=line(tr('Electricity charge','বিদ্যুৎ চার্জ'),money(b.energy));
    const extras=b.extras.filter(e=>e.amount);
    if(o.charges)rows+=extras.map(e=>line(extraLabel(e.key),money(e.amount))).join('');
    else if(extras.length)rows+=line(tr('Other charges','অন্যান্য চার্জ'),money(C.round(extras.reduce((s,e)=>s+e.amount,0))));
    if(o.arrears&&b.arrears)rows+=line(tr('Previous arrears','আগের বকেয়া'),money(b.arrears));
    if(b.paid){rows+=line(tr('Bill total','মোট বিল'),money(b.total));if(o.payments)rows+=line(tr('Payments received','প্রাপ্ত পেমেন্ট'),money(b.paid));}
    return `<article class="invoice ref-slip" lang="${language()}"><div class="ref-slip-building"><img src="icon.svg" width="16" height="16" alt=""><span>${name()}</span></div><div class="ref-slip-title"><h3>${esc(t.name)}</h3><span>${monthLabel(state.active)}</span></div><div class="ref-slip-details">${rows}</div>${o.phone&&t.phone?line(tr('Phone','ফোন'),esc(t.phone)):''}${o.due?line(tr('Pay by','শেষ তারিখ'),dateLabel(m().due),'ref-slip-due'):''}<div class="ref-slip-total"><span>${balanceTitle(b)}</span><strong>${balanceValue(b)}</strong></div><div class="ref-slip-meta"><span>${esc(ref(t))}</span><span>${b.total===0?tr('No charges','কোনো চার্জ নেই'):statusLabel(b.status)}</span></div>${o.signature?`<div class="ref-slip-signature"><span>${tr('Manager','ব্যবস্থাপক')} __________</span><span>${tr('Tenant','ভাড়াটিয়া')} __________</span></div>`:''}${o.note&&state.note?`<p class="ref-slip-note">${esc(state.note)}</p>`:''}</article>`;
  });}
  function slipsHeader(){return `<div class="ref-slips-header"><h2>${name()} — ${tr('Individual tenant bills','ভাড়াটিয়ার পৃথক বিল')}</h2><p>${tr('Distribute slips to respective flats','সংশ্লিষ্ট ফ্ল্যাটে স্লিপ বিতরণ করুন')} · ${monthLabel(state.active)}</p></div>`;}
  function slipPages(list,offset=0){return localize(()=>{
    if(!state.print.compact)return list.map(t=>`<section class="ref-paper ref-full-page">${slip(t)}${footer(tr('Tenant bill','ভাড়াটিয়ার বিল'))}</section>`).join('');
    // Measure at A4's printable width, independent of the phone/desktop preview width.
    const measure=document.createElement('div');measure.className='ref-print-measure';
    measure.innerHTML=slipsHeader()+`<div class="ref-slip-grid">${list.map(slip).join('')}</div>`+footer(tr('Tenant slips','ভাড়াটিয়ার স্লিপ'));
    document.body.appendChild(measure);
    const cards=[...measure.querySelectorAll('.ref-slip')],head=measure.querySelector('.ref-slips-header').getBoundingClientRect().height,foot=measure.querySelector('.ref-footer').getBoundingClientRect().height;
    const available=269*96/25.4-head-foot-28;
    const pages=[];let group=[],height=0;
    for(let i=0;i<list.length;i+=2){const rowHeight=Math.max(cards[i].getBoundingClientRect().height,cards[i+1]?.getBoundingClientRect().height||0)+10;
      if(group.length&&height+rowHeight>available){pages.push(group);group=[];height=0;}
      group.push(...list.slice(i,i+2));height+=rowHeight;
    }
    if(group.length)pages.push(group);measure.remove();
    return pages.map((group,i)=>`<section class="ref-paper ref-slip-page" lang="${language()}">${slipsHeader()}<div class="ref-slip-grid">${group.map(slip).join('')}</div>${footer(tr('Tenant slips','ভাড়াটিয়ার স্লিপ'),i+1+offset,pages.length+offset)}</section>`).join('');
  });}
  function packet(list,{includeStatement=false}={}){return localize(()=>`<div class="ref-document" lang="${language()}">${includeStatement?`<section class="ref-paper">${statement(list)}</section>`:''}${slipPages(list)}</div>`);}
  function voucher(t){
    const b=C.bill(t,m()),o=state.print;
    const entry=(label,value)=>`<div class="voucher-line"><span>${label}</span><strong>${value}</strong></div>`;
    const readings=o.readings?`<div class="voucher-readings">${[[tr('Previous','পূর্ববর্তী'),num(t.prev)],[tr('Current','বর্তমান'),num(t.curr)],[tr('Units','ইউনিট'),num(b.units)]].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`:'';
    const extras=b.extras.filter(e=>e.amount),extraTotal=C.round(extras.reduce((sum,e)=>sum+e.amount,0));
    let detail='';
    if(o.rate)detail+=entry(tr('Unit rate','ইউনিট দর'),money(b.rate));
    if(o.charges)detail+=extras.map(e=>entry(extraLabel(e.key),money(e.amount))).join('');
    else if(extraTotal)detail+=entry(tr('Other charges','অন্য চার্জ'),money(extraTotal));
    if(o.arrears&&b.arrears)detail+=entry(tr('Arrears','বকেয়া'),money(b.arrears));
    if(b.paid){detail+=entry(tr('Bill total','মোট বিল'),money(b.total));if(o.payments)detail+=entry(tr('Paid','পরিশোধিত'),money(b.paid));}
    if(o.phone&&t.phone)detail+=entry(tr('Phone','ফোন'),esc(t.phone));
    return `<article class="payment-voucher" lang="${language()}" data-voucher-id="${esc(t.id)}"><div class="voucher-building"><img src="icon.svg" width="13" height="13" alt=""><span>${name()}</span></div><div class="voucher-title"><h3>${esc(t.name)}</h3><span>${monthLabel(state.active)}</span></div>${readings}<div class="voucher-details">${detail}</div>${o.due?entry(tr('Due date','শেষ তারিখ'),dateLabel(m().due)):''}<div class="voucher-total"><span>${balanceTitle(b)}</span><strong>${balanceValue(b)}</strong></div><div class="voucher-reference"><span>${esc(ref(t))}</span><span>${b.balance<0?tr('Credit','অগ্রিম'):b.total===0?tr('No charges','চার্জ নেই'):statusLabel(b.status)}</span></div>${o.signature?`<div class="voucher-signatures"><span>${tr('Prepared','প্রস্তুত')} __________</span><span>${tr('Checked','যাচাই')} __________</span></div>`:''}${o.note&&state.note?`<p class="voucher-note">${esc(state.note)}</p>`:''}</article>`;
  }
  function voucherHeader(){return `<header class="voucher-page-header"><div><h2>${tr('Individual Payment Vouchers','পৃথক পেমেন্ট ভাউচার')}</h2><p>${name()} · ${monthLabel(state.active)}</p></div><span>${tr('Up to 15 per A4 page','প্রতি A4 পাতায় সর্বোচ্চ ১৫টি')}</span></header>`;}
  function vouchers(list){return localize(()=>{
    if(list.some(t=>C.bill(t,m()).invalid))throw Error('reading');
    if(!list.length)return '';
    const measure=document.createElement('div');measure.className='ref-print-measure voucher-measure';
    measure.innerHTML=voucherHeader()+`<div class="voucher-grid">${list.map(voucher).join('')}</div>`+footer(tr('Payment requests · not receipts','বিলের দাবি · রসিদ নয়'));
    document.body.appendChild(measure);
    const cards=[...measure.querySelectorAll('.payment-voucher')],head=measure.querySelector('.voucher-page-header').getBoundingClientRect().height,foot=measure.querySelector('.ref-footer').getBoundingClientRect().height;
    const available=268*96/25.4-head-foot-32;
    const pages=[];let group=[],height=0,rowCount=0;
    try{for(let i=0;i<list.length;i+=3){
      const rowHeight=Math.max(...cards.slice(i,i+3).map(card=>card.getBoundingClientRect().height))+8;
      if(rowHeight>available)throw Error('voucher-too-long');
      if(group.length&&(rowCount===5||height+rowHeight>available)){pages.push(group);group=[];height=0;rowCount=0;}
      group.push(...list.slice(i,i+3));height+=rowHeight;rowCount++;
    }if(group.length)pages.push(group);}finally{measure.remove();}
    return `<div class="ref-document voucher-document" lang="${language()}">${pages.map((group,i)=>`<section class="ref-paper voucher-page">${voucherHeader()}<div class="voucher-grid">${group.map(voucher).join('')}</div>${footer(tr('Payment requests · not receipts','বিলের দাবি · রসিদ নয়'),i+1,pages.length)}</section>`).join('')}</div>`;
  });}
  function mainStatement(){return localize(()=>{
    const b=C.mainBill(m());
    return `<div class="ref-document" lang="${language()}"><section class="ref-paper"><article class="invoice document-page">${header(tr('Main meter · calculator estimate','প্রধান মিটার · ক্যালকুলেটরের হিসাব'),'MAIN-'+state.active)}<div class="ref-summary">${summary(tr('Consumption','ব্যবহার'),num(b.units),'kWh')}${summary(tr('Calculated bill','হিসাবকৃত বিল'),money(b.total),'','amount')}${summary(tr('Average per unit','ইউনিটপ্রতি গড়'),money(b.average))}</div>${breakdown(b)}${m().actual!==''?`<div class="document-credit-summary">${kv(tr('Official bill used for reconciliation','মিলানোর জন্য ব্যবহৃত অফিসিয়াল বিল'),money(C.number(m().actual)))}</div>`:''}<div class="ref-terms section-gap"><h3>${tr('Calculation notes','হিসাবের নোট')}</h3><p>${tr('This is a residential tariff estimate. Verify the applicable rates, demand, rent, VAT and rebate against your official DPDC bill.','এটি আবাসিক ট্যারিফের আনুমানিক হিসাব। প্রযোজ্য দর, ডিমান্ড, ভাড়া, ভ্যাট ও রেয়াত অফিসিয়াল ডিপিডিসি বিলের সাথে যাচাই করুন।')}</p><p>${tr('Arrears and utility surcharges are not included in this estimate.','এই হিসাবে বিদ্যুৎ সংস্থার বকেয়া ও সারচার্জ অন্তর্ভুক্ত নয়।')}</p></div>${footer(tr('Main meter estimate','প্রধান মিটারের হিসাব'))}</article></section></div>`;
  });}
  function paymentReceipt(t,p){return localize(()=>{
    const b=C.bill(t,m()),receiptRef='RCPT-'+state.active.replace('-','')+'-'+uniqueRef(t.id,m().tenants.map(x=>x.id))+'-'+uniqueRef(p.id,t.payments.map(x=>x.id));
    return `<div class="ref-document" lang="${language()}"><section class="ref-paper"><article class="invoice document-page receipt-document">${header(tr('Payment receipt','পেমেন্ট রসিদ'),receiptRef,{showDue:false,dateCaption:tr('Payment date','পেমেন্টের তারিখ'),date:p.date})}<div class="document-recipient"><span>${tr('Received from','যার কাছ থেকে প্রাপ্ত')}</span><h3>${esc(t.name)}</h3><p>${tr('For billing month','বিলের মাস')}: ${monthLabel(state.active)}</p></div><div class="document-amount-panel"><span>${tr('Amount received','প্রাপ্ত টাকা')}</span><strong>${money(p.amount)}</strong><small>${dateLabel(p.date)}</small></div><div class="document-credit-summary">${kv(tr('Bill total','মোট বিল'),money(b.total))}${kv(tr('Total received for this billing month','এই বিল মাসে মোট প্রাপ্ত'),money(b.paid))}${kv(b.balance<0?tr('Current credit available','বর্তমান অগ্রিম জমা'):tr('Current remaining balance','বর্তমান অবশিষ্ট বকেয়া'),balanceValue(b))}</div>${p.note?`<div class="ref-terms section-gap"><h3>${tr('Payment note / reference','পেমেন্ট নোট / রেফারেন্স')}</h3><p>${esc(p.note)}</p></div>`:''}<p class="document-disclaimer">${tr('The balance shown reflects all payments currently recorded for this billing month.','প্রদর্শিত বকেয়ায় এই বিল মাসের বর্তমানে নথিভুক্ত সব পেমেন্ট ধরা হয়েছে।')}</p><div class="signature"><span>${tr('Collected by','আদায়কারীর স্বাক্ষর')}</span><span>${tr('Tenant signature','ভাড়াটিয়ার স্বাক্ষর')}</span></div>${footer(tr('Payment received','পেমেন্ট প্রাপ্ত'))}</article></section></div>`;
  });}
  function preview(target,output='bills',selected){const list=selected||(target==='all'?m().tenants:[flat(target)]);return output==='vouchers'?vouchers(list):output==='statement'?`<div class="ref-document" lang="${language()}"><section class="ref-paper">${statement(list)}</section></div>`:target==='all'?packet(list,{includeStatement:state.print.includeStatement!==false}):packet(list);}
  return {configure,localize,language,header,statement,slip,packet,preview,vouchers,mainStatement,paymentReceipt};
})();
