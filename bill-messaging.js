/* User-initiated message drafts. No messages are sent or marked delivered by this app. */
'use strict';
const BillMessaging=(()=>{
  const language=()=>state.messageLanguage||state.lang;
  function configure(){if(state.messageLanguage===undefined)state.messageLanguage=state.lang;}
  function languageControl(id){return `<label class="message-language-control" for="${id}">${tr('Message language','মেসেজের ভাষা')}<select id="${id}" data-field="state.messageLanguage"><option value="en" ${language()==='en'?'selected':''}>English</option><option value="bn" ${language()==='bn'?'selected':''}>বাংলা</option></select></label>`;}
  function syncControls(){document.querySelectorAll('[data-field="state.messageLanguage"]').forEach(select=>select.value=language());}
  function text(tenant,{compact=false}={}){
    const bill=C.bill(tenant,m());if(bill.invalid)throw Error('reading');
    const lang=language(),locale=lang==='bn'?'bn-BD':'en-GB',say=(en,bn)=>lang==='bn'?bn:en;
    const number=value=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value);
    const amount=value=>compact?(lang==='en'?'Tk ':'৳')+number(value):'৳'+new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
    const month=new Date(Number(state.active.slice(0,4)),Number(state.active.slice(5))-1,1).toLocaleDateString(locale,{month:compact?'short':'long',year:'numeric'});
    const due=m().due?new Date(m().due+'T12:00:00').toLocaleDateString(locale,{day:'numeric',month:'short',year:'numeric'}):'';
    const building=state.building||say('Electricity bill','বিদ্যুৎ বিল');
    if(compact){
      const lines=[building,tenant.name+' - '+month,say('Units','ইউনিট')+': '+number(bill.units),say('Total','মোট')+': '+amount(bill.total),say('Paid','জমা')+': '+amount(bill.paid),(bill.balance<0?say('Credit','অগ্রিম'):say('Due','বাকি'))+': '+amount(Math.abs(bill.balance))];
      if(due)lines.push(say('Pay by','শেষ তারিখ')+': '+due);
      return lines.join('\n');
    }
    const options=state.print,lines=[building,month+' · '+tenant.name];
    if(options.readings)lines.push(say('Readings','রিডিং')+': '+number(tenant.prev)+' → '+number(tenant.curr),say('Units','ইউনিট')+': '+number(bill.units));
    if(options.rate)lines.push(say('Rate','দর')+': '+amount(bill.rate));
    lines.push(say('Electricity','বিদ্যুৎ')+': '+amount(bill.energy));
    const labels={service:say('Service charge','সার্ভিস চার্জ'),gas:say('Gas share','গ্যাস বিল'),water:say('Water share','পানির বিল'),common:say('Common electricity','কমন বিদ্যুৎ'),late:say('Late fee','বিলম্ব ফি')};
    if(options.charges)for(const extra of bill.extras)if(extra.amount)lines.push(labels[extra.key]+': '+amount(extra.amount));
    if(options.arrears)lines.push(say('Previous arrears','আগের বকেয়া')+': '+amount(bill.arrears));
    lines.push(say('Bill total','মোট বিল')+': '+amount(bill.total));
    if(options.payments)lines.push(say('Paid','পরিশোধিত')+': '+amount(bill.paid));
    lines.push((bill.balance<0?say('Credit available','অগ্রিম জমা'):say('Balance due','প্রদেয় বকেয়া'))+': '+amount(Math.abs(bill.balance)));
    if(options.due&&due)lines.push(say('Pay by','শেষ তারিখ')+': '+due);
    if(options.note&&state.note)lines.push(state.note);
    return lines.join('\n');
  }
  function normalizePhone(value){
    let phone=String(value??'').trim().replace(/[০-৯]/g,d=>String(d.charCodeAt(0)-0x09e6));
    if(!/^[+\d\s().-]+$/.test(phone))return '';
    phone=phone.replace(/[\s().-]/g,'');
    if(phone.startsWith('+'))phone=phone.slice(1);else if(phone.startsWith('00'))phone=phone.slice(2);
    if(/^01\d{9}$/.test(phone))phone='88'+phone;
    if(!/^[1-9]\d{7,14}$/.test(phone)||phone.startsWith('880')&&!/^8801\d{9}$/.test(phone))return '';
    return phone;
  }
  function url(channel,phone,text){
    const number=normalizePhone(phone);if(!number)throw Error('phone');
    if(channel==='whatsapp')return 'https://wa.me/'+number+'?text='+encodeURIComponent(text);
    if(channel==='sms')return 'sms:+'+number+'?body='+encodeURIComponent(text);
    throw Error('channel');
  }
  function controls(t){return `<div class="tenant-message-actions"><span class="message-recipient">${esc(t.phone||tr('Message this bill','এই বিল মেসেজ করুন'))}</span><div><button type="button" data-action="whatsapp" data-id="${esc(t.id)}" aria-label="${tr('Open WhatsApp bill','হোয়াটসঅ্যাপে বিল খুলুন')} · ${esc(t.name)}">WhatsApp</button><button type="button" data-action="sms" data-id="${esc(t.id)}" aria-label="${tr('Open SMS bill','SMS-এ বিল খুলুন')} · ${esc(t.name)}">SMS</button></div></div>`;}
  function current(id){
    if(storageBlocked){notice(tr('Reload or restore the saved records before sharing a bill.','বিল শেয়ারের আগে সংরক্ষিত হিসাব আবার লোড বা ফিরিয়ে আনুন।'),true);return null;}
    if(localStorage.getItem(KEY)!==lastSavedRaw){storageConflict();return null;}
    const tenant=flat(id);if(!tenant)return null;
    const fields=[...document.querySelectorAll(`[data-tenant="${CSS.escape(id)}"] [data-reading]`)];
    if(tenant.rate===''){const shared=document.querySelector('[data-field="month.rate"]');if(shared)fields.push(shared);}
    const invalid=fields.find(field=>!field.disabled&&(!field.checkValidity()||field.type==='number'&&field.value===''));
    const values=[tenant.prev,tenant.curr,tenant.rate===''?m().rate:tenant.rate,tenant.arrears,...Object.values(tenant.extras),...tenant.payments.map(payment=>payment.amount)];
    if(invalid||values.some(value=>value!==''&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1e12))){invalid?.reportValidity();notice(tr('Correct this flat’s reading or rate before sharing. Use a nonnegative number within the allowed range.','শেয়ারের আগে এই ফ্ল্যাটের রিডিং বা দর ঠিক করুন। নির্ধারিত সীমার মধ্যে শূন্য বা ধনাত্মক সংখ্যা দিন।'),true);return null;}
    if(C.bill(tenant,m()).invalid)throw Error('reading');
    return tenant;
  }
  function contact(tenant,channel){
    $('#printStudio')?.close();
    modal(tr('Add tenant phone','ভাড়াটিয়ার ফোন দিন'),`<p>${tr('Save a phone number to open this flat’s bill message. Contact details can be updated after finalization.','এই ফ্ল্যাটের বিল মেসেজ খুলতে ফোন নম্বর সংরক্ষণ করুন। মাস চূড়ান্ত করার পরেও ফোন পরিবর্তন করা যায়।')}</p><form id="contactForm" data-id="${esc(tenant.id)}" data-month="${state.active}" data-channel="${channel}"><label>${tr('Tenant phone number','ভাড়াটিয়ার ফোন নম্বর')}<input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" required value="${esc(tenant.phone)}" placeholder="017XXXXXXXX / +88017XXXXXXXX" aria-describedby="contactHint contactError"></label><p id="contactHint" class="hint">${tr('Use 01XXXXXXXXX or an international number such as +8801XXXXXXXXX. Bangla digits are accepted.','01XXXXXXXXX অথবা +8801XXXXXXXXX-এর মতো আন্তর্জাতিক নম্বর দিন। বাংলা সংখ্যাও চলবে।')}</p><p id="contactError" class="field-error" role="alert"></p></form>`,btn(tr('Cancel','বাতিল'),'close')+`<button type="submit" form="contactForm" class="primary">${tr('Save & open','সংরক্ষণ ও খুলুন')} ${channel==='sms'?'SMS':'WhatsApp'}</button>`);
    $('#contactForm [name="phone"]').focus();
  }
  function launchSMS(href){const link=document.createElement('a');link.href=href;link.hidden=true;document.body.append(link);link.click();link.remove();}
  function send(channel,id){
    if(!['whatsapp','sms'].includes(channel))return;
    const tenant=current(id);if(!tenant)return;
    if(!normalizePhone(tenant.phone))return contact(tenant,channel);
    const href=url(channel,tenant.phone,text(tenant,{compact:channel==='sms'}));
    if(channel==='whatsapp'){
      window.open(href,'_blank','noopener,noreferrer');
      notice(tr('WhatsApp draft requested. Review the bill and tap Send in WhatsApp.','হোয়াটসঅ্যাপ খসড়া খোলার অনুরোধ করা হয়েছে। বিল দেখে হোয়াটসঅ্যাপে Send চাপুন।'));
    }else{
      BillMessaging.launchSMS(href);
      notice(tr('SMS draft requested. Tap Send in your messaging app. If text is missing, use Copy bill text in the bill preview.','SMS খসড়া খোলার অনুরোধ করা হয়েছে। মেসেজ অ্যাপে Send চাপুন। লেখা না এলে বিল প্রিভিউ থেকে বিলের লেখা কপি করুন।'));
    }
  }
  async function copy(id){
    const tenant=current(id);if(!tenant)return;const text=billText(tenant);
    try{await navigator.clipboard.writeText(text);notice(tr('Bill text copied. Paste it into your messaging app.','বিলের লেখা কপি হয়েছে। মেসেজ অ্যাপে পেস্ট করুন।'));}
    catch{
      if(storageBlocked)return;
      if(localStorage.getItem(KEY)!==lastSavedRaw){storageConflict();return;}
      $('#printStudio')?.close();modal(tr('Copy bill text','বিলের লেখা কপি করুন'),`<label>${tr('Message','মেসেজ')}<textarea id="messageCopyText" rows="12" readonly>${esc(text)}</textarea></label><p class="hint">${tr('Select and copy this text, then paste it into your messaging app.','এই লেখা সিলেক্ট করে কপি করুন, তারপর মেসেজ অ্যাপে পেস্ট করুন।')}</p>`,btn(tr('Close','বন্ধ করুন'),'close')+btn(tr('Select text','লেখা সিলেক্ট করুন'),'select-bill-text','primary'));
      $('#messageCopyText').focus();$('#messageCopyText').select();
    }
  }
  document.addEventListener('submit',event=>{
    const form=event.target;if(form.id!=='contactForm')return;event.preventDefault();
    if(!form.reportValidity())return;
    try{
      if(state.active!==form.dataset.month||storageBlocked){$('#contactError').textContent=tr('Records changed. Close this dialog and review the bill again.','হিসাব বদলেছে। এই উইন্ডো বন্ধ করে বিল আবার দেখুন।');return;}
      const tenant=current(form.dataset.id);if(!tenant)return;
      const value=form.elements.phone.value.trim();
      if(!normalizePhone(value)){$('#contactError').textContent=tr('Enter a complete mobile number, such as 01712345678 or +8801712345678.','সম্পূর্ণ মোবাইল নম্বর দিন, যেমন 01712345678 অথবা +8801712345678।');form.elements.phone.setAttribute('aria-invalid','true');form.elements.phone.focus();return;}
      tenant.phone=value;const channel=form.dataset.channel,id=tenant.id;$('#editor').close();render();send(channel,id);
    }catch(error){notice(errorText(error),true);}
  });
  return {normalizePhone,url,controls,send,copy,launchSMS,language,languageControl,configure,syncControls,text};
})();
