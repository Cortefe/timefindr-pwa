
// Robust JS: no truncated lines, guards everywhere.
const $=id=>document.getElementById(id);
const log=(...a)=>console.log('[TF]',...a);
const err=(...a)=>console.error('[TF]',...a);

function safeGet(k, def){ try{ const v = localStorage.getItem(k); return v? JSON.parse(v): def } catch(e){err('storage get',e); return def}}
function safeSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); } catch(e){ err('storage set',e); }}

const settings = Object.assign({biz:"TIMEFINDR WATCHES",email:"ventas@timefindr.com",phone:"+52 55 6318 4206",addr:"169 East Flagler St, Suite 1629, Miami, FL 33131",prefix:"TF",tax:0,cur:"USD"}, safeGet('settings', {}));
const pieces = ()=> safeGet('pieces', []);
const setPieces = v => safeSet('pieces', v);

function applyBasics(){
  const y = $('y'); if(y) y.textContent = new Date().getFullYear();
  const t = $('today'); if(t) t.textContent = new Date().toLocaleDateString('es-MX');
}
applyBasics();

function showTab(key){
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('main>section').forEach(s=>s.style.display='none');
  const tabMap = {inv:['tab-inv','view-inv'], new:['tab-new','view-new'], fin:['tab-fin','view-rcv'], settings:['tab-settings','view-settings']};
  const [btnId, viewId] = tabMap[key];
  const btn=$(btnId); const view=$(viewId);
  if(btn) btn.classList.add('active');
  if(view) view.style.display='block';
  if(key==='inv') renderInv();
  if(key==='fin') renderRcv();
}
$('tab-inv').onclick=()=>showTab('inv');
$('tab-new').onclick=()=>showTab('new');
$('tab-fin').onclick=()=>showTab('fin');
$('tab-settings').onclick=()=>showTab('settings');

function resetForm(){
  ['f-model','f-ref','f-serial','f-year','f-contents','f-cost','f-extra','f-tax','f-client','f-client-email'].forEach(id=>{const el=$(id); if(el) el.value='' });
  const cc=$('f-cond'); if(cc) cc.value='Nuevo sellado';
  const cu=$('f-currency'); if(cu) cu.value=settings.cur||'USD';
}
$('btn-clean').onclick = resetForm;

$('btn-save').onclick = ()=>{
  const p={
    id: crypto.randomUUID(),
    model: $('f-model').value.trim(),
    ref: $('f-ref').value.trim(),
    serial: $('f-serial').value.trim(),
    year: $('f-year').value? parseInt($('f-year').value): null,
    cond: $('f-cond').value,
    contents: $('f-contents').value.trim(),
    currency: $('f-currency').value,
    cost: parseFloat($('f-cost').value||0),
    extra: parseFloat($('f-extra').value||0),
    tax: parseFloat($('f-tax').value||0),
    client: $('f-client').value,
    clientEmail: $('f-client-email').value,
    creditDays: parseInt($('f-credit').value||0)||0
  };
  if(!p.model){ alert('Modelo es requerido'); return }
  const arr = pieces(); arr.push(p); setPieces(arr);
  alert('Guardado'); resetForm(); showTab('inv');
};

function fmt(v,c){ try { return new Intl.NumberFormat('es-MX',{style:'currency',currency:c||'USD'}).format(Number(v||0)) } catch(e){ return Number(v||0).toFixed(2) } }

function renderInv(){
  const q = ($('q')?.value||'').toLowerCase();
  const tb = $('inv-table').querySelector('tbody'); tb.innerHTML='';
  pieces().filter(p=>!q || [p.model,p.ref,p.serial].join(' ').toLowerCase().includes(q)).forEach(p=>{
    const tr = document.createElement('tr');
    const credit = p.creditDays>0? (p.creditDays+' días') : 'Contado';
    const price = (p.sell!=null)? fmt(p.sell,p.currency): '—';
    tr.innerHTML = `<td>${p.model}</td><td>${p.ref||''}</td><td>${p.serial||''}</td><td>${p.year||''}</td><td>${p.cond||''}</td><td>${p.currency||'USD'}</td><td class="right">${price}</td><td>${credit}</td><td><button class="btn" data-invoice="${p.id}">Invoice</button> <button class="btn secondary" data-del="${p.id}">Borrar</button></td>`;
    tb.appendChild(tr);
  });
}
$('q').addEventListener('input', renderInv);

document.addEventListener('click', (e)=>{
  const t = e.target;
  if(t.matches('button[data-del]')){
    const id = t.getAttribute('data-del');
    const arr = pieces().filter(x=>x.id!==id); setPieces(arr); renderInv();
  }
  if(t.matches('button[data-invoice]')){
    const id = t.getAttribute('data-invoice');
    createInvoice(id);
  }
});

function daysFromNow(n){ const d=new Date(); d.setDate(d.getDate()+n); return d }

function createInvoice(id){
  const arr = pieces();
  const p = arr.find(x=>x.id===id); if(!p){ alert('Pieza no encontrada'); return }
  const price = parseFloat(prompt(`Precio de venta (${p.currency||'USD'}):`,'')||'0'); if(!price){ alert('Precio requerido'); return }
  const tax = parseFloat(prompt('Impuesto % (ej. 16):', isFinite(p.tax)?p.tax:0)||'0');
  const discount = parseFloat(prompt('Descuento (monto):','0')||'0');
  const shipping = parseFloat(prompt('Envío (monto):','0')||'0');
  p.sell=price; p.tax=tax; p.discount=discount; p.shipping=shipping;

  const pretax = Math.max(0, price - discount + shipping);
  const taxAmt = pretax*(tax/100);
  const total = pretax + taxAmt;
  const seqKey='inv-seq-'+new Date().getFullYear(); const seq=+localStorage.getItem(seqKey)||0; localStorage.setItem(seqKey,String(seq+1));
  const folio=`${settings.prefix}-${new Date().getFullYear()}-${String(seq+1).padStart(4,'0')}`;
  const issued=new Date(); const due=p.creditDays>0?daysFromNow(p.creditDays):issued;

  const inv={id:crypto.randomUUID(),folio,issued:issued.toISOString(),due:due.toISOString(),currency:p.currency||'USD',client:p.client||'',clientEmail:p.clientEmail||'',price,discount,shipping,taxPct:tax,pretax,taxAmt,total,payments:[]};
  p.invoices=p.invoices||[]; p.invoices.push(inv);
  setPieces(arr);
  openInvoice(p.id,inv.id);
  renderInv();
}

function openInvoice(pid,iid){
  const url = new URL(location.href);
  const u = url.origin+url.pathname+'#/invoice/'+pid+'/'+iid;
  const w = window.open(u,'_blank');
  if(!w){ location.hash = '#/invoice/'+pid+'/'+iid } else { w.focus() }
}

addEventListener('hashchange', route); addEventListener('load', route);
function route(){ if(location.hash.startsWith('#/invoice/')){ const [, , pid, iid] = location.hash.split('/'); renderInvoiceView(pid,iid) }}

function renderInvoiceView(pid,iid){
  const p = pieces().find(x=>x.id===pid); if(!p){ alert('No encontrada'); return }
  const inv = (p.invoices||[]).find(i=>i.id===iid); if(!inv){ alert('Invoice no encontrada'); return }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${inv.folio}</title>
  <style>body{font-family:Arial,system-ui;margin:24px;color:#111}
  .row{display:flex;justify-content:space-between;align-items:flex-start}.muted{color:#666}.right{text-align:right}
  table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:8px;border-bottom:1px solid #eee}th{text-align:left;color:#666}</style></head><body>
  <div class="row">
    <div><img src="icons/icon-192.png" style="width:64px;height:64px;border-radius:10px;object-fit:cover"><h2 style="margin:8px 0 0">${settings.biz}</h2><div class="muted">${settings.addr}<br>${settings.email} · ${settings.phone}</div></div>
    <div class="right"><h3 style="margin:0">Factura ${inv.folio}</h3><div class="muted">Emisión: ${new Date(inv.issued).toLocaleDateString('es-MX')}<br>Vence: ${new Date(inv.due).toLocaleDateString('es-MX')}</div></div>
  </div>
  <div><strong>Cliente:</strong> ${inv.client||'-'} ${inv.clientEmail?('· '+inv.clientEmail):''}</div>
  <table><thead><tr><th>Concepto</th><th class="right">Monto (${inv.currency})</th></tr></thead>
  <tbody>
    <tr><td>Reloj ${p.model}${p.ref?(' ('+p.ref+')'):''}${p.serial?(' · Serie '+p.serial):''}</td><td class="right">${inv.price.toFixed(2)}</td></tr>
    ${inv.discount?`<tr><td>Descuento</td><td class="right">−${inv.discount.toFixed(2)}</td></tr>`:''}
    ${inv.shipping?`<tr><td>Envío</td><td class="right">${inv.shipping.toFixed(2)}</td></tr>`:''}
    <tr><td>Subtotal</td><td class="right">${inv.pretax.toFixed(2)}</td></tr>
    <tr><td>Impuesto (${inv.taxPct||0}%)</td><td class="right">${inv.taxAmt.toFixed(2)}</td></tr>
    <tr><td><strong>Total</strong></td><td class="right"><strong>${inv.total.toFixed(2)}</strong></td></tr>
  </tbody></table>
  <script>window.print && setTimeout(()=>window.print(),400)</script>
  </body></html>`;
  const w = window.open('','_blank'); if(!w){ document.write(html); document.close(); return } w.document.open(); w.document.write(html); w.document.close(); w.focus();
}

function exportCSV(){
  const items = pieces();
  const cols = ['model','ref','serial','year','cond','contents','currency','sell','discount','shipping','cost','extra','tax','client','clientEmail','creditDays'];
  const header = cols.join(',');
  const rows = items.map(p=> cols.map(k=> JSON.stringify(p[k]??'')).join(',') );
  const csv = [header,...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='timefindr_inventario.csv'; a.click(); URL.revokeObjectURL(url);
}
$('btn-export').onclick = exportCSV;

function backupJSON(){
  const data = {settings, pieces: pieces()};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='timefindr_backup.json'; a.click(); URL.revokeObjectURL(url);
}
$('btn-backup').onclick = backupJSON;

$('restore-file').addEventListener('change', (e)=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ try{ const data=JSON.parse(r.result); if(data.settings) safeSet('settings',data.settings); if(data.pieces) safeSet('pieces',data.pieces); location.reload() } catch(e){ alert('Archivo inválido') } };
  r.readAsText(f);
});

// initial render
showTab('inv');
