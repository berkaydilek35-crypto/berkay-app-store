/* =========================================================
   ACABA?  —  açık kaynak (MIT)
   Tek dosya. Sunucu yok. Görsel ve video tarayıcıda üretilir.
   ========================================================= */

/* ---------- 1) KENDİNE GÖRE DÜZENLE ---------- */
const CONFIG = {
  site: 'berkay.instaassist.tr',        // video ve kartta görünen adres
  sourceUrl: '/downloads/acaba.zip',    // "Uygulamayı indir" butonu (boşsa gizlenir)
  hubUrl: '/',                           // Berkay'ın uygulamaları sayfası
  brand: 'ACABA?'
};

/* ---------- 2) YARDIMCILAR ---------- */
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const rint = (a,b) => Math.floor(rnd(a,b+1));
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { const c=a.slice(); for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [c[i],c[j]]=[c[j],c[i]];} return c; };
const sample = (a,n) => shuffle(a).slice(0,n);
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const trLower = s => String(s).toLocaleLowerCase('tr-TR');
const trUpper = s => String(s).toLocaleUpperCase('tr-TR');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const ease = {
  out: t => 1-Math.pow(1-t,3),
  inOut: t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2,
  back: t => { const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
};
const store = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
};
function withTimeout(p,ms){ return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]); }
let toastTimer=null;
function toast(msg,ms=2600){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),ms); }

/* ---------- 3) KATEGORİLER ---------- */
const CATS = {
  mac:      {label:'Maç',       emoji:'⚽', color:'#1fbf6a', color2:'#0b4a2a', particle:'⚽', en:'a football match, stadium'},
  patron:   {label:'Patron',    emoji:'💼', color:'#3d8bff', color2:'#0f2a52', particle:'📄', en:'an office, an angry boss'},
  hoca:     {label:'Hoca',      emoji:'📚', color:'#a874ff', color2:'#2f1857', particle:'📝', en:'a classroom, a strict teacher'},
  anne:     {label:'Anne',      emoji:'🩴', color:'#ff5fa2', color2:'#5a1434', particle:'🩴', en:'a Turkish home, an angry mother with a slipper'},
  sevgili:  {label:'Sevgili',   emoji:'💔', color:'#ff3b5c', color2:'#55101f', particle:'💔', en:'a couple, phone messages, drama'},
  evsahibi: {label:'Ev sahibi', emoji:'🏠', color:'#ffa51f', color2:'#583705', particle:'💸', en:'an apartment, a greedy landlord with a calculator'},
  diger:    {label:'Diğer',     emoji:'🌀', color:'#23d5d9', color2:'#08424a', particle:'❓', en:'absurd chaos, the universe laughing'}
};
const CAT_ORDER = ['mac','patron','hoca','anne','sevgili','evsahibi','diger'];

/* ---------- 4) ÇEVRİMDIŞI KEHANET MOTORU ----------
   {R} = rakip takım, {B} = bizim takım. Yeni satır eklemek serbest.
   Sahne satırı: [metin, kötü emoji, kurban emoji]                   */
const TPL = {
  mac: {
    f:[78,99],
    kehanet:[
      '{R} bize gol atmayacak. Gol yağdıracak.',
      'Skor tabelası bu maçta ilk kez fazla mesai yapacak.',
      'Maç 90 dakika sürecek, bizim acımız 90 gün.',
      'VAR bile izlemeye dayanamayıp odadan çıkacak.',
      'Bu maçın özeti haber bültenlerinde "+18, rahatsız edici görüntüler" uyarısıyla verilecek.'
    ],
    s1:[
      ['Daha ısınma turunda {R} oyuncuları top yerine bizim moralimizi sektiriyor.','😈','😰'],
      ['Tünelde karşılaştılar. {R} oyuncuları gülümsedi. Bizimkiler annesini aradı.','😏','😨'],
      ['Hakem yazı-turayı attı. Para bile {R} tarafına düştü.','🪙','😬'],
      ['Bizim kaleci maç öncesi direğe sarılıp "Bugün beni yalnız bırakma" dedi.','🥅','🥺']
    ],
    s2:[
      ['Dakika 7: ilk gol. Dakika 9: ikinci gol. Dakika 10: tribün "en azından hava güzel" moduna geçti.','⚽','😱'],
      ['Bizim savunma ofsayt tuzağı kurdu. {R} tuzağın üstünden atlayıp gol attı, bir de el salladı.','🏃','🤦'],
      ['Bizimkiler topa ilk kez 23. dakikada dokundu. O da santra için.','⚽','😶'],
      ['Teknik direktör kenardan taktik verdi. Oyuncular taktik tahtasını ters tuttu.','📋','😵‍💫']
    ],
    s3:[
      ['Son düdük. Skor tabelası duman çıkarıp yanıyor. Spiker sadece "yazık" diyor.','🔥','😭'],
      ['Maç sonu {R} oyuncuları forma değişmek istedi. Bizimkiler formayı ikinci el satmaya razı oldu.','👕','😭'],
      ['Kaleci topu ağlardan o kadar çok çıkardı ki spor salonu üyeliğini iptal etti.','💪','🫠'],
      ['Taraftar stattan çıkarken birbirine söz verdi: "Biz bugün burada değildik."','🏟️','🫥']
    ],
    hasar:['Moral: kritik seviyede','Grup sohbeti: 3 gün sessiz','Sosyal medya hesabı: gizliye alındı','Forma: dolabın en dibine sürgün','Arkadaşlarla iddia: kaybedildi, ödeme taksitli','Uykusuz gece: en az bir adet'],
    teselli:['Neyse ki bir sonraki maç var. Ondan da umutlu değiliz ama var.','Unutma, futbol sadece bir oyun. Bunu kendine üç hafta boyunca söyleyeceksin.','İyi tarafından bak: daha kötüsü olamaz. (Olabilir.)'],
    stat: v => pick([{label:'Skor',value:`${rint(5,9)} – 0`,sub:`${v.R} – ${v.B}`},{label:'Topla oynama',value:`%${rint(81,97)}`,sub:`${v.R} lehine`},{label:'İsabetli şut',value:`${rint(14,31)} – 0`,sub:`${v.R} – ${v.B}`}])
  },
  patron: {
    f:[70,96],
    kehanet:[
      'Patron sana bağırmayacak. Daha kötüsünü yapacak: "Bir dakika odama gel" diyecek.',
      'Bu iş için toplantı yapılacak. Toplantının konusu: sen.',
      'Patron "sorun değil" diyecek. Asıl sorun o zaman başlayacak.',
      'Bu olay şirket tarihine "o hafta" diye geçecek.'
    ],
    s1:[
      ['Sabah 09.01. Patron ofise girdi, herkese günaydın dedi. Sana demedi.','🧔','😰'],
      ['Mesaj geldi: "Müsait misin?" Noktalama yok. Emoji yok. Sadece korku var.','📱','😨'],
      ['Takvimine "15.00 Konuşalım" eklendi. Katılımcılar: sen ve İK.','📅','😬']
    ],
    s2:[
      ['Toplantı odası. Patron sessizce bir Excel açtı. Satır 47 kırmızı. Satır 47 sensin.','📊','😱'],
      ['Patron "Kızgın değilim, hayal kırıklığına uğradım" dedi. Ofisteki saksı çiçeği soldu.','😤','🥀'],
      ['Sunumu açman istendi. Bilgisayar tam o an güncelleme yüklemeye karar verdi: %1.','💻','🫠']
    ],
    s3:[
      ['Ceza açıklandı: cuma akşamı "kısa bir" toplantı. Tahmini süre: sonsuz.','⏰','😵'],
      ['Masan pencereden alınıp yazıcının yanına taşındı. Artık kâğıt sıkışmalarının sorumlusu sensin.','🖨️','😭'],
      ['Patron sana yeni görev verdi: bu işi yapmayan kişiyi bulmak. İpucu: aynaya bak.','🪞','🫥']
    ],
    hasar:['Hafta sonu planları: iptal','Mesai: +∞ saat','Kahve tüketimi: tehlikeli seviyede','Öğle arası: 7 dakikaya indirildi','LinkedIn: gizlice açıldı'],
    teselli:['En kötü ihtimalle özgeçmişini güncellemiş olursun. Zaten 2019\'dan beri bakmıyordun.','Unutma, patron da bir zamanlar senin gibiydi. Sonra patron oldu, işte bu yüzden böyle.','İyi haber: bu da bir tecrübe. Kötü haber: tecrübe maaşa yansımıyor.'],
    stat: () => pick([{label:'Çıkış saati',value:'23.47',sub:'tahmini'},{label:'Okunmamış e-posta',value:rint(900,2400).toLocaleString('tr-TR'),sub:'hepsi "acil"'},{label:'"Odama gel" sayısı',value:`×${rint(3,9)}`,sub:'bugün'}])
  },
  hoca: {
    f:[65,94],
    kehanet:[
      'Hoca kızmayacak. Sadece "Peki" diyecek ve gözlüğünü çıkaracak. Bu daha kötü.',
      'Ödevi yapmadığını hoca daha sınıfa girmeden bilecek. Hocalarda radar var.',
      'Bu dönem not değil, ders alacaksın. Hem de hayat dersi.',
      'Hoca bu olayı 20 yıl sonra yeni öğrencilerine örnek olarak anlatacak.'
    ],
    s1:[
      ['Hoca sınıfa girdi ve gülümsedi. Hocalar gülümsediğinde bir şeyler ters gider.','👨‍🏫','😅'],
      ['Hoca listeyi açtı: "Ödevleri alalım." Sıra sana yaklaşıyor. Beş kişi, üç kişi, bir kişi…','📋','😰'],
      ['"Köpeğim yedi" bahaneni hazırladın. Köpeğinin olmadığını hoca biliyor.','🐕','😬']
    ],
    s2:[
      ['Hoca ödevini istemedi. Tahtada sözlü anlatmanı istedi. Sınıf patlamış mısır çıkardı.','🍿','😱'],
      ['Hoca deftere bir şey yazdı. Sadece bir şey. Ama kırmızı kalemle.','🖍️','😨'],
      ['Bahaneni anlattın. Hoca "Çok yaratıcı, bunu kompozisyon olarak getir" dedi. Artık iki ödevin var.','📝','🫠']
    ],
    s3:[
      ['Hoca seni sınıf başkanı yaptı. Artık herkesin ödevini toplamak senin işin.','👑','😭'],
      ['Finalde ilk soru: "Geçen hafta yapmadığın ödevi şimdi yap."','📄','😵'],
      ['Hoca veliyle görüşmek istedi. Evdeki ikinci hoca devreye girdi.','☎️','🫥']
    ],
    hasar:['Ortalama: yokuş aşağı','Teneffüs: iptal, ceza ödevi var','Sıra arkadaşı: seni tanımıyor gibi yapıyor','Ödev sayısı: ×2','Hocanın gözünde imajın: "potansiyeli var ama…"'],
    teselli:['İyi haber: ödev hâlâ yapılabilir. Kötü haber: senin yapman gerekiyor.','Bu da geçer. Tıpkı o ödev gibi. (Geçmedi.)','Unutma: her büyük insanın yapılmamış bir ödevi vardır. Ama yine de yap.'],
    stat: () => pick([{label:'Not',value:'FF',sub:'fena fena'},{label:'Ceza ödevi',value:`×${rint(2,5)}`,sub:'teslim: yarın'},{label:'Devamsızlık',value:`${rint(9,13)} gün`,sub:'sınırda'}])
  },
  anne: {
    f:[85,100],
    kehanet:[
      'Annen kızmayacak. "Tamam" diyecek. Türkçedeki en tehlikeli kelime.',
      'Terlik fırlatılacak. Terlik yörüngeye girecek.',
      'Annen bu olayı sen 40 yaşına gelene kadar her bayramda anlatacak.',
      'Bugün evde sessizlik olacak. Fırtına öncesi sessizlik.'
    ],
    s1:[
      ['Kapıdan girdin. Ev çok sessiz. Çay demlenmemiş. Bu kötüye işaret.','👩','😬'],
      ['Annen tam adınla seslendi. Göbek adın dahil. O adı sen bile unutmuştun.','📢','😨'],
      ['Annen telefonu aldı: "Teyzeni arıyorum, bir anlatayım." Olay artık uluslararası.','📞','😰']
    ],
    s2:[
      ['Annen terliğe uzandı. Ağır çekim. Arkada destansı müzik. Kaçış yolu yok.','🩴','😱'],
      ['"Ben senin yaşındayken…" cümlesi başladı. Tahmini süre: 45 dakika, reklamsız.','🗣️','🫠'],
      ['Annen sessizce bulaşık yıkıyor. Ama tabakları biraz fazla sesli koyuyor. Her tabak bir mesaj.','🍽️','😨']
    ],
    s3:[
      ['Terlik fırlatıldı. Fizik kuralları askıya alındı. Terlik köşeyi döndü ve seni buldu.','🩴','😵'],
      ['Ceza açıklandı: Wi-Fi şifresi değişti. Yeni şifre: odanitopla123.','📶','😭'],
      ['Olay aile grubuna düştü. 14 teyze, 3 dayı ve uzak bir kuzen "görüldü".','💬','🫥']
    ],
    hasar:['Harçlık: donduruldu','Wi-Fi: erişim kısıtlandı','Akşam yemeği: sevmediğin yemek','Aile grubundaki itibar: yerlerde','Terlik: hâlâ havada'],
    teselli:['Merak etme, annen seni yine seviyor. Sadece şu an bunu terlikle ifade ediyor.','Bir çay demle, bulaşıkları yıka. Bilinen en etkili özür.','Bu akşam sofrada sessizlik olacak ama yarın börek de olacak.'],
    stat: () => pick([{label:'Terlik hızı',value:`${rint(120,190)} km/s`,sub:'yeni rekor'},{label:'Söylenme süresi',value:`${rint(35,90)} dk`,sub:'reklamsız'},{label:'Tam adınla çağrılma',value:`×${rint(3,7)}`,sub:'göbek adı dahil'}])
  },
  sevgili: {
    f:[72,97],
    kehanet:[
      '"Bir şey yok" diyecek. Bir şey var. Hem de çok şey var.',
      'Sevgilin kızmayacak. Sadece "kendine iyi bak" yazıp son görülmeyi kapatacak.',
      'Bu olay 2031\'deki bir tartışmada yeniden gündeme gelecek. Not alındı.'
    ],
    s1:[
      ['Mesajına "ok" cevabı geldi. İki harf. Nokta yok. İçinde fırtına var.','📱','😬'],
      ['Sevgilin hikâye paylaştı: bir manzara fotoğrafı ve "bazı insanlar…" yazısı.','📸','😨'],
      ['"Konuşmamız lazım" mesajı geldi. Telefonun şarjı da tam o an %3.','🔋','😰']
    ],
    s2:[
      ['Soru geldi: "Ben neye kızdım sence?" Yanlış cevap: hepsi.','🤨','😱'],
      ['Ortak arkadaşlar taraf seçmeye başladı. Senin tarafında sadece kedi var. O da emin değil.','🐈','🫠'],
      ['Özür diledin. "Neden özür diliyorsun?" diye soruldu. Döngü başladı.','🌀','😵‍💫']
    ],
    s3:[
      ['Barıştınız. Ama artık film seçme hakkı ömür boyu onda.','🎬','😭'],
      ['Olay en yakın arkadaşına anlatıldı. Arkadaşı sana öyle bir baktı ki…','👀','🫥'],
      ['Ceza: hafta sonu onun ailesiyle kahvaltı. Teyze "ne iş yapıyorsun" diye dört kez soracak.','🍳','😵']
    ],
    hasar:['Son görülme: kapatıldı','Film seçme hakkı: kalıcı olarak devredildi','Mesajlar: tek tik','Ortak arkadaşlar: tarafsız (değil)','Gönül: hasarlı ama onarılabilir'],
    teselli:['Çiçek al. Tatlı al. Bir tatlı daha al. Garantisi yok ama istatistikler umut verici.','Unutma: "Haklısın" iki kelimelik bir mucizedir.','Bu da geçer. Ama önce bir hafta "tamam"larla geçer.'],
    stat: () => pick([{label:'Son görülme',value:`${rint(2,6)} gün`,sub:'önce'},{label:'"Bir şey yok"',value:`×${rint(6,19)}`,sub:'bugün'},{label:'Cevap süresi',value:`${rint(3,9)} saat`,sub:'tek kelime'}])
  },
  evsahibi: {
    f:[88,100],
    kehanet:[
      'Ev sahibi kirayı artırmayacak. Kirayı başka bir boyuta taşıyacak.',
      'Yeni kira mahalledeki tüm emlakçılar tarafından ayakta alkışlanacak.',
      'Ev sahibi "Oğlum gelecek" diyecek. Ev sahibinin oğlu yok.'
    ],
    s1:[
      ['Telefon çaldı. Ekranda "Ev Sahibi". Kalp atışın kira artış oranına yetişti.','📞','😰'],
      ['Ev sahibi "Bir uğrayacağım" dedi. Neden, kimse bilmiyor. Ama yanında hesap makinesi var.','🧮','😨'],
      ['Kapıda bir zarf var. Üstünde sadece "Yeni dönem" yazıyor.','✉️','😬']
    ],
    s2:[
      ['Ev sahibi evi geziyor: "Bu manzara, bu ışık…" Her övgü yüzde on.','🧐','😱'],
      ['Yeni kira açıklandı. Komşunun kedisi bile duyup taşınmaya karar verdi.','💸','🙀'],
      ['Pazarlık yapmaya çalıştın. Ev sahibi "Piyasa böyle" dedi ve piyasayı kendisi belirledi.','📈','🫠']
    ],
    s3:[
      ['Yeni kira onaylandı. Maaşın kiraya, kira da ev sahibinin yazlığına gidiyor.','🏖️','😭'],
      ['Ev sahibi "Boya badana senden" dedi. Bir de kombi. Bir de… neyse.','🎨','😵'],
      ['Emlakçı ilanı çoktan hazırlamış: "Ferah, aydınlık, eski kiracısı ağlıyor."','🪧','🫥']
    ],
    hasar:['Maaş: kiraya transfer edildi','Market sepeti: sadece makarna','Taşınma kutuları: sipariş verildi','Emlak sitesi: 47 sekme açık','Hayaller: onlar da kirada'],
    teselli:['İyi tarafından bak: şu an bir evin var. (Ay sonuna kadar.)','Her şeyin bir çaresi vardır. Kira hariç.','Balkonda bir çay iç. Bu balkon için ödediğin paraya değsin.'],
    stat: () => pick([{label:'Yeni kira',value:`+%${rint(150,400)}`,sub:'"piyasa böyle"'},{label:'Zam oranı',value:'EVET',sub:''},{label:'Depozito',value:`${rint(3,6)} kira`,sub:'peşin'}])
  },
  diger: {
    f:[60,95],
    kehanet:[
      'Korktuğun şey olmayacak. Çok daha yaratıcısı olacak.',
      'Evren bu durumu not aldı ve bir planı var. Planı beğenmeyeceksin.',
      'Sonuç: kaos. Ama estetik bir kaos.'
    ],
    s1:[
      ['Her şey normal görünüyor. Fazla normal. Kuşlar bile susmuş.','🐦','😶'],
      ['Kimse fark etmedi diye düşündün. Herkes fark etti. Kediler bile.','🐈','😬'],
      ['Bir plan yaptın. Evren planını gördü ve güldü.','🌌','😅']
    ],
    s2:[
      ['İşler tam yoluna girecekken telefonun düştü. Ekran tarafı. Tabii ki.','📱','😱'],
      ['Yardım istedin. Yardım geldi, ama yanlış adrese.','🚚','🫠'],
      ['Her şeyi düzeltmeye çalıştın. Şimdi iki sorun var. Biri yeni, biri senin eserin.','🔧','😵‍💫']
    ],
    s3:[
      ['Son durum: olay mahallede efsane oldu. Çocuklar bile anlatıyor.','📣','😭'],
      ['Final: her şey yerine oturdu. Sen hariç. Sen bir köşede çay içiyorsun.','🫖','🫥'],
      ['Olay öyle büyüdü ki adını bir fırtınaya verdiler.','🌪️','😵']
    ],
    hasar:['Gurur: hafif çizik','B planı: yok. C planı: hiç olmadı','Uyku: 4 saat (iyimser)','Etrafındakiler: patlamış mısır hazırlıyor','Şans: bakımda'],
    teselli:['Bu da geçer. Çoğu şey geçer. Bazıları biraz yavaş geçer.','Yarın buna gülüyor olacaksın. Belki yarından sonra.','En azından iyi bir hikâyen oldu.'],
    stat: () => pick([{label:'Kaos endeksi',value:`${rint(8,9)},${rint(1,9)}/10`,sub:''},{label:'Şans',value:'%0',sub:'bakımda'}])
  }
};

/* Takım tanıma (maç kategorisi) — [yazım, görünen ad, kesin sınır?] */
const TEAMS = [
  ['galatasaray','Galatasaray'],['cimbom','Galatasaray',1],['fenerbahçe','Fenerbahçe'],['fenerbahce','Fenerbahçe'],['fener','Fenerbahçe',1],
  ['beşiktaş','Beşiktaş'],['besiktas','Beşiktaş'],['trabzonspor','Trabzonspor'],['trabzon','Trabzonspor',1],['başakşehir','Başakşehir'],['basaksehir','Başakşehir'],
  ['göztepe','Göztepe'],['goztepe','Göztepe'],['karşıyaka','Karşıyaka'],['karsiyaka','Karşıyaka'],['altay','Altay',1],['bursaspor','Bursaspor'],
  ['samsunspor','Samsunspor'],['kasımpaşa','Kasımpaşa'],['konyaspor','Konyaspor'],['antalyaspor','Antalyaspor'],['sivasspor','Sivasspor'],['eyüpspor','Eyüpspor'],
  ['kocaelispor','Kocaelispor'],['rizespor','Rizespor'],['alanyaspor','Alanyaspor'],['kayserispor','Kayserispor'],
  ['barcelona','Barcelona'],['barça','Barcelona',1],['barca','Barcelona',1],['real madrid','Real Madrid'],['real','Real Madrid',1],['atletico','Atlético Madrid'],
  ['bayern','Bayern Münih'],['dortmund','Dortmund'],['psg','PSG',1],['liverpool','Liverpool'],['manchester city','Manchester City'],['man city','Manchester City'],
  ['manchester united','Manchester United'],['arsenal','Arsenal'],['chelsea','Chelsea'],['tottenham','Tottenham'],['juventus','Juventus'],
  ['milan','Milan',1],['inter','Inter',1],['napoli','Napoli'],['roma','Roma',1],['ajax','Ajax',1],['porto','Porto',1],['benfica','Benfica'],
  ['almanya','Almanya'],['fransa','Fransa'],['ingiltere','İngiltere'],['italya','İtalya'],['ispanya','İspanya'],['portekiz','Portekiz'],
  ['hırvatistan','Hırvatistan'],['yunanistan','Yunanistan'],['brezilya','Brezilya'],['arjantin','Arjantin'],['hollanda','Hollanda'],['belçika','Belçika']
];
const L = 'a-zçğıöşüâîû0-9';
function detectTeams(text){
  const low = trLower(text).replace(/[’`´]/g,"'");
  const found=[];
  for(const [k,name,strict] of TEAMS){
    const re = new RegExp('(^|[^'+L+'])'+escRe(k)+(strict?'(?!['+L+'])':''));
    const m = re.exec(low);
    if(!m) continue;
    const idx = m.index + m[1].length;
    const ex = found.find(f=>f.name===name);
    if(!ex) found.push({name,idx,end:idx+k.length});
    else if(idx<ex.idx){ ex.idx=idx; ex.end=idx+k.length; }
  }
  if(!found.length) return {};
  found.sort((a,b)=>a.idx-b.idx);
  found.forEach((f,i)=>{
    const after = low.slice(f.end, f.end+30);
    f.score = i===0 ? 1 : 0;
    if(/^[^\s]*\s*(bize|bizi|bizim)/.test(after)) f.score+=3;
    if(/^'?(yla|yle|la|le)(?![a-zçğıöşü])/.test(after) || /^\s+(ile|karşı|karsi)(?![a-zçğıöşü])/.test(after) || /^'?(ya|ye|a|e)\s+(karşı|karsi)/.test(after)) f.score+=2;
  });
  const r = found.slice().sort((a,b)=>b.score-a.score || a.idx-b.idx)[0];
  const b = found.find(f=>f!==r);
  return {r:r.name, b:b?b.name:null, count:found.length};
}

const CAT_KEYS = {
  mac:['maç','mac','gol','derbi','takım','takim','lig','şampiyonlar','sampiyonlar','deplasman','penaltı','penalti','hakem','kupa','stat','forma','milli maç'],
  patron:['patron','müdür','mudur','şef','yönetici','toplantı','toplanti','mesai','ofis','rapor','sunum','müşteri','musteri','deadline','iş yerinde','işe geç','ise gec','işten','isten'],
  hoca:['hoca','öğretmen','ogretmen','ödev','odev','sınav','sinav','vize','ders','okul','proje','devamsızlık','devamsizlik','karne','üniversite','universite','teslim'],
  anne:['anne','annem','annemin','annemi','babam','baban','vazo','terlik','bulaşık','bulasik','odamı','odami','harçlık','harclik'],
  sevgili:['sevgili','kız arkadaş','erkek arkadaş','kiz arkadas','erkek arkadas','eşim','esim','karım','karim','kocam','flört','flort','yıldönümü','yildonumu','görüldü','goruldu','barış','sevgilim'],
  evsahibi:['ev sahibi','evsahibi','kira','kiracı','kiraci','emlak','depozito','tahliye','aidat']
};
function detectCat(text){
  const low = trLower(text);
  const score = {};
  for(const c in CAT_KEYS){
    score[c]=0;
    for(const k of CAT_KEYS[c]){ if(new RegExp('(^|[^'+L+'])'+escRe(k)).test(low)) score[c]++; }
  }
  if(detectTeams(text).count) score.mac += 3;
  let best='diger', bs=0;
  for(const c of CAT_ORDER){ if((score[c]||0)>bs){ bs=score[c]; best=c; } }
  return best;
}

function offlineScenario(text, cat){
  const T = TPL[cat];
  const teams = cat==='mac' ? detectTeams(text) : {};
  const vars = {R: teams.r || 'Rakip takım', B: teams.b || 'Bizimkiler'};
  const f = s => s.replace(/\{(\w)\}/g,(m,k)=>vars[k]!==undefined?vars[k]:m);
  const sc = [pick(T.s1), pick(T.s2), pick(T.s3)].map(s=>({metin:f(s[0]), a:s[1], v:s[2]}));
  return { cat, soru:text, kehanet:f(pick(T.kehanet)), felaket:rint(T.f[0],T.f[1]), stat:T.stat(vars),
           sahneler:sc, hasar:sample(T.hasar,3).map(f), teselli:f(pick(T.teselli)), source:'offline' };
}

