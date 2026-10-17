/* ---------- 5) YAPAY ZEKÂ MODU (kullanıcının kendi anahtarı) ---------- */
const PROVIDERS = {
  pollinations:{name:'Pollinations (metin + görsel)', base:'https://gen.pollinations.ai/v1', model:'openai/gpt-5.4-nano', key:'https://enter.pollinations.ai', images:true,
    hint:'Anahtarı <a href="https://enter.pollinations.ai" target="_blank" rel="noopener">enter.pollinations.ai</a> adresinden al. Aynı anahtar sahne görsellerini de çizer.'},
  gemini:{name:'Google Gemini (ücretsiz anahtar)', base:'https://generativelanguage.googleapis.com/v1beta/openai', model:'gemini-flash-latest', key:'https://aistudio.google.com/apikey',
    hint:'Ücretsiz anahtar: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Gemini sadece metni yazar; görsel için ayrıca Pollinations anahtarı ekleyebilirsin.'},
  ollama:{name:'Ollama (kendi bilgisayarında, tamamen yerel)', base:'http://localhost:11434/v1', model:'llama3.2', nokey:true,
    hint:'Ollama kurulu bilgisayarda çalışır. Tarayıcı erişimi için Ollama\'yı OLLAMA_ORIGINS=* ile başlat.'},
  custom:{name:'Diğer (OpenAI uyumlu servis)', base:'', model:'',
    hint:'OpenAI uyumlu herhangi bir servisin /v1 adresini ve modelini Gelişmiş bölümüne yaz.'}
};
const DEFAULT_SETTINGS = {mode:'offline', provider:'pollinations', key:'', model:'', base:'', aiImages:true, imgKey:'', imgModel:''};

const SYS = `Sen "Acaba?" adlı mizah uygulamasının senaryo yazarısın. Kullanıcı aklına takılan bir "acaba"yı yazar (ör. "X bize ne yapacak?", "şunu yapsam ne olur?"). Sen bunun abartılı, absürt, komik "kötü sonunu" Türkçe yazarsın.
Kurallar:
- Ton: slapstick, sevimli felaket, Türk mizahı. Asla aşağılayıcı, nefret içeren, cinsel, gerçek şiddet ya da kendine zarar içeren içerik yazma. Kişileri değil durumu tiye al.
- Kısa ve vurucu: her sahne en fazla 130 karakter, kehanet en fazla 110 karakter.
- Gerçek kişi adı (oyuncu, hoca, ünlü) kullanma. Takım veya şirket adı metinde geçebilir.
- "gorsel" alanı İNGİLİZCE görsel promptudur: tek sahne, karakterler ve eylem. Gerçek kişi, logo, arma, marka, yazı İÇERMEZ; takımları yalnızca forma renkleriyle anlat.
- 3 sahne: başlangıç, işlerin kızışması, final.
Sadece şu JSON'u döndür, başka hiçbir şey yazma:
{"kategori":"mac|patron|hoca|anne|sevgili|evsahibi|diger","kehanet":"tek cümlelik çarpıcı hüküm","felaket":87,"stat":{"label":"kısa etiket","value":"çok kısa değer","sub":"kısa alt satır"},"sahneler":[{"metin":"...","a":"tek emoji (olayın kötüsü)","v":"tek emoji (kurban)","gorsel":"english prompt"},{"metin":"...","a":"","v":"","gorsel":""},{"metin":"...","a":"","v":"","gorsel":""}],"hasar":["...","...","..."],"teselli":"komik teselli cümlesi"}`;

function aiCfg(s){ const p=PROVIDERS[s.provider]||PROVIDERS.custom; return { base:(s.base||p.base||'').replace(/\/+$/,''), model:s.model||p.model, key:s.key, nokey:!!p.nokey }; }

async function aiChat(s, messages, maxTokens=900){
  const c = aiCfg(s);
  if(!c.base || !c.model) throw new Error('Servis adresi veya model eksik');
  const ctrl = new AbortController(); const to = setTimeout(()=>ctrl.abort(), 45000);
  try{
    const res = await fetch(c.base+'/chat/completions', {
      method:'POST', signal:ctrl.signal,
      headers: Object.assign({'Content-Type':'application/json'}, c.key?{'Authorization':'Bearer '+c.key}:{}),
      body: JSON.stringify({model:c.model, messages, temperature:1, max_tokens:maxTokens})
    });
    if(!res.ok){ let m=''; try{ m=(await res.text()).slice(0,160); }catch(e){} throw new Error('HTTP '+res.status+' '+m); }
    const j = await res.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  } finally { clearTimeout(to); }
}

function parseAI(txt, text, cat){
  let s = String(txt).trim().replace(/^```(?:json)?/i,'').replace(/```\s*$/,'').trim();
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if(a<0 || b<a) throw new Error('JSON bulunamadı');
  const j = JSON.parse(s.slice(a,b+1));
  const sc = Array.isArray(j.sahneler) ? j.sahneler.slice(0,3) : [];
  if(sc.length<3) throw new Error('Sahneler eksik');
  const c = CATS[j.kategori] ? j.kategori : cat;
  const T = TPL[c];
  const str = (v,max) => String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max);
  const em = (v,d) => { const e=String(v||'').trim(); return (e && Array.from(e).length<=4) ? e : d; };
  let fel = parseInt(j.felaket,10); if(!(fel>=1 && fel<=100)) fel = rint(T.f[0],T.f[1]);
  const hasar = (Array.isArray(j.hasar)?j.hasar:[]).map(h=>str(h,70)).filter(Boolean).slice(0,3);
  while(hasar.length<3) hasar.push(pick(T.hasar));
  const st = j.stat||{};
  return {
    cat:c, soru:text, source:'ai',
    kehanet: str(j.kehanet,180) || pick(T.kehanet),
    felaket: fel,
    stat: {label:str(st.label,24)||'Durum', value:str(st.value,14)||'KRİTİK', sub:str(st.sub,40)},
    sahneler: sc.map((x,i)=>({metin:str(x.metin,200)||pick(T['s'+(i+1)])[0], a:em(x.a,'😈'), v:em(x.v,'😰'), gorsel:str(x.gorsel,500)})),
    hasar, teselli: str(j.teselli,160) || pick(T.teselli)
  };
}

async function aiScenario(text, cat, s){
  const out = await aiChat(s, [{role:'system',content:SYS},{role:'user',content:`Kategori ipucu: ${cat}\nDert: "${text}"`}]);
  return parseAI(out, text, cat);
}

const IMG_STYLE = ', 3D cartoon caricature, exaggerated funny expressions, vibrant cinematic lighting, comedic, vertical 9:16 composition, highly detailed, no text, no letters, no logos, no watermark';
async function aiImage(prompt, key, model){
  const u = 'https://gen.pollinations.ai/image/'+encodeURIComponent(prompt+IMG_STYLE)+'?model='+encodeURIComponent(model||'tongyi-mai/z-image-turbo')+'&width=768&height=1344&seed='+rint(1,2000000000);
  const r = await fetch(u, {headers:{'Authorization':'Bearer '+key}});
  if(!r.ok) throw new Error('img '+r.status);
  const blob = await r.blob();
  if(!/^image\//.test(blob.type)) throw new Error('görsel değil');
  return await new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=URL.createObjectURL(blob); });
}

/* ---------- 6) ÇİZİM (kart + video aynı motoru kullanır) ---------- */
const W=1080, H=1920;
const C = {paper:'#FAFAF7', ink:'#000', red:'#E10600', yellow:'#FFE600', grey:'#77746c', rule:'#d9d6cf'};
const FH = 'Anton, Impact, "Roboto Condensed", "Arial Narrow", sans-serif-condensed, sans-serif';
const FB = 'Barlow, "Segoe UI", Roboto, Arial, sans-serif';
const FE = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const font = (px,fam=FB,w='') => `${w} ${px}px ${fam}`.trim();

function wrap(ctx, text, maxW){
  const words = String(text).split(/\s+/).filter(Boolean); const lines=[]; let line='';
  for(const w of words){
    const t = line ? line+' '+w : w;
    if(ctx.measureText(t).width <= maxW){ line=t; continue; }
    if(line) lines.push(line);
    if(ctx.measureText(w).width > maxW){ let part=''; for(const ch of Array.from(w)){ if(ctx.measureText(part+ch).width>maxW){ lines.push(part); part=ch; } else part+=ch; } line=part; }
    else line=w;
  }
  if(line) lines.push(line);
  return lines;
}
function fit(ctx, text, maxW, maxLines, start, min, fam=FB, w=''){
  for(let px=start; px>=min; px-=2){ ctx.font=font(px,fam,w); const lines=wrap(ctx,text,maxW); if(lines.length<=maxLines) return {px,lines}; }
  ctx.font=font(min,fam,w); let lines=wrap(ctx,text,maxW);
  if(lines.length>maxLines){ lines=lines.slice(0,maxLines); lines[maxLines-1]=lines[maxLines-1].replace(/\s*\S*$/,'')+'…'; }
  return {px:min,lines};
}
function typeLines(lines, p){
  const arr = lines.map(l=>Array.from(l)); const total = arr.reduce((a,l)=>a+l.length,0);
  let n = Math.ceil(total*p);
  return arr.map(l=>{ const s=l.slice(0,Math.max(0,n)).join(''); n-=l.length; return s; });
}
function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function emoji(ctx, e, x, y, size, rot=0){
  if(!e) return; ctx.save(); ctx.translate(x,y); if(rot) ctx.rotate(rot);
  ctx.font = `${Math.round(size)}px ${FE}`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#000';
  ctx.fillText(e,0,size*0.04); ctx.restore();
}
function hash(n){ const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }

let PAPER=null;
function paper(){
  if(PAPER) return PAPER;
  const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  x.fillStyle=C.paper; x.fillRect(0,0,W,H);
  x.fillStyle='rgba(0,0,0,0.06)';
  for(let yy=0, row=0; yy<H+20; yy+=18, row++){ for(let xx=(row%2?9:0); xx<W+20; xx+=18){ x.beginPath(); x.arc(xx,yy,1.9,0,Math.PI*2); x.fill(); } }
  return PAPER=c;
}
function drawPaper(ctx){ ctx.drawImage(paper(),0,0); }

function burst(ctx,cx,cy,ro,ri,n,fill,stroke,rot){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot||0); ctx.beginPath();
  for(let i=0;i<n*2;i++){ const r=i%2?ri:ro; const a=i/(n*2)*Math.PI*2; const px=Math.cos(a)*r, py=Math.sin(a)*r; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
  ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.lineWidth=10; ctx.strokeStyle=stroke; ctx.stroke(); ctx.restore();
}

/* Çizilmiş sahne (AI görsel yoksa) */
function sceneArt(ctx, x, y, w, h, d, i, t, ah){
  const cat = CATS[d.cat]; const sc = d.sahneler[i]; ah = ah || h;
  ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
  const cx=x+w/2, cy=y+ah*0.45;
  const g=ctx.createRadialGradient(cx,cy,10,cx,cy,Math.max(w,h)*0.8);
  g.addColorStop(0,cat.color); g.addColorStop(0.5,cat.color2); g.addColorStop(1,'#050506');
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.12+i); ctx.fillStyle='rgba(255,255,255,0.08)';
  const R=Math.max(w,h)*1.2;
  for(let k=0;k<30;k++){ const a=k/30*Math.PI*2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a-0.035)*R,Math.sin(a-0.035)*R); ctx.lineTo(Math.cos(a+0.035)*R,Math.sin(a+0.035)*R); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const ax=x+w*0.63, ay=y+ah*0.40, aS=ah*0.30*(i===2?1.12:1);
  if(i===2){ const p=1+0.06*Math.sin(t*14); burst(ctx,ax,ay,aS*0.95*p,aS*0.62*p,13,C.yellow,C.red,t*0.5); }
  ctx.fillStyle='rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(ax, y+ah*0.62, w*0.2, ah*0.028, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+w*0.27, y+ah*0.77, w*0.14, ah*0.022, 0, 0, Math.PI*2); ctx.fill();
  emoji(ctx, sc.a, ax, ay+Math.sin(t*3+i)*ah*0.016, aS, Math.sin(t*2)*0.07);
  const j=(i+1)*2.4;
  emoji(ctx, sc.v, x+w*0.27+Math.sin(t*41)*j, y+ah*0.66+Math.cos(t*37)*j, ah*0.19, -0.08);
  if(i>=1){ ctx.fillStyle='#bfe9ff'; for(let k=0;k<3;k++){ const ph=(t*1.6+k*0.33)%1; const sx=x+w*0.17+k*w*0.05, sy=y+ah*0.56+ph*ah*0.08; ctx.globalAlpha=1-ph; ctx.beginPath(); ctx.arc(sx,sy,ah*0.012,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha=1; }
  for(let k=0;k<12;k++){
    const sp=0.5+hash(k)*0.8, px=x+hash(k+3)*w, py=y+((hash(k+7)*h + t*sp*170) % (h+120)) - 60;
    ctx.globalAlpha=0.85; emoji(ctx, cat.particle, px, py, 46+hash(k+11)*40, t*sp+k);
  }
  ctx.globalAlpha=1; ctx.restore();
}
function cover(ctx,img,x,y,w,h,zoom=1,px=0,py=0){
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  const s=Math.max(w/iw,h/ih)*zoom, dw=iw*s, dh=ih*s;
  ctx.drawImage(img, x+(w-dw)/2+px*(dw-w)/2, y+(h-dh)/2+py*(dh-h)/2, dw, dh);
}
function dateStr(){ try{ return new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'}); }catch(e){ return ''; } }

function masthead(ctx, y, h, big){
  ctx.fillStyle=C.red; ctx.fillRect(0,y,W,h);
  ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.font=font(fit(ctx,CONFIG.brand,W-88,1,big,40,FH).px,FH); ctx.fillText(CONFIG.brand, 44, y+h/2+4);
}

/* --- PAYLAŞILABİLİR KART (1080x1920) --- */
function drawCard(ctx, d, imgs){
  const cat=CATS[d.cat];
  drawPaper(ctx);
  masthead(ctx,0,170,124);
  ctx.fillStyle='#000'; ctx.fillRect(0,170,W,54);
  ctx.fillStyle='#fff'; ctx.font=font(28,FB,'700'); ctx.textBaseline='middle';
  ctx.textAlign='left'; ctx.fillText('Kehanet baskısı  ·  '+dateStr(), 44, 198);
  ctx.textAlign='right'; ctx.fillText(cat.emoji+' '+cat.label, W-44, 198);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';

  // okur sorusu
  ctx.fillStyle=C.grey; ctx.font=font(30,FB,'italic 600'); ctx.fillText('Okur sordu:', 44, 282);
  const q = fit(ctx, '“'+d.soru+'”', 990, 2, 46, 34, FB, '700');
  ctx.fillStyle='#000'; ctx.font=font(q.px,FB,'700'); q.lines.forEach((l,i)=>ctx.fillText(l, 44, 334+i*q.px*1.18));
  // manşet
  const top = 334 + (q.lines.length-1)*q.px*1.18 + 34;
  const m = fit(ctx, trUpper(d.kehanet), 992, 3, 104, 62, FH);
  ctx.font=font(m.px,FH); ctx.fillStyle='#000';
  const my = top + m.px*0.95;
  m.lines.forEach((l,i)=>ctx.fillText(l, 44, my+i*m.px*1.05));
  const panelTop = my + (m.lines.length-1)*m.px*1.05 + 36;

  // alttan yukarı: bant, teselli, hasar, istatistik
  const footTop = H-96;
  const tz = fit(ctx, d.teselli, 992, 2, 30, 24, FB, 'italic 600');
  const tzLH = tz.px*1.22, tzTop = footTop - 34 - (tz.lines.length-1)*tzLH;
  const hLH = 50, hTitle = tzTop - tz.px - 40 - 2*hLH - 62;
  const rh = 190, ry = hTitle - 58 - rh;
  const panelBottom = ry - 30, ph = Math.max(380, panelBottom - panelTop);

  // fotoğraf paneli + alt yazı
  const cap = fit(ctx, d.sahneler[2].metin, 900, 3, 36, 28, FB, '700');
  const capH = cap.lines.length*cap.px*1.2 + 70;
  ctx.save(); ctx.beginPath(); ctx.rect(44,panelTop,992,ph); ctx.clip();
  if(imgs && imgs[2]) cover(ctx,imgs[2],44,panelTop,992,ph,1.02); else sceneArt(ctx,44,panelTop,992,ph,d,2,0.7,ph-capH);
  ctx.restore();
  ctx.fillStyle=C.yellow; ctx.fillRect(44, panelTop+ph-capH, 992, capH);
  ctx.fillStyle='#000'; ctx.fillRect(44, panelTop+ph-capH, 150, 46);
  ctx.fillStyle='#fff'; ctx.font=font(32,FH); ctx.textBaseline='middle'; ctx.fillText('FİNAL', 64, panelTop+ph-capH+24);
  ctx.fillStyle='#000'; ctx.textBaseline='alphabetic'; ctx.font=font(cap.px,FB,'700');
  cap.lines.forEach((l,i)=>ctx.fillText(l, 70, panelTop+ph-capH+46+cap.px*1.05+i*cap.px*1.2));
  ctx.lineWidth=6; ctx.strokeStyle='#000'; ctx.strokeRect(44,panelTop,992,ph);

  // felaket + istatistik
  ctx.fillStyle='#fff'; ctx.fillRect(44,ry,484,rh); ctx.lineWidth=5; ctx.strokeRect(44,ry,484,rh);
  ctx.fillStyle='#000'; ctx.font=font(30,FB,'800'); ctx.fillText('Felaket seviyesi', 70, ry+48);
  ctx.fillStyle=C.red; ctx.font=font(100,FH); ctx.fillText('%'+d.felaket, 70, ry+156);
  ctx.fillStyle='#e9e6de'; ctx.fillRect(300,ry+118,200,30); ctx.fillStyle=C.red; ctx.fillRect(300,ry+118,200*d.felaket/100,30);
  ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeRect(300,ry+118,200,30);
  ctx.fillStyle='#000'; ctx.fillRect(552,ry,484,rh);
  ctx.fillStyle=C.yellow; ctx.font=font(30,FB,'800'); ctx.fillText(d.stat.label, 578, ry+48);
  const sv = fit(ctx, trUpper(d.stat.value), 430, 1, 100, 50, FH);
  ctx.fillStyle='#fff'; ctx.font=font(sv.px,FH); ctx.fillText(sv.lines[0], 578, ry+148);
  if(d.stat.sub){ const sb=fit(ctx,d.stat.sub,430,1,26,20,FB,'600'); ctx.fillStyle='#bdbab2'; ctx.font=font(sb.px,FB,'600'); ctx.fillText(sb.lines[0], 578, ry+178); }

  // hasar raporu
  ctx.fillStyle='#000'; ctx.font=font(34,FB,'800'); ctx.fillText('Hasar raporu', 44, hTitle);
  ctx.fillRect(44,hTitle+14,992,4);
  d.hasar.forEach((h,i)=>{ const yy=hTitle+62+i*hLH; const hf=fit(ctx,h,930,1,34,26,FB,'600');
    ctx.fillStyle=C.red; ctx.font=font(34,FB,'800'); ctx.fillText('✖',44,yy);
    ctx.fillStyle='#000'; ctx.font=font(hf.px,FB,'600'); ctx.fillText(hf.lines[0],92,yy); });
  ctx.fillStyle=C.grey; ctx.font=font(tz.px,FB,'italic 600'); tz.lines.forEach((l,i)=>ctx.fillText(l,44,tzTop+i*tzLH));

  // alt bant
  ctx.fillStyle=C.red; ctx.fillRect(0,footTop,W,96);
  ctx.fillStyle='#fff'; ctx.textBaseline='middle'; ctx.textAlign='center';
  const ft = fit(ctx,'SEN DE SOR: '+trUpper(CONFIG.site),W-80,1,52,30,FH); ctx.font=font(ft.px,FH);
  ctx.fillText(ft.lines[0], W/2, footTop+50);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

/* --- VİDEO ZAMAN ÇİZELGESİ --- */
const TL = {intro:1.9, scene:3.4, meter:2.5, end:3.4};
const T_SC = TL.intro, T_M = TL.intro+3*TL.scene, T_E = T_M+TL.meter, TOTAL = T_E+TL.end;
const SCENE_LABELS = ['SON DAKİKA','GELİŞME','FİNAL'];

function drawFrame(ctx, d, imgs, t){
  ctx.save();
  if(t<T_SC) frameIntro(ctx,d,t);
  else if(t<T_M){ const i=Math.min(2,Math.floor((t-T_SC)/TL.scene)); frameScene(ctx,d,imgs,i,t-T_SC-i*TL.scene,t); }
  else if(t<T_E) frameMeter(ctx,d,t-T_M,t);
  else frameEnd(ctx,d,Math.min(t-T_E,TL.end),t);
  ctx.restore();
}

function frameIntro(ctx,d,lt){
  const cat=CATS[d.cat];
  drawPaper(ctx);
  const my = -260 + 260*ease.out(clamp(lt/0.3));
  masthead(ctx, my, 230, 128);
  ctx.fillStyle='#000'; ctx.fillRect(0,my+230,W,70);
  ctx.fillStyle=C.red; ctx.fillRect(0,my+230,330,70);
  ctx.fillStyle='#fff'; ctx.font=font(46,FH); ctx.textBaseline='middle'; ctx.textAlign='left';
  ctx.fillText('SON DAKİKA', 40, my+268);
  if(Math.floor(lt*4)%2===0){ ctx.beginPath(); ctx.arc(300,my+265,10,0,Math.PI*2); ctx.fill(); }
  ctx.font=font(32,FB,'700'); ctx.fillText(dateStr(), 360, my+266);

  const tp = clamp((lt-0.3)/0.38);
  if(tp>0){
    const s = 2.3 - 1.3*ease.back(tp);
    ctx.save(); ctx.translate(W/2, 640); ctx.scale(s,s); ctx.rotate(-0.035); ctx.globalAlpha=clamp(tp*3);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=font(fit(ctx,'ACABA?',960,1,210,110,FH).px,FH);
    ctx.fillStyle=C.yellow; ctx.fillText('ACABA?', 9, 9);
    ctx.fillStyle='#000'; ctx.fillText('ACABA?', 0, 0);
    ctx.restore();
  }
  const qp = clamp((lt-0.7)/0.95);
  if(qp>0){
    const q = fit(ctx, '“'+d.soru+'”', 940, 4, 62, 40, FB, '700');
    const vis = typeLines(q.lines, qp);
    ctx.font=font(q.px,FB,'700'); ctx.fillStyle='#000'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    vis.forEach((l,i)=>ctx.fillText(l, 70, 930+i*q.px*1.2));
  }
  const sp = clamp((lt-1.35)/0.25);
  if(sp>0){
    ctx.save(); ctx.translate(W/2, 1460); ctx.rotate(-0.06); const s=1.6-0.6*ease.out(sp); ctx.scale(s,s); ctx.globalAlpha=clamp(sp*2);
    ctx.font=font(64,FH); const txt=trUpper(cat.label)+' DOSYASI'; const tw=ctx.measureText(txt).width+80;
    ctx.strokeStyle=C.red; ctx.lineWidth=9; ctx.strokeRect(-tw/2,-62,tw,124);
    ctx.fillStyle=C.red; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,0,6);
    ctx.restore();
  }
}

function frameScene(ctx,d,imgs,i,lt,t){
  const img = imgs && imgs[i];
  const shake = i===2 && lt<1.0 ? (1-lt)*20 : (lt<0.25 ? (0.25-lt)*28 : 0);
  ctx.save();
  if(shake) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  if(img){ const p=lt/TL.scene; cover(ctx,img,-24,-24,W+48,H+48,1.05+0.12*p,(i%2?1:-1)*(p-0.5)*0.8,0); }
  else sceneArt(ctx,-24,-24,W+48,H+48,d,i,t,1380);
  ctx.restore();

  // üst künye şeridi
  ctx.fillStyle=C.red; ctx.fillRect(0,0,W,120);
  ctx.fillStyle='#fff'; ctx.font=font(60,FH); ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText(CONFIG.brand, 40, 64);
  ctx.textAlign='right'; ctx.font=font(34,FB,'800'); ctx.fillText((i+1)+' / 3', W-40, 62);

  if(img){ const p=clamp(lt/0.4); emoji(ctx, d.sahneler[i].a, 930, 250, 150*ease.back(p), Math.sin(t*3)*0.1); }

  // haber alt bandı
  const cap = fit(ctx, d.sahneler[i].metin, 940, 5, 58, 40, FB, '700');
  const lh = cap.px*1.22, boxH = cap.lines.length*lh + 60;
  const slide = ease.out(clamp(lt/0.3));
  const by = H - 120 - boxH;
  const bx = -W + W*slide;
  ctx.fillStyle=C.yellow; ctx.fillRect(bx+40, by-70, 380, 74);
  ctx.fillStyle='#000'; ctx.font=font(48,FH); ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText(SCENE_LABELS[i], bx+62, by-30);
  ctx.fillStyle='#fff'; ctx.fillRect(bx+40, by, W-80, boxH);
  ctx.fillStyle='#000'; ctx.fillRect(bx+40, by, 14, boxH);
  const vis = typeLines(cap.lines, clamp((lt-0.15)/1.4));
  ctx.font=font(cap.px,FB,'700'); ctx.textBaseline='alphabetic';
  vis.forEach((l,k)=>ctx.fillText(l, bx+80, by+30+cap.px*0.95+k*lh));
  ctx.fillStyle='#000'; ctx.fillRect(0,H-90,W,90);
  ctx.fillStyle='#fff'; ctx.font=font(34,FB,'700'); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(CONFIG.site, W/2, H-45);

  if(lt<0.12){ ctx.fillStyle=`rgba(255,255,255,${(0.12-lt)/0.12*0.85})`; ctx.fillRect(0,0,W,H); }
}

function frameMeter(ctx,d,lt,t){
  drawPaper(ctx);
  const landing = lt>1.75 && lt<2.05;
  ctx.save(); if(landing) ctx.translate((Math.random()-0.5)*16,(Math.random()-0.5)*16);
  masthead(ctx,0,120,60);
  ctx.fillStyle='#000'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.font=font(110,FH); ctx.fillText('FELAKET', 60, 400); ctx.fillText('SEVİYESİ', 60, 520);
  const p = ease.inOut(clamp(lt/1.4)); const val=Math.round(d.felaket*p);
  ctx.fillStyle = val>70 ? C.red : '#000'; ctx.font=font(300,FH); ctx.fillText('%'+val, 52, 860);
  ctx.fillStyle='#fff'; ctx.fillRect(60,920,960,96); ctx.fillStyle=C.red; ctx.fillRect(60,920,960*val/100,96);
  ctx.lineWidth=7; ctx.strokeStyle='#000'; ctx.strokeRect(60,920,960,96);
  ctx.fillStyle='#000'; ctx.font=font(30,FB,'700');
  ctx.textAlign='left'; ctx.fillText('Hafif', 60, 1066); ctx.textAlign='center'; ctx.fillText('Ortalık karışır', 540, 1066); ctx.textAlign='right'; ctx.fillText('Kıyamet', 1020, 1066);
  const sp = clamp((lt-1.45)/0.32);
  if(sp>0){
    ctx.save(); ctx.translate(W/2, 1380); ctx.rotate(-0.08); const s=1.9-0.9*ease.out(sp); ctx.scale(s,s); ctx.globalAlpha=clamp(sp*2);
    ctx.fillStyle='rgba(225,6,0,0.08)'; ctx.fillRect(-420,-180,840,360);
    ctx.strokeStyle=C.red; ctx.lineWidth=12; ctx.strokeRect(-420,-180,840,360);
    ctx.lineWidth=4; ctx.strokeRect(-398,-158,796,316);
    ctx.fillStyle=C.red; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=font(48,FB,'800'); ctx.fillText(d.stat.label, 0, -112);
    const v = fit(ctx, trUpper(d.stat.value), 740, 1, 150, 70, FH); ctx.font=font(v.px,FH); ctx.fillText(v.lines[0], 0, 14);
    if(d.stat.sub){ ctx.font=font(40,FB,'700'); ctx.fillText(fit(ctx,d.stat.sub,740,1,40,28,FB,'700').lines[0], 0, 126); }
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle='#000'; ctx.fillRect(0,H-90,W,90);
  ctx.fillStyle='#fff'; ctx.font=font(34,FB,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(CONFIG.site, W/2, H-45);
}

function frameEnd(ctx,d,lt,t){
  drawPaper(ctx);
  masthead(ctx,0,150,90);
  ctx.fillStyle='#000'; ctx.fillRect(0,150,W,50);
  ctx.fillStyle='#fff'; ctx.font=font(28,FB,'700'); ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText('Kehanet baskısı  ·  '+dateStr(), 44, 176);
  ctx.textBaseline='alphabetic';
  const hp = ease.out(clamp(lt/0.35));
  const m = fit(ctx, trUpper(d.kehanet), 992, 5, 150, 70, FH);
  ctx.save(); ctx.globalAlpha=hp; ctx.translate(0,(1-hp)*40);
  ctx.fillStyle='#000'; ctx.font=font(m.px,FH);
  m.lines.forEach((l,i)=>ctx.fillText(l, 44, 290+m.px*0.9+i*m.px*1.05));
  ctx.restore();
  let y = 290 + m.px*0.9 + (m.lines.length-1)*m.px*1.05 + 90;
  ctx.fillStyle=C.yellow; const boxH = 3*62+110; ctx.fillRect(44,y-50,992,boxH); ctx.lineWidth=5; ctx.strokeStyle='#000'; ctx.strokeRect(44,y-50,992,boxH);
  ctx.fillStyle='#000'; ctx.font=font(38,FB,'800'); ctx.fillText('Hasar raporu', 74, y+8);
  d.hasar.forEach((h,i)=>{
    const a = clamp((lt-0.45-i*0.25)/0.2); if(a<=0) return;
    ctx.globalAlpha=a; const yy=y+76+i*62;
    ctx.fillStyle=C.red; ctx.font=font(40,FB,'800'); ctx.fillText('✖',74,yy);
    ctx.fillStyle='#000'; ctx.font=font(40,FB,'600'); ctx.fillText(fit(ctx,h,880,1,40,28,FB,'600').lines[0],126,yy);
    ctx.globalAlpha=1;
  });
  y += boxH + 30;
  const ta = clamp((lt-1.35)/0.3);
  if(ta>0){ ctx.globalAlpha=ta; const tz=fit(ctx,d.teselli,992,3,40,30,FB,'italic 600'); ctx.fillStyle='#3b3a36'; ctx.font=font(tz.px,FB,'italic 600'); tz.lines.forEach((l,i)=>ctx.fillText(l,44,y+tz.px+i*tz.px*1.25)); ctx.globalAlpha=1; }
  const ca = clamp((lt-1.7)/0.3);
  if(ca>0){
    const s = 1+0.03*Math.sin(t*7);
    ctx.save(); ctx.translate(W/2, H-200); ctx.scale(s,s); ctx.globalAlpha=ca;
    ctx.fillStyle='#000'; ctx.fillRect(-470+10,-90+10,940,180);
    ctx.fillStyle=C.yellow; ctx.fillRect(-470,-90,940,180); ctx.lineWidth=6; ctx.strokeStyle='#000'; ctx.strokeRect(-470,-90,940,180);
    ctx.fillStyle='#000'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=font(44,FB,'800'); ctx.fillText('Senin derdin ne?', 0, -36);
    ctx.font=font(fit(ctx,trUpper(CONFIG.site),860,1,70,40,FH).px,FH); ctx.fillText(trUpper(CONFIG.site), 0, 36);
    ctx.restore();
  }
}

/* ---------- 7) SES (tarayıcıda sentezlenir, videoya da kaydedilir) ---------- */
const sfx = {
  ctx:null, master:null, speaker:null, dest:null, noise:null, muted:false,
  ensure(){
    try{
      if(!this.ctx){
        const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
        this.speaker = this.ctx.createGain(); this.speaker.gain.value = 1;
        this.master.connect(this.speaker); this.speaker.connect(this.ctx.destination);
        if(this.ctx.createMediaStreamDestination){ this.dest = this.ctx.createMediaStreamDestination(); this.master.connect(this.dest); }
        const len = this.ctx.sampleRate; const b = this.ctx.createBuffer(1,len,this.ctx.sampleRate); const ch=b.getChannelData(0);
        for(let k=0;k<len;k++) ch[k]=Math.random()*2-1; this.noise=b;
      }
      if(this.ctx.state==='suspended') this.ctx.resume();
      return this.ctx;
    }catch(e){ return null; }
  },
  env(g,at,a,peak,dec){ g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(peak,at+a); g.gain.exponentialRampToValueAtTime(0.0001,at+a+dec); },
  osc(type,freq,at,dur,peak=0.3){ const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,at); this.env(g,at,0.01,peak,dur); o.connect(g); g.connect(this.master); o.start(at); o.stop(at+dur+0.05); return o; },
  siren(at,dur){ const o=this.ctx.createOscillator(), g=this.ctx.createGain(), f=this.ctx.createBiquadFilter(); o.type='sawtooth'; f.type='lowpass'; f.frequency.value=1800;
    for(let k=0;k<dur/0.25;k++) o.frequency.setValueAtTime(k%2?620:860, at+k*0.25);
    g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(0.13,at+0.05); g.gain.setValueAtTime(0.13,at+dur-0.15); g.gain.exponentialRampToValueAtTime(0.0001,at+dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(at); o.stop(at+dur+0.05); },
  whoosh(at){ const s=this.ctx.createBufferSource(), f=this.ctx.createBiquadFilter(), g=this.ctx.createGain(); s.buffer=this.noise; f.type='bandpass'; f.Q.value=1.2;
    f.frequency.setValueAtTime(300,at); f.frequency.exponentialRampToValueAtTime(3200,at+0.35); this.env(g,at,0.05,0.5,0.35); s.connect(f); f.connect(g); g.connect(this.master); s.start(at); s.stop(at+0.5); },
  boom(at,amt=1){ const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(130,at); o.frequency.exponentialRampToValueAtTime(38,at+0.7);
    this.env(g,at,0.005,0.9*amt,0.8); o.connect(g); g.connect(this.master); o.start(at); o.stop(at+0.9);
    const s=this.ctx.createBufferSource(), f=this.ctx.createBiquadFilter(), g2=this.ctx.createGain(); s.buffer=this.noise; f.type='lowpass'; f.frequency.value=900; this.env(g2,at,0.005,0.6*amt,0.5); s.connect(f); f.connect(g2); g2.connect(this.master); s.start(at); s.stop(at+0.7); },
  pop(at){ const o=this.osc('sine',520,at,0.12,0.25); o.frequency.exponentialRampToValueAtTime(1300,at+0.1); },
  tick(at){ this.osc('square',1400,at,0.03,0.08); },
  dun(at){ [[196,0,0.24],[185,0.28,0.24],[147,0.56,1.0]].forEach(([fq,o,d])=>{ const os=this.osc('sawtooth',fq,at+o,d,0.16); }); },
  wah(at){ [233,220,208,196].forEach((fq,k)=>{ const st=at+k*0.42, d=k===3?1.0:0.36; const o=this.ctx.createOscillator(), g=this.ctx.createGain(), f=this.ctx.createBiquadFilter();
    o.type='sawtooth'; o.frequency.setValueAtTime(fq,st); o.frequency.linearRampToValueAtTime(fq*0.94,st+d); f.type='lowpass'; f.frequency.setValueAtTime(500,st); f.frequency.linearRampToValueAtTime(1600,st+0.12); f.frequency.linearRampToValueAtTime(500,st+d);
    if(k===3){ const l=this.ctx.createOscillator(), lg=this.ctx.createGain(); l.frequency.value=6; lg.gain.value=6; l.connect(lg); lg.connect(o.frequency); l.start(st); l.stop(st+d); }
    this.env(g,st,0.03,0.2,d); o.connect(f); f.connect(g); g.connect(this.master); o.start(st); o.stop(st+d+0.05); }); },
  schedule(S){
    this.siren(S, 1.5);
    for(let i=0;i<3;i++){ const st=S+T_SC+i*TL.scene; this.whoosh(st); this.pop(st+0.3); if(i===2) this.boom(st+0.04,1); }
    for(let k=0;k<20;k++) this.tick(S+T_M+k*0.07);
    this.dun(S+T_M+1.2); this.boom(S+T_M+1.76,0.7);
    this.wah(S+T_E+0.4);
  },
  setMuted(m){ this.muted=m; if(this.speaker) this.speaker.gain.value = m?0:1; }
};

/* ---------- 8) VİDEO OYNAT + KAYDET ---------- */
function pickMime(){
  if(!window.MediaRecorder) return '';
  const list=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const m of list){ try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch(e){} }
  return '';
}
let playToken = 0;
function playAndRecord(){
  const token = ++playToken;
  const cv=$('#cv'), vid=$('#vid'), ctx=cv.getContext('2d');
  vid.pause(); vid.hidden=true; cv.hidden=false; $('#dlVideo').disabled=true;
  state.videoBlob=null;
  const ac = sfx.ensure();
  let rec=null, chunks=[], mime=pickMime();
  try{
    if(cv.captureStream && window.MediaRecorder){
      const stream = cv.captureStream(30);
      if(sfx.dest) sfx.dest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr));
      try{ rec = new MediaRecorder(stream, mime?{mimeType:mime, videoBitsPerSecond:5000000}:undefined); }
      catch(e){ rec = new MediaRecorder(stream); mime = rec.mimeType || ''; }
    }
  }catch(e){ rec=null; }
  if(rec){
    rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if(token!==playToken) return;
      $('#recBadge').hidden=true;
      if(!chunks.length){ toast('Video kaydedilemedi, kartı indirebilirsin.'); return; }
      const type = (mime||chunks[0].type||'video/webm').split(';')[0];
      state.videoBlob = new Blob(chunks,{type}); state.videoExt = type.includes('mp4')?'mp4':'webm';
      vid.src = URL.createObjectURL(state.videoBlob); vid.hidden=false; cv.hidden=true; $('#dlVideo').disabled=false;
      vid.muted = sfx.muted; vid.play().catch(()=>{});
    };
    try{ rec.start(250); $('#recBadge').hidden=false; }catch(e){ rec=null; }
  }
  const S = ac ? ac.currentTime+0.1 : 0;
  if(ac){ try{ sfx.schedule(S); }catch(e){} }
  const t0 = performance.now()+100;
  const sx = cv.width / W;
  function loop(){
    if(token!==playToken){ if(rec && rec.state!=='inactive') rec.stop(); return; }
    let t = ac ? ac.currentTime - S : (performance.now()-t0)/1000;
    t = Math.max(0,t);
    ctx.setTransform(sx,0,0,sx,0,0);
    drawFrame(ctx, state.data, state.imgs, Math.min(t, TOTAL-0.001));
    if(t < TOTAL) requestAnimationFrame(loop);
    else if(rec && rec.state!=='inactive'){ setTimeout(()=>{ try{ rec.stop(); }catch(e){} }, 150); }
    else if(!rec){ $('#recBadge').hidden=true; toast('Bu tarayıcı video kaydetmiyor. Kartı indirebilir ya da ekran kaydı alabilirsin.',4500); }
  }
  requestAnimationFrame(loop);
}

/* ---------- 9) ARAYÜZ ---------- */
const state = { cat:'auto', data:null, imgs:[null,null,null], videoBlob:null, videoExt:'webm', cardBlob:null, busy:false, lastText:'', settings:Object.assign({},DEFAULT_SETTINGS,store.get('bny.settings',{})) };

const EXAMPLES = [
  ['⚽','Yarın Barcelona\'yla maçımız var, bize ne yapacaklar?'],
  ['🩴','Annemin en sevdiği vazoyu kırdım, ne yapacak?'],
  ['📚','Ödevi yapmadım, hoca yarın ne yapar?'],
  ['💼','Patronun sunum dosyasını yanlışlıkla sildim.'],
  ['🏠','Ev sahibi akşam "konuşalım" dedi.'],
  ['💔','Sevgilimin doğum gününü unuttum.']
];
const LOAD_MSGS = ['Kader dosyan açılıyor…','Terlik yörüngesi hesaplanıyor…','Hakemle görüşülüyor…','Evren not alıyor…','Patronun takvimine bakılıyor…','Teyzeler bilgilendiriliyor…','Ev sahibi hesap makinesini çıkardı…'];

function showScreen(id){ ['home','loading','result'].forEach(s=>$('#'+s).hidden = s!==id); window.scrollTo({top:0}); }
function renderChips(){
  const el=$('#chips'); el.innerHTML='';
  const all=[['auto','✨ Otomatik']].concat(CAT_ORDER.map(c=>[c, CATS[c].emoji+' '+CATS[c].label]));
  all.forEach(([k,lab])=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=lab; b.setAttribute('aria-pressed', String(state.cat===k)); b.onclick=()=>{ state.cat=k; renderChips(); }; el.appendChild(b); });
}
function renderExamples(){
  const el=$('#examples');
  EXAMPLES.forEach(([e,txt])=>{ const b=document.createElement('button'); b.type='button'; b.className='ex'; b.textContent=e+' '+txt; b.onclick=()=>{ $('#q').value=txt; updateCount(); $('#q').focus(); }; el.appendChild(b); });
}
function updateCount(){ $('#count').textContent = $('#q').value.length+'/160'; }
function renderModePill(){ const s=state.settings; $('#modePill').textContent = s.mode==='ai' ? 'Yapay zekâ ('+(PROVIDERS[s.provider]||{}).name.split(' (')[0]+')' : 'Çevrimdışı motor'; }

let loadTimer=null;
function startLoading(sub){ let i=0; $('#loadMsg').textContent=LOAD_MSGS[0]; $('#loadSub').textContent=sub||''; clearInterval(loadTimer); loadTimer=setInterval(()=>{ i=(i+1)%LOAD_MSGS.length; $('#loadMsg').textContent=LOAD_MSGS[i]; },900); }
function stopLoading(){ clearInterval(loadTimer); }

async function fontsReady(){
  if(!document.fonts || !document.fonts.load) return;
  const tx='BİZE NE YAPACAK? ŞĞÜÇÖİ şğüçöı abc %0';
  try{ await Promise.race([Promise.all(['100px Anton','500 40px Barlow','600 40px Barlow','700 40px Barlow','800 40px Barlow','italic 600 40px Barlow'].map(f=>document.fonts.load(f,tx))), sleep(3000)]); }catch(e){}
}

async function run(reroll){
  if(state.busy) return;
  const text = (reroll ? state.lastText : $('#q').value).trim();
  if(!text){ const q=$('#q'); q.classList.remove('shake'); void q.offsetWidth; q.classList.add('shake'); q.focus(); toast('Önce aklındakini yaz.'); return; }
  state.lastText = text; state.busy = true;
  sfx.ensure();
  playToken++;
  const s = state.settings;
  const cat = state.cat==='auto' ? detectCat(text) : state.cat;
  const useAI = s.mode==='ai' && (s.key || (PROVIDERS[s.provider]||{}).nokey);
  showScreen('loading'); startLoading(useAI ? 'Yapay zekâ senaryoyu yazıyor' : '');
  const t0 = performance.now(); let data=null, note='';
  if(useAI){ try{ data = await aiScenario(text, cat, s); }catch(e){ console.warn(e); note='Yapay zekâ cevap vermedi, çevrimdışı motor devreye girdi.'; } }
  if(!data) data = offlineScenario(text, cat);
  state.imgs=[null,null,null];
  const imgKey = s.mode==='ai' && s.aiImages ? (s.provider==='pollinations' ? s.key : s.imgKey) : '';
  if(imgKey){
    $('#loadSub').textContent='Sahneler çiziliyor (bu biraz sürebilir)';
    const prompts = data.sahneler.map((sc,i)=> sc.gorsel || `${CATS[data.cat].en}, scene ${i+1} of a comic disaster`);
    const res = await Promise.allSettled(prompts.map(p=>withTimeout(aiImage(p, imgKey, s.imgModel), 75000)));
    state.imgs = res.map(r=>r.status==='fulfilled'?r.value:null);
    if(state.imgs.every(x=>!x)) note = note || 'AI görseller alınamadı, çizim modu kullanıldı.';
  }
  const el = performance.now()-t0; if(el<1500) await sleep(1500-el);
  await fontsReady();
  state.data = data; stopLoading(); state.busy=false;
  renderResult(); if(note) toast(note, 5000);
}

function renderResult(){
  const d=state.data, cat=CATS[d.cat];
  showScreen('result');
  const st=$('#story'); st.innerHTML='';
  const mk=(tag,cls,txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
  st.appendChild(mk('div','kicker',cat.emoji+' '+cat.label+' dosyası · felaket seviyesi %'+d.felaket));
  st.appendChild(mk('h3',null,d.kehanet));
  const ol=mk('ol'); d.sahneler.forEach(s=>ol.appendChild(mk('li',null,s.metin))); st.appendChild(ol);
  const box=mk('div','box'); box.appendChild(mk('h4',null,'Hasar raporu')); const ul=mk('ul'); d.hasar.forEach(h=>ul.appendChild(mk('li',null,h))); box.appendChild(ul); st.appendChild(box);
  st.appendChild(mk('p','teselli',d.teselli));
  buildCard();
  playAndRecord();
}

function buildCard(){
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  drawCard(c.getContext('2d'), state.data, state.imgs);
  $('#dlCard').disabled=true;
  c.toBlob(b=>{ if(!b) return; state.cardBlob=b; const u=URL.createObjectURL(b); $('#cardImg').src=u; $('#vid').poster=u; $('#dlCard').disabled=false; }, 'image/png');
}

function slug(s){ return trLower(s).replace(/[çğıöşü]/g,ch=>({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'}[ch])).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'kehanet'; }
function download(blob,name){ const a=document.createElement('a'); const u=URL.createObjectURL(blob); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000); }

async function share(){
  const d=state.data; if(!d) return;
  const text = `“${d.soru}”\n${d.kehanet}\nSen de sor: ${CONFIG.site}`;
  const files=[];
  if(state.videoBlob) files.push(new File([state.videoBlob], 'acaba.'+state.videoExt, {type:state.videoBlob.type}));
  else if(state.cardBlob) files.push(new File([state.cardBlob], 'acaba.png', {type:'image/png'}));
  try{
    if(files.length && navigator.canShare && navigator.canShare({files})){ await navigator.share({files, text}); return; }
    if(navigator.share){ await navigator.share({text}); return; }
  }catch(e){ if(e && e.name==='AbortError') return; }
  try{ await navigator.clipboard.writeText(text); toast('Metin kopyalandı. Videoyu indirip paylaşabilirsin.'); }catch(e){ toast('Videoyu indirip istediğin yerde paylaşabilirsin.'); }
}

function speak(){
  const d=state.data; if(!d) return;
  if(!('speechSynthesis' in window)){ toast('Bu tarayıcı sesli okumayı desteklemiyor.'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance([d.kehanet].concat(d.sahneler.map(s=>s.metin), [d.teselli]).join(' … '));
  u.lang='tr-TR'; u.rate=1.04;
  const v = speechSynthesis.getVoices().find(v=>v.lang && v.lang.toLowerCase().startsWith('tr')); if(v) u.voice=v;
  speechSynthesis.speak(u);
}

/* Ayarlar */
function fillSettings(){
  const s=state.settings, sel=$('#provider');
  if(!sel.options.length) Object.entries(PROVIDERS).forEach(([k,p])=>{ const o=document.createElement('option'); o.value=k; o.textContent=p.name; sel.appendChild(o); });
  document.querySelectorAll('input[name=mode]').forEach(r=>r.checked = r.value===s.mode);
  sel.value=s.provider; $('#apiKey').value=s.key; $('#model').value=s.model; $('#baseUrl').value=s.base; $('#aiImages').checked=!!s.aiImages; $('#imgKey').value=s.imgKey; $('#imgModel').value=s.imgModel;
  $('#testRes').textContent=''; syncSettingsUI();
}
function readSettings(){
  const mode = (document.querySelector('input[name=mode]:checked')||{}).value || 'offline';
  return { mode, provider:$('#provider').value, key:$('#apiKey').value.trim(), model:$('#model').value.trim(), base:$('#baseUrl').value.trim(), aiImages:$('#aiImages').checked, imgKey:$('#imgKey').value.trim(), imgModel:$('#imgModel').value.trim() };
}
function syncSettingsUI(){
  const s=readSettings(), p=PROVIDERS[s.provider]||PROVIDERS.custom;
  $('#aiFields').style.opacity = s.mode==='ai' ? '1' : '.45';
  $('#keyHint').innerHTML = p.hint;
  $('#model').placeholder = p.model || 'model adı'; $('#baseUrl').placeholder = p.base || 'https://…/v1';
  $('#imgKeyField').hidden = !s.aiImages || s.provider==='pollinations';
  $('#apiKey').placeholder = p.nokey ? 'Gerekmez' : 'API anahtarı';
}
$('#openSettings').onclick = () => { fillSettings(); $('#settings').showModal(); };
$('#modePill').onclick = () => { fillSettings(); $('#settings').showModal(); };
$('#closeSettings').onclick = () => $('#settings').close();
$('#settings').addEventListener('change', syncSettingsUI);
$('#saveSettings').onclick = () => {
  const s=readSettings();
  if(s.mode==='ai' && !s.key && !(PROVIDERS[s.provider]||{}).nokey){ $('#testRes').textContent='Yapay zekâ modu için bir API anahtarı gir ya da çevrimdışı motoru seç.'; return; }
  state.settings=s; store.set('bny.settings',s); renderModePill(); $('#settings').close(); toast('Ayarlar kaydedildi.');
};
$('#testSettings').onclick = async () => {
  const s=readSettings(); const out=$('#testRes'); out.textContent='Deneniyor…';
  try{ const r = await aiChat(s,[{role:'user',content:'Sadece "tamam" yaz.'}],20); out.textContent='Bağlantı çalışıyor ✓ ('+String(r).trim().slice(0,30)+')'; }
  catch(e){ out.textContent='Bağlanamadı: '+(e.message||e)+'. Anahtarı ve modeli kontrol et.'; }
};

/* Kurulum (PWA) */
let installEvt=null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt=e; $('#installBtn').hidden=false; $('#installBtn2').hidden=false; });
async function doInstall(){
  if(window.BKApp){ window.BKApp.install(); return; }
  if(installEvt){ installEvt.prompt(); try{ await installEvt.userChoice; }catch(e){} installEvt=null; return; }
  if(isIOS) toast('Safari\'de Paylaş butonuna dokun, sonra "Ana Ekrana Ekle".',5000);
  else toast('Tarayıcı menüsünden "Uygulamayı yükle"yi seçebilirsin.',4500);
}
$('#installBtn').onclick=doInstall; $('#installBtn2').onclick=doInstall;
// Ana ekrana ekleme penceresi (/assets/bk-app.js) her cihaz için doğru adımları gösterir; buton hep görünür
if(!isStandalone && location.protocol!=='file:'){ $('#installBtn2').hidden=false; }
/* Servis çalışanı /assets/bk-app.js tarafından kaydedilir (sw.js): ana ekrandan internetsiz açılır. */

/* Bağlantılar */
$('#go').onclick = () => run(false);
$('#q').addEventListener('input', updateCount);
$('#q').addEventListener('keydown', e => { if(e.key==='Enter' && (e.metaKey||e.ctrlKey)) run(false); });
$('#rerollBtn').onclick = () => run(true);
$('#newBtn').onclick = () => { playToken++; if(window.speechSynthesis) window.speechSynthesis.cancel(); $('#vid').pause(); showScreen('home'); $('#q').focus(); };
$('#dlVideo').onclick = () => { if(state.videoBlob) download(state.videoBlob, 'acaba-'+slug(state.data.soru)+'.'+state.videoExt); };
$('#dlCard').onclick = () => { if(state.cardBlob) download(state.cardBlob, 'acaba-'+slug(state.data.soru)+'.png'); };
$('#shareBtn').onclick = share;
$('#speakBtn').onclick = speak;
if(CONFIG.sourceUrl) $('#sourceLink').href = CONFIG.sourceUrl; else $('#sourceLink').hidden = true;
if(CONFIG.hubUrl){ $('#hubLink').href = CONFIG.hubUrl; $('#hubLink').hidden = false; }
$('#today').textContent = dateStr();
renderChips(); renderExamples(); renderModePill(); updateCount();

/* Test ve geliştirme için */
window.BNY = { detectCat, detectTeams, offlineScenario, parseAI, drawCard, drawFrame, TOTAL, state };
