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
      'Bu maçın özeti haber bültenlerinde "+18, rahatsız edici görüntüler" uyarısıyla verilecek.',
      '{R} gol atmayacak. Gol maxxing yapacak.',
      'Skor tabelası bu maçtan sonra terapiye başlayacak.',
      'VAR kayda bakacak, derin bir iç çekecek, monitörü kapatacak.',
      'Bizim defans bu maçta NPC moduna geçecek. Etrafta dolaşıp selam verecekler.',
      'Maç 90 dakika sürecek. Grup sohbetindeki sessizlik 3 hafta.'
    ],
    s1:[
      ['Tünelde karşılaştılar. {R} oyuncuları aura yayıyor. Bizimkiler annesine konum atıyor.','😏','😨'],
      ['Hakem yazı-tura attı. Para bile {R} tarafına düştü. Bu artık kişisel.','🪙','😬'],
      ['Bizim kaleci maçtan önce direğe sarılıp "Bugün beni yalnız bırakma kanka" dedi.','🥅','🥺'],
      ['Isınma turu. {R} rondo yapıyor, bizimkiler hâlâ krampon bağcığıyla boğuşuyor.','👟','😶'],
      ['Maç önü röportaj: "Kazanmaya geldik." Arkadan {R} soyunma odasından kahkaha sesleri geliyor.','🎤','😅']
    ],
    s2:[
      ['Dakika 7 gol, dakika 9 gol. Dakika 10: tribün maçı bırakıp hava durumunu konuşuyor.','⚽','😱'],
      ['Ofsayt tuzağı kurduk. {R} tuzağın üstünden atladı, gol attı, bir de kameraya kalp yaptı.','🏃','🤦'],
      ['Bizimkiler topa ilk kez 23. dakikada dokundu. Santra için.','⚽','😶'],
      ['{R} topuk pası attı. Bizim stoper -1000 aura kaybetti, hâlâ yerde.','🦶','🫠'],
      ['Teknik direktör kenardan taktik verdi. Oyuncular tahtayı ters tuttu, kimse fark etmedi.','📋','😵‍💫']
    ],
    s3:[
      ['Son düdük. Spiker 3 saniye sustu, sonra canlı yayında sadece "Sıçtık." dedi.','🎙️','💀'],
      ['Forma değişimi: {R} formayı almadı. "Kalsın kanka, hatıra olsun" dedi.','👕','😭'],
      ['Taraftarlar stattan çıkarken birbirine söz verdi: "Biz bugün burada değildik."','🏟️','🫥'],
      ['Kaleci topu ağdan o kadar çok çıkardı ki spor salonu üyeliğini iptal etti. Gerek kalmadı.','💪','🫠'],
      ['Grup sohbetinde biri "neyse" yazdı. Kimse cevap vermedi. Sessizlik 3 gün sürdü.','💬','😶']
    ],
    hasar:['Moral: -1000 aura','Grup sohbeti: 3 gün sessiz','Forma: dolabın en dibine sürgün','İddia: kaybedildi, ödeme taksitli','Sosyal medya: gizliye alındı','"Hakem yaktı" tweeti: taslakta bekliyor','Uyku: maç tekrarı yüzünden yok'],
    teselli:['Futbol sadece bir oyun. Bunu kendine 3 hafta söyleyeceksin, 4. hafta inanacaksın.','Gelecek hafta yine maç var. Umutlu değiliz ama var.','Delulu modunu aç: "Bir dahaki sefere başka."','Tecrübe oldu. Pahalı bir tecrübe ama.'],
    stat: v => pick([{label:'Skor',value:`${rint(5,9)} – 0`,sub:`${v.R} – ${v.B}`},{label:'Topla oynama',value:`%${rint(81,97)}`,sub:`${v.R} lehine`},{label:'Bizim aura',value:`-${rint(900,999)}`,sub:'maç sonu ölçümü'}])
  },
  patron: {
    f:[70,96],
    kehanet:[
      'Patron bağırmayacak. "Bir dakika odama gelir misin." yazacak. Sonunda nokta olacak.',
      'Bu iş için toplantı yapılacak. Gündem maddesi: sen.',
      'Patron "sorun değil" diyecek. Asıl sorun o zaman başlayacak.',
      'Patron sana kızmayacak, seni CC\'ye ekleyecek. Bundan kötüsü yok.',
      'Bu olay şirket tarihine "o hafta" diye geçecek. Stajyerlere ibret diye anlatılacak.',
      'Performans değerlendirmende "gelişime açık alan" yazacak. Çevirisi: yandın.'
    ],
    s1:[
      ['Sabah 09.01. Patron herkese günaydın dedi. Sana demedi. Ofisteki herkes fark etti.','🧔','😰'],
      ['Bildirim: "Müsait misin?" Noktalama yok, emoji yok, sadece korku var.','📱','😨'],
      ['Takvimine "15.00 Kısa bir görüşme" düştü. Katılımcılar: sen, patron ve İK.','📅','😬'],
      ['Patron masanın yanından geçti. Durdu. Ekranına baktı. Ekranda Instagram açık.','👀','😳'],
      ['Mail geldi. Konu: "Re: Re: Fwd: ACİL". Ekte senin dosyan var.','📧','😰']
    ],
    s2:[
      ['Toplantı. Patron sessizce bir Excel açtı. Satır 47 kırmızı. Satır 47 sensin.','📊','😱'],
      ['Patron "Kızgın değilim, sadece hayal kırıklığına uğradım" dedi. Ofisteki saksı soldu.','😤','🥀'],
      ['Sunumu açman istendi. Bilgisayar tam o an güncelleme başlattı: %1.','💻','🫠'],
      ['"Bunu kim yaptı?" sorusu geldi. Herkes aynı anda sana döndü. Koreografi gibi.','👉','😱'],
      ['Online toplantıda mikrofonun açık kalmış. "Bu adam ne anlatıyor ya" herkes tarafından duyuldu.','🎙️','💀']
    ],
    s3:[
      ['Ceza: cuma 17.45\'te "kısa bir" toplantı. Tahmini süre: sonsuz.','⏰','😵'],
      ['Masan cam kenarından yazıcının yanına taşındı. Artık kâğıt sıkışmalarından sen sorumlusun.','🖨️','😭'],
      ['Patron yeni bir görev verdi: bu hatayı yapanı bul. İpucu: aynaya bak.','🪞','🫥'],
      ['LinkedIn\'e "Yeni fırsatlara açığım" yazdın. Patron gönderiyi beğendi. Mesaj alındı.','💼','💀'],
      ['İK "kısa bir sohbet" için çağırdı. Masada kurabiye vardı. Kurabiyeli toplantı iyi değildir.','🍪','😨']
    ],
    hasar:['Hafta sonu: iptal','Mesai: +∞ saat','Kahve: damardan','Öğle arası: 7 dakika','LinkedIn: gizlice açık','"Odama gel" travması: kalıcı','Zam umudu: 2031\'e ertelendi'],
    teselli:['En kötü ihtimalle CV\'ni güncellersin. Zaten 2019\'dan beri bakmıyordun.','Patron da bir zamanlar senin gibiydi. Sonra patron oldu. Sonuç ortada.','Pazartesi yeni bir gün. Patron aynı ama.','İyi haber: bu bir tecrübe. Kötü haber: maaşa yansımıyor.'],
    stat: () => pick([{label:'Çıkış saati',value:'23.47',sub:'iyimser tahmin'},{label:'Okunmamış mail',value:rint(900,2400).toLocaleString('tr-TR'),sub:'hepsi "ACİL"'},{label:'"Odama gel" sayısı',value:`×${rint(3,9)}`,sub:'bugün'},{label:'Zam ihtimali',value:'%0,3',sub:'çok iyimser'}])
  },
  hoca: {
    f:[65,94],
    kehanet:[
      'Hoca kızmayacak. "Peki" deyip gözlüğünü çıkaracak. Bu daha kötü.',
      '"Bunu ChatGPT mi yazdı?" sorusu gelecek. Cevabın ne olursa olsun yandın.',
      'Ödevi yapmadığını hoca sınıfa girmeden bilecek. Hocalarda radar var, sende yok.',
      'Bu dönem not değil, ders alacaksın. Hayat dersi. Kredisi yok.',
      'Hoca bu olayı 20 yıl boyunca yeni öğrencilere ibret diye anlatacak. Efsane oldun.'
    ],
    s1:[
      ['Hoca sınıfa gülümseyerek girdi. Hocalar gülümsediğinde bir şeyler ters gider.','👨‍🏫','😅'],
      ['"Ödevleri alalım." Sıra yaklaşıyor. Beş kişi, üç kişi, bir kişi… POV: sıra sende.','📋','😰'],
      ['"Köpeğim yedi" bahanesini hazırladın. Köpeğin olmadığını hoca biliyor. Kedin de yok.','🐕','😬'],
      ['Grup ödevi. Grup 4 kişi. Çalışan 1 kişi. O da sen değilsin.','👥','😶'],
      ['Sınav kâğıdı önünde. İlk soruyu okudun. Beyin "404 bulunamadı" verdi.','📄','🫠']
    ],
    s2:[
      ['Hoca ödevi istemedi. Tahtada anlatmanı istedi. Sınıf patlamış mısırı çıkardı.','🍿','😱'],
      ['Hoca kâğıdına tek bir şey yazdı. Kırmızı kalemle. "?"','🖍️','😨'],
      ['Bahaneni anlattın. Hoca "Çok yaratıcı, bunu kompozisyon olarak getir" dedi. Artık iki ödevin var.','📝','🫠'],
      ['Ödevi yapay zekâya yazdırdın. Ödevin ilk cümlesi: "Tabii! İşte ödeviniz:"','🤖','💀'],
      ['Hoca "Bunu kim anlatmak ister?" dedi. Göz göze geldiniz. Kaçış yok, kilitlendin.','👁️','😱']
    ],
    s3:[
      ['Hoca seni sınıf başkanı yaptı. Herkesin ödevini toplamak artık senin işin. Ceza bu.','👑','😭'],
      ['Finalin ilk sorusu: "Geçen hafta yapmadığın ödevi şimdi yap."','📄','😵'],
      ['Hoca veliyle görüşmek istedi. Evdeki ikinci hoca devreye girdi.','☎️','🫥'],
      ['Not açıklandı: FF. Hoca altına not düşmüş: "Fena fena."','📉','😭'],
      ['Bütünlemeye kaldın. Tarih: tatilin ilk günü. Evren bu işi kişisel aldı.','📅','😵']
    ],
    hasar:['Ortalama: serbest düşüş','Teneffüs: iptal, ceza ödevi var','Sıra arkadaşı: seni tanımıyor','Ödev sayısı: ×2','Hocanın gözünde: "potansiyeli var ama…"','Tatil: bütünlemeye feda','Uyku: 3 saat, 2 kahve'],
    teselli:['İyi haber: ödev hâlâ yapılabilir. Kötü haber: senin yapman gerekiyor.','Bu da geçer. Tıpkı o ders gibi. (Geçmedi.)','Her büyük insanın yapılmamış bir ödevi vardır. Sen yine de yap.','Hocayla göz teması kurma. Bilimsel olarak işe yarıyor. (Yaramıyor.)'],
    stat: () => pick([{label:'Not',value:'FF',sub:'fena fena'},{label:'Ceza ödevi',value:`×${rint(2,5)}`,sub:'teslim: yarın 08.00'},{label:'Devamsızlık',value:`${rint(9,13)} gün`,sub:'bıçak sırtı'}])
  },
  anne: {
    f:[85,100],
    kehanet:[
      'Annen kızmayacak. "Tamam" diyecek. Türkçenin en tehlikeli kelimesi.',
      'Terlik fırlatılacak. Terlik yörüngeye girecek. NASA takipte.',
      'Annen bu olayı sen 40 yaşına gelene kadar her bayramda anlatacak.',
      'Annen "Babana söyleyeceğim" diyecek. Dava üst mahkemeye taşınıyor.',
      'Olay aile WhatsApp grubuna düşecek. Teyzeler sesli mesajla yorum yapacak.'
    ],
    s1:[
      ['Kapıdan girdin. Ev çok sessiz. Çay demlenmemiş. Kötü işaret.','👩','😬'],
      ['Annen tam adınla seslendi. Göbek adın dahil. O adı sen bile unutmuştun.','📢','😨'],
      ['Annen telefonu aldı: "Teyzeni arıyorum." Olay artık uluslararası.','📞','😰'],
      ['Annen "Bana söylemek istediğin bir şey var mı?" diye sordu. Bu bir tuzak. Cevap da tuzak.','🤨','😰'],
      ['POV: Annen elinde senin telefonunla salonda oturuyor. Ekran açık.','📱','💀']
    ],
    s2:[
      ['Annen terliğe uzandı. Ağır çekim. Arkada destansı müzik. Kaçış yolu yok.','🩴','😱'],
      ['"Ben senin yaşındayken…" başladı. Süre: 45 dakika. Reklamsız, atlanamaz.','🗣️','🫠'],
      ['Annen sessizce bulaşık yıkıyor ama tabakları biraz fazla sesli koyuyor. Her tabak bir mesaj.','🍽️','😨'],
      ['Annen "Sen bilirsin" dedi. Bu cümle hukuken bir tehdittir.','⚖️','😱'],
      ['Olay babana iletildi. Baban sadece "Hmm" dedi. Hmm\'ların en ağırı.','👨','😶']
    ],
    s3:[
      ['Terlik fırlatıldı. Fizik kuralları askıya alındı. Terlik köşeyi döndü ve seni buldu.','🩴','😵'],
      ['Ceza açıklandı: Wi-Fi şifresi değişti. Yeni şifre: odanitopla123.','📶','😭'],
      ['Olay aile grubuna düştü. 14 teyze, 3 dayı ve uzak bir kuzen "görüldü".','💬','🫥'],
      ['Annen en sevdiğin yemeği yaptı. Sana koymadı. Psikolojik harp başladı.','🍲','😭'],
      ['Annen artık senden "o" diye bahsediyor. Evde NPC oldun.','👤','🫥']
    ],
    hasar:['Harçlık: donduruldu','Wi-Fi: kısıtlandı','Akşam yemeği: sevmediğin yemek','Aile grubundaki itibar: yerlerde','Terlik: hâlâ havada','Tatlı hakkı: iptal','Annenin yanında aura: sıfır'],
    teselli:['Annen seni yine seviyor. Sadece şu an bunu terlikle ifade ediyor.','Bir çay demle, bulaşıkları yıka. Bilinen en etkili özür.','Bu akşam sofrada sessizlik olacak ama yarın börek de olacak.','Odanı topla. Wi-Fi şifresi orada bir yerde.'],
    stat: () => pick([{label:'Terlik hızı',value:`${rint(120,190)} km/s`,sub:'yeni rekor'},{label:'Söylenme süresi',value:`${rint(35,90)} dk`,sub:'reklamsız, atlanamaz'},{label:'Tam adınla çağrılma',value:`×${rint(3,7)}`,sub:'göbek adı dahil'}])
  },
  sevgili: {
    f:[72,97],
    kehanet:[
      '"Bir şey yok" diyecek. Bir şey var. Hem de sezonluk dizi kadar.',
      'Sevgilin kızmayacak. "Kendine iyi bak" yazıp son görülmeyi kapatacak.',
      'Bu olay 2031\'deki bir tartışmada yeniden gündeme gelecek. Not alındı.',
      'Sevgilin hikâyeye anlamlı bir şarkı atacak. Herkes kime olduğunu anlayacak.',
      'Bu olay ilişkinizin red flag listesine kalın harflerle eklenecek.'
    ],
    s1:[
      ['Mesajına "ok" geldi. İki harf, nokta yok. İçinde fırtına var.','📱','😬'],
      ['Mesajın 2 saattir "görüldü". Sen bu sürede 47 senaryo ve 3 özür taslağı yazdın.','👀','😰'],
      ['Sevgilin hikâye paylaştı: manzara ve "bazı insanlar…" yazısı. O bazı insan sensin.','📸','😨'],
      ['"Konuşmamız lazım" mesajı geldi. Şarjın da tam o an %3.','🔋','😰'],
      ['Sevgilin sana "aşkım" değil, adınla seslendi. Bu bir alarm.','🚨','😨']
    ],
    s2:[
      ['Soru geldi: "Ben neye kızdım sence?" Yanlış cevap: hepsi.','🤨','😱'],
      ['Ortak arkadaşlar taraf seçti. Senin tarafında sadece kedi var. O da kararsız.','🐈','🫠'],
      ['Özür diledin. "Neden özür diliyorsun?" diye soruldu. Sonsuz döngü başladı.','🌀','😵‍💫'],
      ['Sevgilin 2 yıl önceki bir mesajının ekran görüntüsünü buldu. Arşivi devletinkinden düzenli.','🗂️','💀'],
      ['"Sen bilirsin" dedi. Bilmiyorsun. Hiç bilmedin.','🤷','🫠']
    ],
    s3:[
      ['Barıştınız. Ama film seçme hakkı ömür boyu onda.','🎬','😭'],
      ['Olay en yakın arkadaşına anlatıldı. Arkadaşı sana öyle bir baktı ki… yandın.','👀','🫥'],
      ['Ceza: hafta sonu onun ailesiyle kahvaltı. Teyze "Ne iş yapıyorsun?" diye dört kez soracak.','🍳','😵'],
      ['"Yakın arkadaşlar" listesinden çıkarıldın. Resmen sürgündesin.','🟢','😭'],
      ['Telafi için sürpriz yaptın. Sürpriz o kadar kötüydü ki ikinci kriz çıktı.','🎁','💀']
    ],
    hasar:['Son görülme: kapatıldı','Film seçme hakkı: kalıcı olarak devredildi','Mesajlar: tek tik','Ortak arkadaşlar: tarafsız (değil)','Kalp: hasarlı ama onarılabilir','Yakın arkadaşlar: listeden çıkarıldın','"Haklısın" sayacı: 47'],
    teselli:['Çiçek al. Tatlı al. Bir tatlı daha al. Garantisi yok ama istatistikler umut verici.','"Haklısın" tek kelimelik bir mucizedir. Bol bol kullan.','Bu da geçer. Ama önce bir hafta "tamam"larla geçer.','Delulu olma, umutsuz da olma. Bir tatlı al, git.'],
    stat: () => pick([{label:'Son görülme',value:`${rint(2,6)} gün`,sub:'önce'},{label:'"Bir şey yok"',value:`×${rint(6,19)}`,sub:'bugün'},{label:'Kafada kurulan senaryo',value:`${rint(40,99)}`,sub:'son 2 saatte'}])
  },
  evsahibi: {
    f:[88,100],
    kehanet:[
      'Ev sahibi kirayı artırmayacak. Kirayı başka bir boyuta taşıyacak.',
      'Ev sahibi "Oğlum gelecek" diyecek. Ev sahibinin oğlu yok.',
      'Ev sahibi kira maxxing yapacak. Yeni kira mahallede ayakta alkışlanacak.',
      'Ev sahibi "Piyasa böyle" diyecek. Piyasa da kendisi.',
      'Yeni kirayı görünce "her şey 1000 TL" dediğimiz günleri özleyeceksin.'
    ],
    s1:[
      ['Telefon çaldı. Ekranda "Ev Sahibi". Kalp atışın enflasyonu geçti.','📞','😰'],
      ['Ev sahibi "Bir uğrayacağım" dedi. Neden bilinmiyor. Ama yanında hesap makinesi var.','🧮','😨'],
      ['Kapıda bir zarf var. Üstünde sadece "Yeni dönem" yazıyor. Korku filmi gibi.','✉️','😬'],
      ['WhatsApp: "Merhaba, müsaitseniz bir konuşalım 🙂" O gülen surat sahte.','🙂','😰']
    ],
    s2:[
      ['Ev sahibi evi geziyor: "Bu manzara, bu ışık…" Her iltifat yüzde on.','🧐','😱'],
      ['Yeni kira açıklandı. Komşunun kedisi bile duyup taşınmaya karar verdi.','💸','🙀'],
      ['Pazarlık denedin. Ev sahibi "Piyasa böyle" dedi ve piyasayı kendisi belirledi.','📈','🫠'],
      ['Ev sahibi "Kombiyi yeni yaptırdım" dedi. Kombi 2009 model ve öksürüyor.','🔥','😶']
    ],
    s3:[
      ['Yeni kira onaylandı. Maaşın kiraya, kira da ev sahibinin yazlığına gidiyor.','🏖️','😭'],
      ['Ev sahibi "Boya badana senden" dedi. Bir de kombi. Bir de… neyse.','🎨','😵'],
      ['Emlakçı ilanı çoktan hazırlamış: "Ferah, aydınlık, eski kiracısı ağlıyor."','🪧','🫥'],
      ['Kira öyle arttı ki artık eve değil, ev sahibinin hayallerine kira ödüyorsun.','💭','💀']
    ],
    hasar:['Maaş: kiraya transfer edildi','Market sepeti: sadece makarna','Taşınma kutuları: sepette','Emlak sitesi: 47 sekme açık','Hayaller: onlar da kirada','Depozito: geri gelmeyecek, kabullen'],
    teselli:['İyi tarafından bak: şu an bir evin var. (Ay sonuna kadar.)','Her şeyin bir çaresi vardır. Kira hariç.','Balkonda bir çay iç. O balkona ödediğin paraya değsin.','Tecrübe oldu. Kiraya yansıtıldı.'],
    stat: () => pick([{label:'Yeni kira',value:`+%${rint(150,400)}`,sub:'"piyasa böyle"'},{label:'Zam oranı',value:'EVET',sub:''},{label:'Depozito',value:`${rint(3,6)} kira`,sub:'peşin, bugün'}])
  },
  diger: {
    f:[60,95],
    kehanet:[
      'Kafanda kurduğun 47 senaryonun hiçbiri olmayacak. 48.\'si olacak.',
      'Korktuğun şey olmayacak. Çok daha yaratıcısı olacak.',
      'Evren bu durumu not aldı ve bir planı var. Planı beğenmeyeceksin.',
      'Sonuç: kaos. Ama estetik bir kaos. Reels\'lik.',
      'Delulu modunu kapat. Gerçek daha komik.'
    ],
    s1:[
      ['Her şey normal görünüyor. Fazla normal. Kuşlar bile sustu.','🐦','😶'],
      ['Kimse fark etmedi sandın. Herkes fark etti. Kediler bile.','🐈','😬'],
      ['Bir plan yaptın. Evren planını gördü ve ekran görüntüsü aldı.','🌌','😅'],
      ['Gece 3. Tavana bakıyorsun. Beyin 47. kez "acaba?" diye sordu.','🌙','🫠']
    ],
    s2:[
      ['İşler tam yoluna girecekken telefonun düştü. Ekran tarafı. Tabii ki.','📱','😱'],
      ['Yardım istedin. Yardım geldi, ama yanlış adrese.','🚚','🫠'],
      ['Her şeyi düzeltmeye çalıştın. Şimdi iki sorun var. Biri yeni, biri senin eserin.','🔧','😵‍💫'],
      ['Kendine "sakin ol şampiyon" dedin. Şampiyon sakinleşmedi.','🧘','😵']
    ],
    s3:[
      ['Son durum: olay mahallede efsane oldu. Çocuklar bile anlatıyor.','📣','😭'],
      ['Final: her şey yerine oturdu. Sen hariç. Sen köşede çay içiyorsun.','🫖','🫥'],
      ['Olay öyle büyüdü ki adını bir fırtınaya verdiler.','🌪️','😵'],
      ['Herkes "tecrübe oldu" dedi. Sen sadece "sıçtık" dedin. İkiniz de haklısınız.','🤝','💀']
    ],
    hasar:['Gurur: hafif çizik','B planı: yok. C planı: hiç olmadı','Uyku: 4 saat (iyimser)','Etraftakiler: patlamış mısır hazırlıyor','Şans: bakımda','Aura: -1000','Overthinking: maxxing'],
    teselli:['Bu da geçer. Çoğu şey geçer. Bazıları biraz yavaş.','Yarın buna gülüyor olacaksın. Belki yarından sonra.','En azından iyi bir hikâyen oldu. Anlatırken abart.','Bir dahaki "acaba?"yı kafanda kurma, buraya yaz.'],
    stat: () => pick([{label:'Kaos endeksi',value:`${rint(8,9)},${rint(1,9)}/10`,sub:''},{label:'Şans',value:'%0',sub:'bakımda'},{label:'Kurulan senaryo',value:`${rint(47,99)}`,sub:'hiçbiri bu değildi'}])
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

