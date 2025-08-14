
if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'))}
const $=id=>document.getElementById(id);
const settings=Object.assign({biz:"TIMEFINDR WATCHES",email:"ventas@timefindr.com",phone:"+52 55 6318 4206",addr:"169 East Flagler St, Suite 1629, Miami, FL 33131",prefix:"TF",tax:0,cur:"USD",terms:"Propiedad hasta pago total.",logo:null,clabe:"",wire:"",stripe:"",crypto:"",theme:"auto"},JSON.parse(localStorage.getItem('settings')||'{}'));

function applyTheme(){
  let mode = settings.theme || 'auto';
  if(mode==='auto'){
    const h = new Date().getHours();
    // Modo claro de 7:00 a 18:59, oscuro resto
    mode = (h>=7 && h<19)?'light':'dark';
  }
  document.documentElement.classList.toggle('light', mode==='light');
  // theme-color for PWA status bar
  const meta = document.querySelector('meta[name="theme-color"]');
  meta && (meta.content = mode==='light' ? '#E6E2D3' : '#0D1E17');
}

function applySettings(){
  ['biz','email','phone','addr','prefix','terms','clabe','wire','stripe','crypto'].forEach(k=>{const el=$('s-'+k);if(el) el.value=settings[k]||''});
  $('s-tax').value=settings.tax; $('s-cur').value=settings.cur; $('s-theme').value=settings.theme||'auto';
  const fallback='icons/icon-512.png'; $('brand-logo').src=settings.logo||fallback;
  $('y').textContent=new Date().getFullYear(); $('today').textContent=new Date().toLocaleDateString('es-MX');
  applyTheme();
}
applySettings();

function saveSettings(){
  Object.assign(settings,{
    biz:$('s-biz').value,email:$('s-email').value,phone:$('s-phone').value,addr:$('s-addr').value,
    prefix:$('s-prefix').value||'TF',tax:parseFloat($('s-tax').value||0),cur:$('s-cur').value,terms:$('s-terms').value,
    clabe:$('s-clabe').value,wire:$('s-wire').value,stripe:$('s-stripe').value,crypto:$('s-crypto').value,theme:$('s-theme').value
  });
  localStorage.setItem('settings',JSON.stringify(settings)); applySettings(); alert('Ajustes guardados');
}

function handleLogo(e){const f=e.target.files[0];if(!f) return;const r=new FileReader();r.onload=()=>{settings.logo=r.result;localStorage.setItem('settings',JSON.stringify(settings));applySettings()};r.readAsDataURL(f)}

$('tab-inv').onclick=()=>showTab('inv');$('tab-new').onclick=()=>showTab('new');$('tab-fin').onclick=()=>showTab('fin');$('tab-settings').onclick=()=>showTab('settings');
function showTab(t){document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));document.querySelectorAll('main>section').forEach(s=>s.style.display='none');({'inv':['tab-inv','view-inv',renderInv],'new':['tab-new','view-new',null],'fin':['tab-fin','view-rcv',renderRcv],'settings':['tab-settings','view-settings',null]})[t].forEach((v,i)=>{if(i===0)$(v).classList.add('active');else if(i===1)$(v).style.display='block';else if(i===2&&v)v()})}

const listPieces=()=>JSON.parse(localStorage.getItem('pieces')||'[]');
const setPieces=v=>localStorage.setItem('pieces',JSON.stringify(v));

function resetForm(){['f-model','f-ref','f-serial','f-year','f-contents','f-cost','f-extra','f-tax','f-client','f-client-email'].forEach(id=>$(id).value='');$('f-cond').value='Nuevo sellado';$('f-currency').value=settings.cur||'USD'}

function savePiece(){
  const p={id:crypto.randomUUID(),model:$('f-model').value.trim(),ref:$('f-ref').value.trim(),serial:$('f-serial').value.trim(),year:$('f-year').value?parseInt($('f-year').value):null,cond:$('f-cond').value,contents:$('f-contents').value.trim(),currency:$('f-currency').value,cost:parseFloat($('f-cost').value||0),extra:parseFloat($('f-extra').value||0),tax:parseFloat($('f-tax').value||0),client:$('f-client').value,clientEmail:$('f-client-email').value,creditDays:parseInt($('f-credit').value||'0'),photos:[]};
  const items=listPieces();items.unshift(p);setPieces(items);renderInv();showTab('inv');
}

function delPiece(id){if(!confirm('¿Eliminar esta pieza?'))return;setPieces(listPieces().filter(i=>i.id!==id));renderInv()}

function renderInv(){
  const tb=$('inv-table').querySelector('tbody');tb.innerHTML='';
  listPieces().forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.model}</td><td>${p.ref||''}</td><td>${p.serial||''}</td><td>${p.year||''}</td><td>${p.cond||''}</td><td>${p.currency||'USD'}</td><td class="right">${p.sell!=null?p.sell:'—'}</td><td>${p.creditDays>0?(p.creditDays+' días'):'Contado'}</td><td style="white-space:nowrap"><button class="btn" onclick="createInvoice('${p.id}')">Invoice</button> <button class="btn secondary" onclick="editPiece('${p.id}')">Editar</button> <button class="btn bad" onclick="delPiece('${p.id}')">Borrar</button></td>`;
    tb.appendChild(tr);
  });
}

function editPiece(id){
  const p=listPieces().find(x=>x.id===id); if(!p) return;
  ['model','ref','serial','year','cond','contents','currency','cost','extra','tax','client','clientEmail','creditDays'].forEach(k=>{const el=$('f-'+(k==='clientEmail'?'client-email':k==='creditDays'?'credit':k)); if(el) el.value=p[k]??''});
  showTab('new');
}

function exportCSV(){const items=listPieces();const cols=['model','ref','serial','year','cond','contents','currency','sell','discount','shipping','cost','extra','tax','client','clientEmail','creditDays'];const header=cols.join(',');const rows=items.map(p=>cols.map(k=>JSON.stringify(p[k]??'')).join(','));const csv=[header,...rows].join('\\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='timefindr_inventario.csv';a.click();URL.revokeObjectURL(url)}
function backupJSON(){const data={settings, pieces:listPieces()};const blob=new Blob([JSON.stringify(data)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='timefindr_backup.json';a.click();URL.revokeObjectURL(url)}
function restoreJSON(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(data.settings)localStorage.setItem('settings',JSON.stringify(data.settings));if(data.pieces)localStorage.setItem('pieces',JSON.stringify(data.pieces));location.reload()}catch(err){alert('Archivo inválido')}};r.readAsText(f)}

function renderRcv(){const tb=$('rcv-table').querySelector('tbody');tb.innerHTML='';listPieces().forEach(p=>(p.invoices||[]).forEach(inv=>{const due=new Date(inv.due),issued=new Date(inv.issued);const paid=(inv.payments||[]).reduce((a,c)=>a+Number(c.amount||0),0);const bal=Math.max(0,(inv.total||0)-paid);const late=(new Date()>due)&&bal>0;const tr=document.createElement('tr');tr.innerHTML=`<td>${inv.folio}</td><td>${inv.client||'-'}</td><td>${p.model}</td><td>${issued.toLocaleDateString('es-MX')}</td><td>${due.toLocaleDateString('es-MX')}</td><td class="right">${bal.toFixed(2)}</td><td>${late?'<span class=badge>Vencida</span>':''} <button class="btn secondary" onclick="recordPayment('${p.id}','${inv.id}')">Registrar pago</button></td>`;tb.appendChild(tr)}))}

function daysFromNow(n){const d=new Date();d.setDate(d.getDate()+n);return d}

function createInvoice(id){
  const items=listPieces();const p=items.find(x=>x.id===id);if(!p){alert('No encontrada');return}
  const price=parseFloat(prompt('Precio de venta ('+(p.currency||'USD')+'):','')||'0');if(!price){alert('Precio requerido');return}
  const tax= parseFloat(prompt('Impuesto % (ej. 16):', (isFinite(p.tax)?p.tax:0))||'0');
  const discount=parseFloat(prompt('Descuento (monto):','0')||'0');
  const shipping=parseFloat(prompt('Envío (monto):','0')||'0');
  p.sell=price;p.discount=discount;p.shipping=shipping;p.tax=tax;
  const pretax=Math.max(0,price-discount+shipping), taxAmt=pretax*(tax/100), total=pretax+taxAmt;
  const seqKey='inv-seq-'+new Date().getFullYear();const seq=+localStorage.getItem(seqKey)||0;localStorage.setItem(seqKey,String(seq+1));
  const folio=`${settings.prefix}-${new Date().getFullYear()}-${String(seq+1).padStart(4,'0')}`;
  const issued=new Date();const due=p.creditDays>0?daysFromNow(p.creditDays):issued;
  const inv={id:crypto.randomUUID(),folio,issued:issued.toISOString(),due:due.toISOString(),currency:p.currency||'USD',client:p.client||'',clientEmail:p.clientEmail||'',pretax,taxAmt,total,price,discount,shipping,taxPct:tax,payments:[]};
  p.invoices=p.invoices||[];p.invoices.push(inv);setPieces(items);
  openInvoice(p.id,inv.id);
  renderInv();
}

function openInvoice(pid,iid){const url=new URL(location.href);const u=url.origin+url.pathname+'#/invoice/'+pid+'/'+iid;const w=window.open(u,'_blank');if(!w){location.hash='#/invoice/'+pid+'/'+iid}else{w.focus()}}

addEventListener('hashchange',route);addEventListener('load',route);
function route(){if(location.hash.startsWith('#/invoice/')){const [, , pid, iid]=location.hash.split('/');renderInvoiceView(pid,iid)}}

function recordPayment(pid,iid){
  const items=listPieces();const p=items.find(x=>x.id===pid);if(!p) return;const inv=(p.invoices||[]).find(i=>i.id===iid);if(!inv) return;
  const amount=parseFloat(prompt('Monto del pago:',inv.total||0)||'0');if(!amount)return;
  const currency=prompt('Moneda del pago (USD/MXN):',inv.currency||'USD')||inv.currency||'USD';
  const fx=parseFloat(prompt('Tipo de cambio de este pago (si aplica):','')||'0');
  inv.payments=inv.payments||[];inv.payments.push({id:crypto.randomUUID(),date:new Date().toISOString(),amount,currency,fx}); setPieces(items); alert('Pago registrado');
}

function renderInvoiceView(pid,iid){
  const items=listPieces();const p=items.find(x=>x.id===pid);if(!p){alert('No encontrada');return}
  const inv=(p.invoices||[]).find(i=>i.id===iid);if(!inv){alert('Invoice no encontrada');return}
  const mode = document.documentElement.classList.contains('light')?'light':'dark';
  const bg = mode==='light' ? '#E6E2D3' : '#0D1E17'; const text = mode==='light' ? '#0D1E17' : '#E6E2D3'; const border = mode==='light' ? '#C9C6BA' : '#1E2A24';
  const logo = settings.logo || 'icons/icon-512.png';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${inv.folio}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,Arial;margin:24px;color:${text};background:${bg}}
    .row{display:flex;justify-content:space-between;align-items:flex-start}
    .muted{color:${mode==='light'?'#5B5F5B':'#9FB2AA'}}.right{text-align:right}.box{border:1px solid ${border};border-radius:10px;padding:12px;margin-top:8px}
    table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:8px;border-bottom:1px solid ${border}}th{text-align:left;color:${mode==='light'?'#5B5F5B':'#9FB2AA'}}
  </style></head><body>
  <div class="row">
    <div><img src="${logo}" style="width:72px;height:72px;border-radius:12px;object-fit:cover"><h2 style="margin:8px 0 0">${settings.biz}</h2><div class="muted">${settings.addr}<br>${settings.email} · ${settings.phone}</div></div>
    <div class="right"><h3 style="margin:0">Factura ${inv.folio}</h3><div class="muted">Emisión: ${new Date(inv.issued).toLocaleDateString('es-MX')}<br>Vence: ${new Date(inv.due).toLocaleDateString('es-MX')}</div></div>
  </div>
  <div class="box">
    <strong>Cliente</strong><div>${inv.client||'-'}<br>${inv.clientEmail||''}</div>
  </div>
  <table>
    <thead><tr><th>Concepto</th><th class="right">Monto (${inv.currency})</th></tr></thead>
    <tbody>
      <tr><td>Reloj ${p.model}${p.ref?(' ('+p.ref+')'):''}${p.serial?(' · Serie '+p.serial):''}</td><td class="right">${(inv.price||0).toFixed(2)}</td></tr>
      ${inv.discount?`<tr><td>Descuento</td><td class="right">−${(inv.discount||0).toFixed(2)}</td></tr>`:''}
      ${inv.shipping?`<tr><td>Envío</td><td class="right">${(inv.shipping||0).toFixed(2)}</td></tr>`:''}
      <tr><td>Subtotal</td><td class="right">${(inv.pretax||0).toFixed(2)}</td></tr>
      <tr><td>Impuesto (${inv.taxPct||0}%)</td><td class="right">${(inv.taxAmt||0).toFixed(2)}</td></tr>
      <tr><td><strong>Total</strong></td><td class="right"><strong>${(inv.total||0).toFixed(2)}</strong></td></tr>
    </tbody>
  </table>
  <div class="muted" style="margin-top:16px">${settings.terms}</div>
  <script>window.print && setTimeout(()=>window.print(),300)</script>
  </body></html>`;
  const w = window.open('','_blank'); if(!w){document.write(html);document.close();return} w.document.open(); w.document.write(html); w.document.close(); w.focus();
}

function handlePhotos(e){const files=[...e.target.files].slice(0,6);const box=$('photos-preview');box.innerHTML='';const max=1200;files.forEach(f=>{const img=new Image();const r=new FileReader();r.onload=()=>{img.onload=()=>{const ratio=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=img.width*ratio;c.height=img.height*ratio;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);c.toBlob(b=>{const r2=new FileReader();r2.onload=()=>{const im=new Image();im.src=r2.result;im.className='thumb';box.appendChild(im)},'image/jpeg',0.85)},'image/jpeg')};img.src=r.result};r.readAsDataURL(f)})}

renderInv();
