
(() => {
  const APP_VERSION = 'proplus-v2';
  const CACHE_NAME = 'tf-proplus-v2';
  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);

  // Storage helpers
  const read = (k, d=null) => { try{ const v = localStorage.getItem(k); return v?JSON.parse(v):d } catch { return d } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { toast('Almacenamiento lleno') } };

  // Settings & theme
  const defaults = {biz:'TIMEFINDR WATCHES', email:'ventas@timefindr.com', phone:'+52 5563184206', addr:'169 East Flagler St, Suite 1629, Miami, FL 33131', prefix:'TF', tax:0, cur:'USD', theme:'auto', logo:null};
  const settings = Object.assign({}, defaults, read('settings', {}));

  function applyTheme(){
    let mode = settings.theme || 'auto';
    if (mode === 'auto') {
      const h = new Date().getHours();
      mode = (h>=7 && h<19) ? 'light' : 'dark';
    }
    document.documentElement.classList.toggle('light', mode==='light');
    $('brand-logo').src = settings.logo || 'icons/icon-192.png';
    $('y').textContent = new Date().getFullYear();
    const t = $('today'); if (t) t.textContent = new Date().toLocaleDateString('es-MX');
    const v = $('app-ver'); if (v) v.textContent = APP_VERSION;
  }

  function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__t); window.__t=setTimeout(()=>el.classList.remove('show'),2200); }
  const listPieces = () => read('pieces', []);
  const setPieces = v => write('pieces', v);

  // NAV
  function showTab(tab){
    document.querySelectorAll('nav .tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    ['inv','new','fin','rep','cfg'].forEach(id=> $('view-'+id).style.display = (id===tab?'block':'none'));
    if (tab==='inv') renderInv();
    if (tab==='fin') renderRcv();
    if (tab==='rep') renderRep();
    if (tab==='cfg') fillSettings();
  }
  document.addEventListener('click', e=>{
    const t = e.target.closest('nav .tab'); if (t) showTab(t.dataset.tab);
  });

  // INVENTORY
  function renderInv(){
    const tb = q('#inv-table tbody'); tb.innerHTML='';
    const term = ($('q').value||'').toLowerCase();
    listPieces().filter(p => !term || [p.model,p.ref,p.serial].join(' ').toLowerCase().includes(term)).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(p.model||'')}</td>
        <td>${esc(p.ref||'')}</td>
        <td>${esc(p.serial||'')}</td>
        <td>${p.year||''}</td>
        <td>${esc(p.cond||'')}</td>
        <td>${p.currency||'USD'}</td>
        <td class="right">${p.sell!=null?fmt(p.sell,p.currency):'—'}</td>
        <td>${p.creditDays>0?(p.creditDays+' d'):'Contado'}</td>
        <td class="nowrap">
          <button class="btn" data-act="invoice" data-id="${p.id}">Invoice</button>
          <button class="btn secondary" data-act="edit" data-id="${p.id}">Editar</button>
          <button class="btn bad" data-act="del" data-id="${p.id}">Borrar</button>
        </td>`;
      tb.appendChild(tr);
    });
  }
  $('q').addEventListener('input', renderInv);
  q('#inv-table tbody').addEventListener('click', ev=>{
    const b = ev.target.closest('button[data-act]'); if(!b) return;
    const id = b.dataset.id, act = b.dataset.act;
    if (act==='invoice') createInvoice(id);
    if (act==='edit') editPiece(id);
    if (act==='del') delPiece(id);
  });

  function delPiece(id){ if(!confirm('¿Eliminar?')) return; setPieces(listPieces().filter(i=>i.id!==id)); renderInv(); }

  function editPiece(id){
    const p = listPieces().find(x=>x.id===id); if(!p){ toast('No encontrada'); return; }
    // Quick edit: just change modelo
    const m = prompt('Modelo (deja vacío para no cambiar):', p.model||''); if (m===null) return;
    if (m) { p.model = m; setPieces(listPieces().map(x=>x.id===id?p:x)); renderInv(); toast('Actualizado'); }
  }

  // NEW PIECE form
  function resetForm(){
    ['f-model','f-ref','f-serial','f-year','f-contents','f-cost','f-extra','f-tax'].forEach(id => $(id).value='');
    $('f-cond').value='Nuevo sellado'; $('f-currency').value=settings.cur||'USD';
    setCredit(false, 0);
  }
  $('btn-reset').addEventListener('click', resetForm);

  function buildCreditDays(){
    const sel = $('credit-days'); sel.innerHTML = '';
    for (let i=1;i<=60;i++){ const o=document.createElement('option'); o.value=String(i); o.textContent = i+' día'+(i>1?'s':''); sel.appendChild(o); }
  }
  function setCredit(enabled, days){
    $('credit-yes').setAttribute('aria-pressed', enabled?'true':'false');
    $('credit-no').setAttribute('aria-pressed', enabled?'false':'true');
    $('credit-days').style.display = enabled?'inline-block':'none';
    if (enabled) $('credit-days').value = String(days || 30);
  }
  $('credit-no').addEventListener('click', ()=> setCredit(false, 0));
  $('credit-yes').addEventListener('click', ()=> setCredit(true, parseInt($('credit-days').value||'30')));

  $('btn-save').addEventListener('click', ()=>{
    const creditEnabled = $('credit-yes').getAttribute('aria-pressed')==='true';
    const creditDays = creditEnabled ? parseInt($('credit-days').value||'30') : 0;
    const p = {
      id: 'p_'+rand(),
      model: $('f-model').value.trim(),
      ref: $('f-ref').value.trim(),
      serial: $('f-serial').value.trim(),
      year: $('f-year').value?parseInt($('f-year').value):null,
      cond: $('f-cond').value,
      contents: $('f-contents').value.trim(),
      currency: $('f-currency').value,
      cost: parseFloat($('f-cost').value||0),
      extra: parseFloat($('f-extra').value||0),
      tax: parseFloat($('f-tax').value||0),
      creditDays,
      invoices: []
    };
    if (!p.model) { toast('Modelo es requerido'); return; }
    const items = listPieces(); items.push(p); setPieces(items);
    toast('Guardado'); showTab('inv');
  });

  // INVOICE FLOW (client chosen at invoice time)
  function chooseClient(){
    const name = prompt('Cliente (nombre o empresa):','') || '';
    const email = prompt('Email (opcional):','') || '';
    return {name, email};
  }

  function createInvoice(id){
    const items = listPieces(); const p = items.find(x=>x.id===id); if(!p){ toast('No encontrada'); return; }
    const cli = chooseClient();
    const price = numPrompt('Precio de venta ('+(p.currency||'USD')+'):'); if(price==null){ toast('Cancelado'); return; }
    const taxPct = numPrompt('Impuesto % (ej. 16):', isFinite(p.tax)?p.tax:0) || 0;
    const discStr = prompt('Descuento (monto o %):','0')||'0';
    const discount = parseAmountOrPct(discStr, price);
    const shipping = numPrompt('Envío (monto):', 0) || 0;
    const fx = (p.currency!=='USD') ? (numPrompt('Tipo de cambio:', 0) || 0) : 0;

    p.sell = price; p.discount = discount; p.shipping = shipping; p.tax = taxPct; p.fx = fx;
    p.client = cli.name; p.clientEmail = cli.email;

    const pretax = Math.max(0, price - discount + shipping);
    const taxAmt = pretax * (taxPct/100);
    const total = pretax + taxAmt;

    const seqKey='inv-seq-'+new Date().getFullYear(); const seq = +read(seqKey, 0); write(seqKey, seq+1);
    const folio=`${settings.prefix}-${new Date().getFullYear()}-${String(seq+1).padStart(4,'0')}`;
    const issued = new Date(); const due = addDays(new Date(), p.creditDays>0?p.creditDays:0);

    const inv = { id:'i_'+rand(), folio, issued:issued.toISOString(), due:due.toISOString(), currency:p.currency||'USD',
      client:p.client||'', clientEmail:p.clientEmail||'', price, discount, shipping, taxPct, pretax, taxAmt, total, payments:[], fx:fx||null };

    p.invoices = p.invoices || []; p.invoices.push(inv);
    setPieces(items); renderInv(); openInvoice(p.id, inv.id);
  }

  function openInvoice(pid,iid){
    const url = location.origin + location.pathname + '#/invoice/'+pid+'/'+iid;
    const w = window.open(url, '_blank'); if(!w){ location.hash = '#/invoice/'+pid+'/'+iid; } else { w.focus(); }
  }

  // RECEIVABLES
  function renderRcv(){
    const tb = q('#rcv-table tbody'); tb.innerHTML='';
    listPieces().forEach(p => (p.invoices||[]).forEach(inv => {
      const paid = (inv.payments||[]).reduce((a,c)=>a+Number(c.amount||0),0);
      const bal = Math.max(0,(inv.total||0)-paid);
      const late = (new Date()>new Date(inv.due)) && bal>0;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${inv.folio}</td><td>${esc(inv.client||'-')}</td><td>${esc(p.model||'')}</td>
                      <td>${new Date(inv.issued).toLocaleDateString('es-MX')}</td>
                      <td>${new Date(inv.due).toLocaleDateString('es-MX')}</td>
                      <td class="right">${fmt(bal,inv.currency)}</td>
                      <td class="nowrap">
                        <span class="badge ${late?'warn':'ok'}">${late?'Vencido':'Activo'}</span>
                        <button class="btn secondary" data-pay="${p.id}|${inv.id}">Pago</button>
                        <button class="btn" data-open="${p.id}|${inv.id}">Ver</button>
                      </td>`;
      tb.appendChild(tr);
    }));
  }
  q('#rcv-table').addEventListener('click', ev=>{
    const b = ev.target.closest('button'); if(!b) return;
    if (b.dataset.pay) { const [pid,iid]=b.dataset.pay.split('|'); recordPayment(pid,iid); }
    else if (b.dataset.open) { const [pid,iid]=b.dataset.open.split('|'); openInvoice(pid,iid); }
  });

  function recordPayment(pid,iid){
    const items = listPieces(); const p = items.find(x=>x.id===pid); if(!p) return;
    const inv = (p.invoices||[]).find(i=>i.id===iid); if(!inv) return;
    const amount = numPrompt('Monto del pago:', inv.total||0); if(!amount) return;
    const currency = prompt('Moneda del pago (USD/MXN):', inv.currency||'USD')||inv.currency||'USD';
    const fx = numPrompt('Tipo de cambio de este pago (si aplica):', inv.fx||0) || 0;
    inv.payments = inv.payments || []; inv.payments.push({id:'pay_'+rand(), date:new Date().toISOString(), amount, currency, fx});
    setPieces(items); renderRcv(); toast('Pago registrado');
  }

  // REPORTS
  function renderRep(){
    const rows = {};
    listPieces().forEach(p => {
      const cur = p.currency || 'USD';
      const sell = (p.sell!=null)? +p.sell : 0;
      const cogs = (+p.cost||0)+(+p.extra||0);
      rows[cur] = rows[cur] || {sell:0,cogs:0};
      rows[cur].sell += sell; rows[cur].cogs += cogs;
    });
    const tb = q('#rep-table tbody'); tb.innerHTML='';
    Object.entries(rows).forEach(([cur,v]) => {
      const gross = Math.max(0, v.sell - v.cogs);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${cur}</td><td class="right">${fmt(v.sell,cur)}</td><td class="right">${fmt(v.cogs,cur)}</td><td class="right">${fmt(gross,cur)}</td>`;
      tb.appendChild(tr);
    });
  }

  // SETTINGS
  function fillSettings(){
    $('s-biz').value=settings.biz||''; $('s-email').value=settings.email||''; $('s-phone').value=settings.phone||'';
    $('s-addr').value=settings.addr||''; $('s-prefix').value=settings.prefix||'TF'; $('s-tax').value=settings.tax||0;
    $('s-cur').value=settings.cur||'USD'; $('s-theme').value=settings.theme||'auto';
  }
  $('s-logo').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ settings.logo=r.result; write('settings',settings); applyTheme(); toast('Logo actualizado') }; r.readAsDataURL(f); });
  $('s-theme').addEventListener('change', ()=>{ settings.theme=$('s-theme').value; write('settings',settings); applyTheme(); });
  $('btn-save-settings').addEventListener('click', ()=>{
    settings.biz=$('s-biz').value; settings.email=$('s-email').value; settings.phone=$('s-phone').value;
    settings.addr=$('s-addr').value; settings.prefix=$('s-prefix').value||'TF';
    settings.tax=parseFloat($('s-tax').value||0); settings.cur=$('s-cur').value;
    write('settings',settings); applyTheme(); toast('Ajustes guardados');
  });

  // Invoice view (print/PDF)
  window.addEventListener('hashchange', route); window.addEventListener('load', route);
  function route(){ if(location.hash.startsWith('#/invoice/')){ const [, , pid, iid] = location.hash.split('/'); renderInvoiceView(pid,iid); } }
  function renderInvoiceView(pid,iid){
    const p = listPieces().find(x=>x.id===pid); if(!p){ alert('No encontrada'); return; }
    const inv = (p.invoices||[]).find(i=>i.id===iid); if(!inv){ alert('Invoice no encontrada'); return; }
    const logo = settings.logo || 'icons/icon-512.png';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${inv.folio}</title>
      <style>body{font-family:ui-sans-serif,system-ui,Arial;margin:24px;color:#111}.row{display:flex;justify-content:space-between;align-items:flex-start}.muted{color:#666}.right{text-align:right}.box{border:1px solid #ddd;border-radius:10px;padding:12px;margin-top:8px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:8px;border-bottom:1px solid #eee}th{text-align:left;color:#666}</style>
    </head><body>
      <div class="row">
        <div><img src="${logo}" style="width:72px;height:72px;border-radius:12px;object-fit:cover"><h2 style="margin:8px 0 0">${esc(settings.biz)}</h2><div class="muted">${esc(settings.addr)}<br>${esc(settings.email)} · ${esc(settings.phone)}</div></div>
        <div class="right"><h3 style="margin:0">Factura ${inv.folio}</h3><div class="muted">Emisión: ${new Date(inv.issued).toLocaleDateString('es-MX')}<br>Vence: ${new Date(inv.due).toLocaleDateString('es-MX')}</div></div>
      </div>
      <div class="box"><strong>Cliente</strong><div>${esc(inv.client||'-')}<br>${esc(inv.clientEmail||'')}</div></div>
      <table><thead><tr><th>Concepto</th><th class="right">Monto (${inv.currency})</th></tr></thead><tbody>
        <tr><td>Reloj ${esc(p.model||'')}${p.ref?(' ('+esc(p.ref)+')'):''}${p.serial?(' · Serie '+esc(p.serial)) : ''}</td><td class="right">${num(inv.price)}</td></tr>
        ${inv.discount?`<tr><td>Descuento</td><td class="right">−${num(inv.discount)}</td></tr>`:''}
        ${inv.shipping?`<tr><td>Envío</td><td class="right">${num(inv.shipping)}</td></tr>`:''}
        <tr><td>Subtotal</td><td class="right">${num(inv.pretax)}</td></tr>
        <tr><td>Impuesto (${inv.taxPct||0}%)</td><td class="right">${num(inv.taxAmt)}</td></tr>
        <tr><td><strong>Total</strong></td><td class="right"><strong>${num(inv.total)}</strong></td></tr>
      </tbody></table>
      <script>window.print && setTimeout(()=>window.print(),300)</script>
    </body></html>`;
    const w = window.open('','_blank'); if(!w){ document.write(html); document.close(); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
  }

  // Utils
  function fmt(v,c){ try { return new Intl.NumberFormat('es-MX',{style:'currency',currency:c||'USD'}).format(v) } catch { return (+(v||0)).toFixed(2) } }
  function num(v){ return (+(v||0)).toFixed(2); }
  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function numPrompt(msg, defVal=null){ const s = prompt(msg, defVal==null?'':String(defVal)); if(s===null) return null; const n = parseFloat(String(s).replace(',','.')); return isFinite(n)?n:defVal; }
  function parseAmountOrPct(s, base){ s=String(s).trim(); if(s.endsWith('%')){ const pct = parseFloat(s.slice(0,-1).replace(',','.')); if(isFinite(pct)) return base*(pct/100); } const n = parseFloat(s.replace(',','.')); return isFinite(n)?n:0; }
  function esc(x){ return String(x||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#039;' }[m])); }
  function rand(){ return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2); }

  // Backup/Restore/CSV
  $('btn-backup').addEventListener('click', ()=>{
    const data = { settings, pieces:listPieces() };
    const blob = new Blob([JSON.stringify(data)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='timefindr_backup.json'; a.click(); URL.revokeObjectURL(url);
  });
  $('restore-file').addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const data=JSON.parse(r.result); if(data.settings) write('settings',data.settings); if(data.pieces) write('pieces',data.pieces); location.reload(); } catch { toast('Archivo inválido'); } };
    r.readAsText(f);
  });
  $('btn-csv').addEventListener('click', ()=>{
    const items = listPieces();
    const cols = ['model','ref','serial','year','cond','contents','currency','sell','discount','shipping','fx','cost','extra','tax','creditDays'];
    const header = cols.join(',');
    const rows = items.map(p=> cols.map(k=>JSON.stringify(p[k]??'')).join(','));
    const csv = [header, *rows].join('\n') if False else header + '\n' + '\n'.join(rows)  # trick to keep readability
    blob = Blob([csv], {type:'text/csv;charset=utf-8;'})
  });
  // Implement CSV properly without the trick:
  $('btn-csv').addEventListener('click', ()=>{
    const items = listPieces();
    const cols = ['model','ref','serial','year','cond','contents','currency','sell','discount','shipping','fx','cost','extra','tax','creditDays'];
    const header = cols.join(',');
    const rows = items.map(p=> cols.map(k=>JSON.stringify(p[k]??'')).join(',')).join('\n');
    const csv = header + '\n' + rows;
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='timefindr_inventario.csv'; a.click(); URL.revokeObjectURL(url);
  });

  // Init
  document.addEventListener('DOMContentLoaded', ()=>{
    applyTheme(); buildCreditDays(); setCredit(false,0); showTab('inv'); renderInv();
  });

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', ()=> navigator.serviceWorker.register('./service-worker.js') );
  }
})();
