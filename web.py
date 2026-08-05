"""
tools/toplanti/web.py
Toplantı Notları Tool'un core'a sunduğu TEK yüzey — AGENTS.md Madde 3 + 4.1
sözleşmesi.

Ses yükleme + transkripsiyon/konuşmacı-ayrımı işlemi core'un
`/api/analyze` sözleşmesine (senkron, sadece istek/klasor JSON body'si)
SIĞMIYOR — bir toplantı kaydı dakikalarca sürebilecek bir arka plan işi
gerektiriyor. Bu yüzden bu KISIM core'un hiç bilmediği kendi `router`'ında
yaşıyor (AGENTS.md Madde 4.1, Gmail'in OAuth deseniyle birebir aynı
mantık): yükle → arka planda işle → durum sorgula → sonucu al.

Kullanıcı transkripti gördükten SONRA (isterse konuşmacı adlarını
değiştirdikten sonra) "Not Oluştur"a basınca rapor üretimi başlar. Uzun
(1+ saat) toplantılarda transkript birden çok LLM çağrısıyla (map-reduce,
bkz. `_ozet_uret`) işlendiği için bu adım da dakikalarca sürebilir — bu
yüzden STT ile AYNI router+arka plan+poll deseni burada da kullanılıyor
(`/rapor/baslat`, `/rapor/durum`, `/rapor/sonuc`). core'un STANDART
`web_analyze` sözleşmesi (AGENTS.md Madde 3) hâlâ expose ediliyor ve
AYNI mantığı çalıştırıyor — sadece ilerleme raporlamadan, senkron olarak
(geriye dönük uyumluluk / sözleşme gereği); asıl kullanıcı akışı artık
`/rapor/*` üzerinden gidiyor. `web_execute`/`web_rollback` DEĞİŞMEDİ,
ikisi de aynı `_plan_store`'u kullanmaya devam ediyor.
"""

from __future__ import annotations
import functools
import html
import json
import threading
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from llm import complete as _core_llm_complete

from . import (
    is_baslat, is_durumu, is_sonucu,
    hf_token_kaydet, hf_token_bilgisi,
    SES_GECICI_DIR, _env_deger, _env_deger_yaz,
    stt_model_tercihi, stt_model_tercihi_kaydet,
    rapor_model_tercihi, rapor_model_tercihi_kaydet,
    konusmaci_ayrimi_tercihi, konusmaci_ayrimi_tercihi_kaydet,
)

_plan_store: dict[str, dict] = {}
_session_store: dict[str, dict] = {}

# ── Bu tool'un kendi route'ları — core bunların İÇİNDE ne olduğunu bilmez
# (AGENTS.md Madde 4.1). Ses yükleme/işleme akışı tamamen burada yaşıyor.
router = APIRouter()

DESTEKLENEN_UZANTILAR = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".opus"}


@router.post("/kayit/yukle")
async def _route_kayit_yukle(dosya: UploadFile = File(...)):
    """Canlı kayıttan çıkan ses blob'unu ya da kullanıcının yüklediği bir
    ses dosyasını alır, geçici olarak kaydeder, arka planda işlemeyi
    başlatır. Hemen bir iş id'si döner — UI bunu /kayit/durum ile poll
    eder (Gmail'in oauth/status deseniyle aynı yaklaşım)."""
    uzanti = Path(dosya.filename or "").suffix.lower() or ".webm"
    if uzanti not in DESTEKLENEN_UZANTILAR:
        uzanti = ".webm"  # MediaRecorder'dan gelen blob'larda dosya adı genelde yok

    hedef = SES_GECICI_DIR / f"{uuid.uuid4()}{uzanti}"
    icerik = await dosya.read()
    if not icerik:
        raise HTTPException(400, "Boş ses dosyası.")
    hedef.write_bytes(icerik)

    is_id = is_baslat(hedef)
    return {"is_id": is_id}


@router.get("/kayit/durum/{is_id}")
def _route_kayit_durum(is_id: str):
    return is_durumu(is_id)


@router.get("/kayit/sonuc/{is_id}")
def _route_kayit_sonuc(is_id: str):
    sonuc = is_sonucu(is_id)
    if sonuc is None:
        raise HTTPException(404, "Sonuç henüz hazır değil ya da iş bulunamadı.")
    return {"segmentler": sonuc}


@router.get("/settings/hf-token")
def _route_hf_token_bilgisi():
    return hf_token_bilgisi()


class HFTokenRequest(BaseModel):
    token: str


@router.post("/settings/hf-token")
def _route_hf_token_kaydet(req: HFTokenRequest):
    if not req.token.strip():
        raise HTTPException(400, "Token boş olamaz.")
    hf_token_kaydet(req.token)
    return {"basarili": True}


@router.get("/ayarlar/konusmaci-ayrimi")
def _route_konusmaci_ayrimi_getir():
    return {"acik": konusmaci_ayrimi_tercihi()}


class KonusmaciAyrimiRequest(BaseModel):
    acik: bool


@router.post("/ayarlar/konusmaci-ayrimi")
def _route_konusmaci_ayrimi_kaydet(req: KonusmaciAyrimiRequest):
    konusmaci_ayrimi_tercihi_kaydet(req.acik)
    return {"basarili": True}


# ── Model tercihi — core'un birleşik registry'sinden (models.json,
# /settings) STT (transkripsiyon) ve rapor üretimi için seçim. Toplantı
# kendi ayrı bir kayıt defteri TUTMUYOR (bkz. __init__.py'deki uzun
# gerekçe) — sadece hangi görev için hangi registry id'sinin seçili
# olduğunu (iki basit env değişkeni) hatırlıyor. TEK endpoint çifti,
# workflow diyagramının ihtiyaç duyduğu her şeyi (seçili değerler +
# görev bazında filtrelenmiş model listeleri) tek çağrıda döner.
@router.get("/model-tercihi")
def _route_model_tercihi():
    import llm as _core_llm
    tum_modeller = _core_llm.liste_modeller()
    ses_modelleri = [{"id": mid, **girdi} for mid, girdi in tum_modeller.items() if girdi.get("gorev") == "ses"]
    metin_modelleri = [{"id": mid, **girdi} for mid, girdi in tum_modeller.items() if girdi.get("gorev", "metin") == "metin"]
    return {
        "stt_secili": stt_model_tercihi(),
        "rapor_secili": rapor_model_tercihi(),
        "ses_modelleri": ses_modelleri,
        "metin_modelleri": metin_modelleri,
    }


class ModelTercihiRequest(BaseModel):
    stt: str | None = None
    rapor: str | None = None


@router.post("/model-tercihi")
def _route_model_tercihi_kaydet(req: ModelTercihiRequest):
    if req.stt is not None:
        stt_model_tercihi_kaydet(req.stt)
    if req.rapor is not None:
        rapor_model_tercihi_kaydet(req.rapor)
    return {"basarili": True}


# ── LLM özet üretimi — transkript hazır olduktan SONRA, kullanıcı "Not
# Oluştur"a bastığında devreye giriyor ───────────────────────────────────

def _json_ayikla(ham: str) -> str:
    """LLM'in JSON etrafına eklediği markdown kod bloğunu/açıklama
    metnini temizler (Gmail tool'undaki aynı yardımcının bir kopyası —
    AGENTS.md Madde 3: paylaşılan mantık repo'lar arası merkezi bir
    pakete taşınmaz, her tool kendi kopyasını tutar)."""
    ham = ham.strip()
    if ham.startswith("```"):
        ham = ham.split("```")[1]
        if ham.startswith("json"):
            ham = ham[4:]
    ilk = ham.find("{")
    son = ham.rfind("}")
    if ilk != -1 and son != -1:
        ham = ham[ilk:son + 1]
    return ham.strip()


# ── Map-Reduce özet üretimi ────────────────────────────────────────────
# Eski sürüm transkripti `transkript[:8000]` ile KARAKTER bazında
# kesiyordu — uzun (1+ saat) bir toplantıda bu, transkriptin sadece ilk
# birkaç dakikasının LLM'e gitmesi, geri kalanının tamamen görmezden
# gelinmesi anlamına geliyordu (gerçek bir kullanımda fark edildi).
# Bunun yerine transkript konuşmacı-dönüşü sınırlarında kelime bazlı
# parçalara (chunk) bölünüyor, her parça ayrı ayrı özetleniyor (map),
# sonra tüm parça özetleri TEK bir final sentezde birleştiriliyor
# (reduce) — böylece toplantının tamamı modele gösterilmiş oluyor.
#
# Tek model kullanılıyor (core'un paylaşılan `llm_complete`'i, ör.
# qwen3:8b) — hem map hem reduce için. Daha güçlü ayrı bir "reduce"
# modeli (ör. büyük bir reasoning modeli) bu donanımda (GPU yok, CPU'da
# whisper bile yavaş) gerçekçi değil; ikinci ağır bir modeli lokal
# indirip CPU'da çalıştırmak whisper'da yaşanan "saatlerce sürme"
# sorununu bu adımda tekrar yaratırdı.
_CHUNK_KELIME_LIMITI = int(_env_deger("TOPLANTI_CHUNK_KELIME") or 2500)
_CHUNK_ORTAK_SATIR = 3


def _transkripti_boluml(transkript: str) -> list[str]:
    """Transkripti (her satır "Konuşmacı X: metin" formatında) kelime
    bazlı, konuşmacı-dönüşü sınırında kesen parçalara böler. Bir sonraki
    parça, önceki parçanın son birkaç satırını (bağlam sürekliliği için)
    tekrar içerir — chunk sınırında yarım kalan bir konunun her iki
    parçada da bir miktar bağlamı olsun diye."""
    satirlar = [s for s in transkript.split("\n") if s.strip()]
    if not satirlar:
        return []

    parcalar: list[str] = []
    mevcut: list[str] = []
    mevcut_kelime = 0
    for satir in satirlar:
        satir_kelime = len(satir.split())
        if mevcut and mevcut_kelime + satir_kelime > _CHUNK_KELIME_LIMITI:
            parcalar.append("\n".join(mevcut))
            mevcut = mevcut[-_CHUNK_ORTAK_SATIR:]
            mevcut_kelime = sum(len(s.split()) for s in mevcut)
        mevcut.append(satir)
        mevcut_kelime += satir_kelime
    if mevcut:
        parcalar.append("\n".join(mevcut))
    return parcalar


def _rate_limited(hata: Exception) -> bool:
    """core/llm.py'nin RateLimitError sınıfını import etmeden (repo
    bağımsızlığı için, bkz. AGENTS.md Madde 1) rate limit hatasını
    tanır — Gmail tool'undaki aynı yardımcının bir kopyası (AGENTS.md
    Madde 3: paylaşılan mantık repo'lar arası merkezi bir pakete
    taşınmaz, her tool kendi kopyasını tutar)."""
    return type(hata).__name__ == "RateLimitError" or "rate limit" in str(hata).lower()


def _with_retry(fn, max_deneme: int = 3, ilk_gecikme: float = 5.0):
    """Rate limit (429) hatasında bekleyip yeniden dener — DAHA FAZLA
    istek atmak yerine (bu, rate limit'i daha da kötüleştirirdi). Rate
    limit dışındaki hatalarda hemen fırlatır, hiç beklemez. Map-reduce
    kısa sürede birden çok ardışık istek attığı için (her bölüm + reduce)
    ücretsiz katman limitlerine (ör. Groq) Gmail'den bile daha kolay
    çarpıyor — bu yüzden max_deneme/ilk_gecikme biraz daha yüksek."""
    gecikme = ilk_gecikme
    for deneme in range(max_deneme + 1):
        try:
            return fn()
        except Exception as e:
            if _rate_limited(e) and deneme < max_deneme:
                print(f"[UYARI] Toplantı: rate limit — {gecikme:.0f}sn bekleyip "
                      f"tekrar denenecek (deneme {deneme + 1}/{max_deneme})...")
                time.sleep(gecikme)
                gecikme *= 2
                continue
            raise


_YEREL_YEDEK_MODEL = "qwen3-local"  # core registry'sindeki sabit kayıt — bkz. models.json


def _llm_dene_yerel_yedekli(llm_complete, prompt: str) -> str:
    """`_with_retry` ile bulut modelini dener; TÜM denemeler rate limit'e
    takılırsa (günlük kota tükenmiş olabilir, saniyeler içindeki yeniden
    deneme bunu çözmez) ham/işlenmemiş metni reduce'a göndermek yerine
    OTOMATİK olarak yerel modelle (rate limit'i olmayan) dener.

    Neden bu gerekiyor: gerçek kullanımda (uzun, çok bölümlü bir toplantı)
    TÜM bölümler rate limit'e takılınca eski davranış her bölümün HAM
    metnini reduce'a gönderiyordu — reduce, binlerce kelimelik ham metin
    yığınıyla karşılaşınca gerçek içeriği analiz etmek yerine şemanın
    kendi örnek alanlarını taklit ederek halüsinasyon görüyordu ("Ali Can",
    "2023-12-15" gibi tamamen uydurma isimler/tarihler — gerçek kullanıcı
    şikayetiyle doğrulandı). Her adımın MUTLAKA yapılandırılmış, kısa bir
    sonuç üretmesi bu sorunu kökten çözüyor — hangi nihai model kullanılırsa
    kullanılsın (bulut ya da yerel), reduce hep temiz girdi görüyor."""
    try:
        return _with_retry(lambda: llm_complete(prompt, json_mode=True))
    except Exception as e:
        if not _rate_limited(e):
            raise
        print("[UYARI] Bulut modeli rate limit'e takıldı (tüm denemeler tükendi) "
              "— yerel modelle deneniyor...")
        return _core_llm_complete(prompt, json_mode=True, model_override=_YEREL_YEDEK_MODEL)


def _rapor_hata_mesaji(hata: Exception) -> str:
    """Rapor üretimi (reduce ya da zengin HTML içeriği) tüm yeniden
    denemelere rağmen başarısız olursa kullanıcıya NE OLDUĞUNU ve NE
    YAPABİLECEĞİNİ açıkça söyler — sessizce genel bir 'üretilemedi'
    mesajıyla geçiştirmek yerine (kullanıcı isteği: rate limit'e
    takılınca ya yerele geçmesi ya da sonra tekrar denemesi gerektiği
    NET şekilde bildirilsin)."""
    if _rate_limited(hata):
        return (
            "⚠ Rapor modeli (bulut) rate limit'e takıldı, birkaç deneme sonra "
            "yine başarısız oldu. Workflow diyagramından \"Rapor Oluştur\" "
            "düğümüne tıklayıp modeli \"Yerel\"e çevirip \"🔄 Yeniden Oluştur\"a "
            "basabilir, ya da birkaç dakika bekleyip aynı bulut modeliyle "
            "tekrar deneyebilirsiniz."
        )
    return "(Otomatik özet üretilemedi — aşağıda ham transkript yer alıyor.)"


_MAP_PROMPT_SABLONU = """Aşağıda bir görüşme transkriptinin BİR BÖLÜMÜ var (tüm görüşme değil,
bu yüzden genel bir özet çıkarma — sadece bu bölümde geçenleri çıkar).

SADECE şu JSON formatında cevap ver:
{{"kararlar": ["bu bölümde alınan kararlar"],
  "aksiyonlar": ["bu bölümde geçen aksiyon maddeleri, varsa sorumlu+tarih ile"],
  "belirsiz_noktalar": ["net olmayan, çelişkili ya da yarım kalan konular"],
  "konu_disi": ["gündem/konuyla ilgisiz kısa sohbet, ana konuyla ilgisizse"]}}

Transkriptte olmayan bir bilgi uydurma. Bu bölümde bir kategoriye giren
hiçbir şey yoksa o alanı boş liste bırak.

Transkript bölümü:
{chunk}"""

_REDUCE_PROMPT_SABLONU = """Aşağıda bir görüşmenin farklı bölümlerinden çıkarılmış ara-bulgular var
(her biri ayrı ayrı işlendi, aralarında tekrar/çelişki olabilir — kronolojik
olarak SONRAKİ bilgiyi esas al). Bunları birleştirip TEK bir nihai rapor
üret.

Ara bulgular:
{ara_bulgular}

SADECE şu JSON formatında cevap ver:
{{"tur": "toplanti" ya da "genel" (görüşme bir toplantı/süreç görüşmesiyse
    "toplanti", bire-bir/müşteri görüşmesi/danışma gibi başka bir türse "genel"),
  "ozet": "1-2 paragraf genel özet, yorum katma",
  "gundem_maddeleri": ["görüşmede geçen ana konu başlıkları"],
  "alinan_kararlar": ["tekilleştirilmiş, çelişkiler çözülmüş karar listesi"],
  "aksiyon_maddeleri": ["kim ne yapacak şeklinde, sorumlu+tarih varsa belirt; yoksa 'atanmamış'"],
  "pdca": {{"plan": [...], "do": [...], "check": [...], "act": [...]}} ya da null
    (SADECE "tur":"toplanti" ise ve görüşmede bu 4 aşamaya karşılık gelen
    somut maddeler varsa doldur — yoksa ya da "tur":"genel" ise null dön,
    ZORLAMA),
  "belirsiz_noktalar": ["ara bulgulardaki belirsiz/çelişkili noktalardan
    hâlâ çözülmemiş olanlar"],
  "filtrelenen_konu_disi": ["ana konuyla ilgisiz, rapora girmeyen kısa
    içerik özeti, tek satır liste"]}}
{talimat_blok}
Türkçe yaz. Ara bulgularda olmayan bir bilgi uydurma."""

# ── Stilize HTML rapor için AYRI, odaklı bir ikinci çağrı — DENENDİ:
# bu 3 alanı (konular/aksiyon_tablosu/genel_degerlendirme) yukarıdaki
# _REDUCE_PROMPT_SABLONU'na eklemek (tek çağrıda 11 alan) gerçek
# kullanımda TUTARSIZ sonuç verdi — model bazen bu "kuyruktaki" alanları
# boş bırakıyordu (JSON GEÇERLİYDİ, sadece alanlar eksikti — finish_reason
# "stop", token limiti değil, model kendi kararıyla atlıyor). Küçük,
# TEK AMAÇLI bir prompt ile ayrı bir çağırma çok daha güvenilir çıktı —
# modelin TÜM dikkati/bütçesi bu 3 alana ayrılıyor.
_ZENGIN_ICERIK_PROMPT_SABLONU = """Aşağıda bir görüşmenin ara bulguları ve bu bulgulardan
çıkarılmış gündem maddeleri var. Bunları kullanarak, HER gündem maddesi
için ayrı, detaylı bir anlatı bölümü ve yapılandırılmış bir aksiyon
tablosu üret.

Ara bulgular:
{ara_bulgular}

Gündem maddeleri: {gundem_maddeleri}
Aksiyon maddeleri: {aksiyon_maddeleri}

SADECE şu JSON formatında cevap ver:
{{"konular": [{{"baslik": "gündem maddelerinden biri (aynı ifadeyle)",
      "icerik": "bu konuyla ilgili 1-3 paragraf, ne konuşuldu/ne netleşti/ne belirsiz kaldı — anlatı tarzında, madde işareti kullanma",
      "callout": "bu konudaki TEK en önemli/kritik gerçek ya da karar (yoksa null)",
      "onem": "kritik" ya da "uyari" ya da "normal"}}, ...]
    (gündem maddelerindeki HER başlık için bir girdi, atlamadan),
  "aksiyon_tablosu": [{{"aksiyon": "yapılacak iş", "sorumlu": "kişi/ekip adı, yoksa 'Atanmamış'",
      "termin": "tarih/süre belirtilmişse onu yaz, yoksa 'Açık'",
      "oncelik": "yuksek" ya da "orta" ya da "dusuk"}}, ...]
    (aksiyon maddelerindeki HER girdi için bir satır, atlamadan),
  "genel_degerlendirme": "1 paragraf — görüşmenin bütününe dair sentez/yorum,
    varsa tekrarlayan bir örüntü ya da kök sorun tespiti"}}
Türkçe yaz. Ara bulgularda olmayan bir bilgi uydurma. Üç alanın hepsini doldur."""


def _zengin_icerik_uret(bulgular: list[str], ozet: dict, llm_complete) -> dict:
    """Stilize HTML rapor için 'konular'/'aksiyon_tablosu'/'genel_degerlendirme'
    — ana `_reduce_asamasi` başarısız olsa bile HTML boş bölümlerle
    (bkz. `_rapor_html_olustur`'un placeholder'ları) zarifçe düşer, bu
    yüzden burada da aynı savunmacı `except` deseni kullanılıyor."""
    prompt = _ZENGIN_ICERIK_PROMPT_SABLONU.format(
        ara_bulgular="\n".join(bulgular),
        gundem_maddeleri=", ".join(ozet.get("gundem_maddeleri", [])),
        aksiyon_maddeleri=", ".join(ozet.get("aksiyon_maddeleri", [])),
    )
    try:
        raw = _llm_dene_yerel_yedekli(llm_complete, prompt)
        a = json.loads(_json_ayikla(raw))
        return {
            "konular": a.get("konular", []),
            "aksiyon_tablosu": a.get("aksiyon_tablosu", []),
            "genel_degerlendirme": a.get("genel_degerlendirme", ""),
        }
    except Exception as e:
        print(f"[UYARI] Zengin HTML içeriği üretilemedi ({e}) — HTML rapor sade bölümlerle üretilecek.")
        return {"konular": [], "aksiyon_tablosu": [], "genel_degerlendirme": _rapor_hata_mesaji(e)}


def _map_asamasi(parcalar: list[str], llm_complete, ilerleme_fn, toplam_adim: int) -> list[str]:
    """Her transkript parçasını ayrı ayrı işler. `_llm_dene_yerel_yedekli`
    sayesinde bulut rate limit'e takılsa bile bölüm YİNE de yapılandırılmış
    bir sonuçla döner (yerel modele düşerek) — ham metin fallback'i artık
    sadece GERÇEKTEN bozuk JSON gibi rate-limit-dışı, nadir durumlar için."""
    bulgular = []
    for i, parca in enumerate(parcalar):
        ilerleme_fn(f"bolum_{i + 1}_isleniyor", (i / toplam_adim) * 100)
        prompt = _MAP_PROMPT_SABLONU.format(chunk=parca)
        ham = None
        try:
            ham = _llm_dene_yerel_yedekli(llm_complete, prompt)
            ayiklanmis = json.loads(_json_ayikla(ham))
            bulgular.append(
                f"[Bölüm {i + 1}] "
                f"Kararlar: {ayiklanmis.get('kararlar', [])} | "
                f"Aksiyonlar: {ayiklanmis.get('aksiyonlar', [])} | "
                f"Belirsiz: {ayiklanmis.get('belirsiz_noktalar', [])} | "
                f"Konu dışı: {ayiklanmis.get('konu_disi', [])}"
            )
        except Exception as e:
            print(f"[UYARI] Bölüm {i + 1} JSON olarak ayrıştırılamadı ({e}), ham metin kullanılıyor.")
            bulgular.append(f"[Bölüm {i + 1}] {ham or '(bu bölüm işlenemedi)'}")
        ilerleme_fn(f"bolum_{i + 1}_tamam", ((i + 1) / toplam_adim) * 100)
    return bulgular


def _reduce_asamasi(bulgular: list[str], kullanici_talimati: str, llm_complete, ilerleme_fn) -> dict:
    ilerleme_fn("nihai_rapor_hazirlaniyor", 90)
    talimat_blok = (
        f'\nKULLANICI ÖZEL TALEBİ (şemayı bozmadan bu isteği dikkate al):\n"""\n{kullanici_talimati}\n"""\n'
        "Not: Yukarıdaki özel talep şemadaki alanları DEĞİŞTİRMEZ, sadece "
        "içerik önceliklendirmesini/vurgusunu etkiler. Şema sabit kalır.\n"
        if kullanici_talimati else ""
    )
    prompt = _REDUCE_PROMPT_SABLONU.format(
        ara_bulgular="\n".join(bulgular), talimat_blok=talimat_blok,
    )
    try:
        raw = _llm_dene_yerel_yedekli(llm_complete, prompt)
        a = json.loads(_json_ayikla(raw))
        return {
            "tur": a.get("tur", "genel"),
            "ozet": a.get("ozet", ""),
            "gundem_maddeleri": a.get("gundem_maddeleri", []),
            "alinan_kararlar": a.get("alinan_kararlar", []),
            "aksiyon_maddeleri": a.get("aksiyon_maddeleri", []),
            "pdca": a.get("pdca"),
            "belirsiz_noktalar": a.get("belirsiz_noktalar", []),
            "filtrelenen_konu_disi": a.get("filtrelenen_konu_disi", []),
        }
    except Exception as e:
        print(f"[UYARI] Final rapor JSON olarak ayrıştırılamadı: {e}")
        return {
            "tur": "genel",
            "ozet": _rapor_hata_mesaji(e),
            "gundem_maddeleri": [], "alinan_kararlar": [], "aksiyon_maddeleri": [],
            "pdca": None, "belirsiz_noktalar": [], "filtrelenen_konu_disi": [],
        }


def _ozet_uret(transkript: str, kullanici_talimati: str, llm_complete, ilerleme_fn=None) -> dict:
    """Transkripti map-reduce ile işler: tek parçaya sığıyorsa (kısa
    görüşme) doğrudan reduce'a gider (gereksiz ekstra LLM çağrısı
    yapılmaz); sığmıyorsa önce map (her parça ayrı özetlenir) sonra
    reduce (parça özetleri tek nihai rapora birleştirilir).

    `ilerleme_fn(asama: str, yuzde: float)` opsiyonel — her map adımı ve
    reduce fazı ilerledikçe çağrılır (STT tarafındaki `is_baslat`'in
    `_ilerleme` deseniyle aynı yaklaşım). Verilmezse (ör. eski senkron
    `web_analyze` çağrısı) ilerleme sessizce yok sayılır."""
    if ilerleme_fn is None:
        ilerleme_fn = lambda asama, yuzde: None

    parcalar = _transkripti_boluml(transkript)
    if not parcalar:
        bulgular = []
    elif len(parcalar) == 1:
        bulgular = [f"[Tam transkript]\n{parcalar[0]}"]
    else:
        # +1: reduce adımı da toplam adım sayısına dahil, map yüzdesi
        # 0-90 aralığına sıkışsın diye (reduce zaten kendi 90->100'ünü
        # ayrıca raporluyor).
        bulgular = _map_asamasi(parcalar, llm_complete, ilerleme_fn, len(parcalar) + 1)

    ozet = _reduce_asamasi(bulgular, kullanici_talimati, llm_complete, ilerleme_fn)
    # Stilize HTML rapor için ayrı, odaklı bir ikinci çağrı — bkz.
    # _zengin_icerik_uret'in docstring'i (tek çağrıda 11 alan istemek
    # tutarsız sonuç veriyordu, ayırınca güvenilir oldu).
    ozet.update(_zengin_icerik_uret(bulgular, ozet, llm_complete))
    return ozet


def _rapor_govde_olustur(ozet: dict) -> str:
    """Rapor bölümlerinin (transkript HARİÇ) markdown'ı — kullanıcının
    elle düzenleyebileceği kısım tam olarak bu (bkz. `/rapor/duzenle`).
    Transkript ayrı tutuluyor çünkü UI'da zaten kendi sekmesinde
    gösteriliyor ve çok uzun olabiliyor, düzenleme kutusuna taşınmasının
    bir anlamı yok."""
    def _liste(baslik: str, ogeler: list[str]) -> str:
        if not ogeler:
            return f"## {baslik}\n\n(yok)\n\n"
        madde_metni = "\n".join(f"- {o}" for o in ogeler)
        return f"## {baslik}\n\n{madde_metni}\n\n"

    pdca_blok = ""
    if ozet.get("pdca"):
        p = ozet["pdca"]
        pdca_blok = (
            "## PDCA\n\n"
            + _liste("Plan", p.get("plan", []))
            + _liste("Do", p.get("do", []))
            + _liste("Check", p.get("check", []))
            + _liste("Act", p.get("act", []))
        )

    return (
        f"# Toplantı Notu\n\n"
        f"## Özet\n\n{ozet['ozet']}\n\n"
        + _liste("Gündem Maddeleri", ozet["gundem_maddeleri"])
        + _liste("Alınan Kararlar", ozet["alinan_kararlar"])
        + _liste("Aksiyon Maddeleri", ozet["aksiyon_maddeleri"])
        + pdca_blok
        + _liste("Belirsiz Noktalar", ozet.get("belirsiz_noktalar", []))
        + _liste("Filtrelenen Konu Dışı İçerik", ozet.get("filtrelenen_konu_disi", []))
    )


def _not_icerigi_olustur(transkript: str, ozet: dict) -> str:
    return _rapor_govde_olustur(ozet) + f"## Tam Transkript\n\n{transkript}\n"


# ── Stilize HTML rapor — kullanıcının paylaştığı örnek tasarıma (Georgia/
# Arial tipografi, kırmızı vurgu, callout/tag/tablo stilleri) dayanıyor.
# .md'nin YERİNE değil, ONA EK olarak üretiliyor (kullanıcı tercihi) —
# `_rapor_govde_olustur`'un ürettiği sade Özet/Gündem/Kararlar listesinden
# FARKLI olarak, "konular"/"aksiyon_tablosu"/"genel_degerlendirme"
# alanlarından (bkz. _REDUCE_PROMPT_SABLONU) beslenen, konu-bazlı zengin
# bir anlatı üretir. CSS bloğu statik — örnek dosyadan neredeyse aynen.
_RAPOR_HTML_CSS = """
  :root{
    --ink:#1a1a1a; --sub:#5a5a5a; --line:#d8d8d8;
    --accent:#8b1a1a; --accent-soft:#f5e9e9; --bg-alt:#f7f7f5;
    --ok:#2e6b3e; --warn:#a6650a; --crit:#8b1a1a;
  }
  *{box-sizing:border-box;}
  body{
    font-family: Georgia, 'Times New Roman', serif; color:var(--ink);
    max-width:900px; margin:0 auto; padding:40px 32px 80px;
    line-height:1.55; font-size:15px; background:#fff;
  }
  h1,h2,h3{ font-family: Arial, Helvetica, sans-serif; font-weight:700; letter-spacing:-0.01em; }
  header{ border-bottom:3px solid var(--ink); padding-bottom:18px; margin-bottom:28px; }
  header h1{ font-size:26px; margin:0 0 6px; }
  header .meta{
    font-family: Arial, Helvetica, sans-serif; font-size:13px; color:var(--sub);
    display:flex; flex-wrap:wrap; gap:4px 22px;
  }
  h2{
    font-size:16px; text-transform:uppercase; letter-spacing:0.04em; color:var(--accent);
    border-bottom:1px solid var(--line); padding-bottom:6px; margin-top:38px; margin-bottom:14px;
  }
  h3{ font-size:14.5px; margin:20px 0 8px; color:var(--ink); }
  p{margin:8px 0;}
  ul, ol{margin:8px 0; padding-left:22px;}
  li{margin-bottom:4px;}
  table{
    width:100%; border-collapse:collapse; font-family: Arial, Helvetica, sans-serif;
    font-size:13px; margin:12px 0 20px;
  }
  th, td{ border:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top; }
  th{
    background:var(--ink); color:#fff; font-weight:600; font-size:12px;
    text-transform:uppercase; letter-spacing:0.03em;
  }
  tr:nth-child(even) td{ background:var(--bg-alt); }
  .tag{
    display:inline-block; font-family: Arial, Helvetica, sans-serif; font-size:11px;
    font-weight:700; padding:2px 8px; border-radius:3px; text-transform:uppercase; letter-spacing:0.03em;
  }
  .tag-crit{ background:#fbe4e4; color:var(--crit); }
  .tag-warn{ background:#fbeecf; color:var(--warn); }
  .tag-ok{ background:#e3f0e6; color:var(--ok); }
  .tag-open{ background:#eee; color:#444; }
  .callout{
    background:var(--bg-alt); border-left:4px solid var(--accent);
    padding:12px 16px; margin:14px 0; font-size:14px;
  }
  .callout strong{ color:var(--accent); }
  footer{
    margin-top:50px; padding-top:14px; border-top:1px solid var(--line);
    font-family: Arial, Helvetica, sans-serif; font-size:11px; color:var(--sub);
  }
  .print-btn{
    position:fixed; top:20px; right:20px; font-family: Arial, Helvetica, sans-serif;
    background:var(--ink); color:#fff; border:none; padding:10px 18px; border-radius:5px;
    font-size:13px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);
  }
  .print-btn:hover{ background:var(--accent); }
  @media print{
    .print-btn{ display:none; }
    body{ padding:0 10mm; font-size:12.5px; }
    header{ margin-bottom:18px; }
    h2{ margin-top:22px; page-break-after:avoid; }
    table, .callout{ page-break-inside:avoid; }
  }
"""


def _esc(deger) -> str:
    return html.escape(str(deger or ""), quote=True)


def _paragraflar_html(metin: str) -> str:
    parcalar = [p.strip() for p in (metin or "").split("\n") if p.strip()]
    return "\n".join(f"<p>{_esc(p)}</p>" for p in parcalar) or "<p>(içerik yok)</p>"


def _onem_etiket_html(onem: str | None) -> str:
    if onem == "kritik":
        return '<span class="tag tag-crit">Kritik</span>'
    if onem == "uyari":
        return '<span class="tag tag-warn">Uyarı</span>'
    return ""


def _oncelik_etiket_html(oncelik: str | None) -> str:
    etiketler = {
        "yuksek": '<span class="tag tag-crit">Yüksek</span>',
        "orta": '<span class="tag tag-warn">Orta</span>',
        "dusuk": '<span class="tag tag-ok">Düşük</span>',
    }
    return etiketler.get(oncelik, '<span class="tag tag-open">Belirsiz</span>')


def _rapor_html_olustur(ozet: dict, taban_ad: str) -> str:
    from datetime import datetime
    tarih = datetime.now().strftime("%d.%m.%Y")

    gundem_html = "".join(f"<li>{_esc(g)}</li>" for g in ozet.get("gundem_maddeleri", [])) or "<li>(yok)</li>"

    konular_html = ""
    for i, konu in enumerate(ozet.get("konular", []), start=1):
        callout_html = ""
        if konu.get("callout"):
            callout_html = f'<div class="callout"><strong>Önemli:</strong> {_esc(konu["callout"])}</div>'
        konular_html += (
            f'<h3>2.{i} {_esc(konu.get("baslik", ""))} {_onem_etiket_html(konu.get("onem"))}</h3>'
            f'{_paragraflar_html(konu.get("icerik", ""))}'
            f'{callout_html}'
        )
    if not konular_html:
        konular_html = "<p>(konu detayı üretilemedi)</p>"

    satirlar = []
    for a in ozet.get("aksiyon_tablosu", []):
        satirlar.append(
            f'<tr><td>{_esc(a.get("aksiyon"))}</td><td>{_esc(a.get("sorumlu") or "Atanmamış")}</td>'
            f'<td>{_esc(a.get("termin") or "Açık")}</td><td>{_oncelik_etiket_html(a.get("oncelik"))}</td></tr>'
        )
    aksiyon_tablosu_html = "".join(satirlar) or '<tr><td colspan="4">(yok)</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Toplantı Raporu — {_esc(tarih)}</title>
<style>{_RAPOR_HTML_CSS}</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">Yazdır / PDF Al</button>

<header>
  <h1>Toplantı Raporu</h1>
  <div class="meta">
    <span><strong>Tarih:</strong> {_esc(tarih)}</span>
    <span><strong>Referans:</strong> {_esc(taban_ad)}</span>
  </div>
</header>

<h2>1. Gündem Başlıkları</h2>
<ol>{gundem_html}</ol>

<h2>2. Görüşülen Konular</h2>
{konular_html}

<h2>3. Kararlar ve Aksiyonlar</h2>
<table>
  <tr><th>Aksiyon</th><th>Sorumlu</th><th>Termin</th><th>Öncelik</th></tr>
  {aksiyon_tablosu_html}
</table>

<h2>4. Genel Değerlendirme</h2>
<p>{_esc(ozet.get("genel_degerlendirme") or ozet.get("ozet", ""))}</p>

<footer>
  Bu rapor toplantı transkriptinden otomatik olarak (Aktapokus Toplantı Notları) derlenmiştir.
  Konuşma dökümü otomatik transkripsiyon kaynaklıdır; bazı isim/sayı geçişlerinde belirsizlik olabilir.
</footer>

</body>
</html>
"""


def _rapor_pdf_olustur(icerik_html: str) -> bytes:
    """Stilize HTML raporu, HİÇBİR ek şablon mantığı olmadan aynen PDF'e
    çevirir — weasyprint zaten `_rapor_html_olustur`'un ürettiği CSS'i
    (tablo/callout/@media print) doğru render ediyor, tek kaynak (HTML)
    iki formatta (ekran + PDF) tutarlı kalıyor. Lazy import: weasyprint
    ağır bir bağımlılık, sadece gerçekten kaydedilirken yükleniyor."""
    from weasyprint import HTML
    return HTML(string=icerik_html).write_pdf()


def _rapor_excel_olustur(ozet: dict, taban_ad: str) -> bytes:
    """'Kararlar ve Aksiyonlar' tablosunu gerçek, filtrelenebilir bir
    Excel tablosu olarak üretir — kullanıcı isteği, en değerli kısmın bu
    olduğunu belirtti. Lazy import: openpyxl sadece kaydederken yüklenir."""
    import io
    from datetime import datetime
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

    kalin = Font(bold=True)
    baslik_dolgu = PatternFill(start_color="1A1A1A", end_color="1A1A1A", fill_type="solid")
    baslik_yazi = Font(bold=True, color="FFFFFF")
    sarma = Alignment(wrap_text=True, vertical="top")

    wb = Workbook()

    ws1 = wb.active
    ws1.title = "Özet"
    ws1["A1"] = "Toplantı Raporu"
    ws1["A1"].font = Font(bold=True, size=14)
    ws1["A2"] = "Tarih:"
    ws1["B2"] = datetime.now().strftime("%d.%m.%Y")
    ws1["A3"] = "Referans:"
    ws1["B3"] = taban_ad
    ws1["A5"] = "Özet"
    ws1["A5"].font = kalin
    ws1["A6"] = ozet.get("ozet", "")
    ws1["A6"].alignment = sarma
    ws1.merge_cells("A6:D6")
    ws1["A8"] = "Gündem Maddeleri"
    ws1["A8"].font = kalin
    for i, g in enumerate(ozet.get("gundem_maddeleri", []), start=9):
        ws1[f"A{i}"] = f"- {g}"
    ws1.column_dimensions["A"].width = 40
    for col in ("B", "C", "D"):
        ws1.column_dimensions[col].width = 25

    ws2 = wb.create_sheet("Kararlar ve Aksiyonlar")
    basliklar = ["Aksiyon", "Sorumlu", "Termin", "Öncelik"]
    for col, baslik in enumerate(basliklar, start=1):
        hucre = ws2.cell(row=1, column=col, value=baslik)
        hucre.font = baslik_yazi
        hucre.fill = baslik_dolgu
    satir = 2
    for a in ozet.get("aksiyon_tablosu", []):
        ws2.cell(row=satir, column=1, value=a.get("aksiyon", "")).alignment = sarma
        ws2.cell(row=satir, column=2, value=a.get("sorumlu") or "Atanmamış")
        ws2.cell(row=satir, column=3, value=a.get("termin") or "Açık")
        ws2.cell(row=satir, column=4, value=a.get("oncelik", ""))
        satir += 1
    if satir == 2:
        ws2.cell(row=2, column=1, value="(yok)")
        satir = 3

    satir += 1
    ws2.cell(row=satir, column=1, value="Alınan Kararlar").font = kalin
    satir += 1
    for k in ozet.get("alinan_kararlar", []):
        ws2.cell(row=satir, column=1, value=f"- {k}")
        satir += 1

    ws2.column_dimensions["A"].width = 45
    ws2.column_dimensions["B"].width = 20
    ws2.column_dimensions["C"].width = 18
    ws2.column_dimensions["D"].width = 14

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _benzersiz_dosya_yolu(klasor: Path, taban_ad: str, uzanti: str = ".md") -> Path:
    """'Toplanti_Notu_2026-07-28.md' zaten varsa '_2', '_3' ekleyerek
    üzerine yazmayı önler. `uzanti` parametresi additive — varsayılan
    '.md' ile mevcut çağrı siteleri hiç değişmeden çalışmaya devam eder,
    stilize HTML çıktısı için aynı fonksiyon `.html` ile de kullanılıyor."""
    aday = klasor / f"{taban_ad}{uzanti}"
    sayac = 2
    while aday.exists():
        aday = klasor / f"{taban_ad}_{sayac}{uzanti}"
        sayac += 1
    return aday


TALIMAT_AYIRICI = "\n---AKTAPOKUS_TRANSKRIPT---\n"


def _istek_ayikla(istek: str) -> tuple[str, str]:
    """`istek` iki şeyi TEK bir string'de taşıyor — core'un
    web_analyze(istek, klasor, llm_complete) imzasını hiç değiştirmeden
    (AGENTS.md Madde 2): kullanıcının arayüzdeki "İstek" kutusuna yazdığı
    OPSİYONEL rapor talimatı + onaylanan TAM transkript, `TALIMAT_AYIRICI`
    ile ayrılmış halde. Hem senkron `web_analyze` hem async `/rapor/*`
    yolu bu ayrıştırmayı paylaşıyor."""
    ham = (istek or "").strip()
    if TALIMAT_AYIRICI in ham:
        kullanici_talimati, transkript = ham.split(TALIMAT_AYIRICI, 1)
        return kullanici_talimati.strip(), transkript.strip()
    return "", ham


def _plan_ve_yanit_olustur(transkript: str, ozet: dict, klasor: str) -> dict:
    """`_ozet_uret`'in çıktısından plan kaydı + core'un standart
    web_analyze yanıt şeklini üretir — hem senkron `web_analyze` hem
    async `/rapor/sonuc` AYNI bu fonksiyonu kullanıyor, tek bir yerde
    tanımlı kalsın diye."""
    rapor_govde = _rapor_govde_olustur(ozet)
    icerik = rapor_govde + f"## Tam Transkript\n\n{transkript}\n"

    from datetime import datetime
    taban_ad = f"Toplanti_Notu_{datetime.now().strftime('%Y-%m-%d_%H%M')}"

    # Stilize HTML — .md'nin YERİNE değil, ONA EK olarak (kullanıcı tercihi).
    # "✏ Düzenle" akışı SADECE rapor_govde'yi (markdown) günceller — bu
    # HTML üretim anındaki haliyle kalır, düzenlemeyle senkronize OLMAZ
    # (bilinçli bir v1 kapsam sınırı, AGENTS.md Madde 6.2 — mevcut
    # düzenleme akışına dokunulmuyor).
    icerik_html = _rapor_html_olustur(ozet, taban_ad)

    plan_id = str(uuid.uuid4())
    _plan_store[plan_id] = {
        "klasor": klasor, "taban_ad": taban_ad, "icerik": icerik,
        "transkript": transkript, "rapor_govde": rapor_govde,
        "icerik_html": icerik_html, "ozet": ozet,
    }

    return {
        "bos": False,
        "plan_id": plan_id,
        "aciklama": f"'{taban_ad}.md' olarak kaydedilmeye hazır bir toplantı notu oluşturuldu.",
        "onerilen_dosya_adi": f"{taban_ad}.md",
        "tur": ozet["tur"],
        "ozet_onizleme": ozet["ozet"],
        "gundem_maddeleri": ozet["gundem_maddeleri"],
        "alinan_kararlar": ozet["alinan_kararlar"],
        "aksiyon_maddeleri": ozet["aksiyon_maddeleri"],
        "pdca": ozet["pdca"],
        "belirsiz_noktalar": ozet["belirsiz_noktalar"],
        "filtrelenen_konu_disi": ozet["filtrelenen_konu_disi"],
        "rapor_markdown": rapor_govde,
    }


def web_analyze(istek: str, klasor: str, llm_complete) -> dict:
    """core'un STANDART senkron sözleşmesi (AGENTS.md Madde 3) — hâlâ tam
    olarak çalışır, ama ilerleme raporlamaz. Asıl kullanıcı akışı artık
    `/rapor/baslat`+poll üzerinden gidiyor (bkz. modül docstring'i);
    bu fonksiyon geriye dönük uyumluluk ve sözleşme gereği duruyor."""
    kullanici_talimati, transkript = _istek_ayikla(istek)
    if not transkript:
        return {"bos": True, "mesaj": "Transkript boş — önce bir kayıt işleyin."}

    model_secili = functools.partial(llm_complete, model_override=(rapor_model_tercihi() or None))
    ozet = _ozet_uret(transkript, kullanici_talimati, model_secili)
    return _plan_ve_yanit_olustur(transkript, ozet, klasor)


# ── Async rapor üretimi — STT ile AYNI router+arka plan+poll deseni ───────
_rapor_is_store: dict[str, dict] = {}
_rapor_is_kilit = threading.Lock()


class RaporBaslatIstegi(BaseModel):
    istek: str
    klasor: str


@router.post("/rapor/baslat")
def _route_rapor_baslat(req: RaporBaslatIstegi):
    kullanici_talimati, transkript = _istek_ayikla(req.istek)
    if not transkript:
        raise HTTPException(400, "Transkript boş — önce bir kayıt işleyin.")

    is_id = str(uuid.uuid4())
    with _rapor_is_kilit:
        _rapor_is_store[is_id] = {"durum": "isleniyor", "asama": "basliyor", "yuzde": 0, "sonuc": None, "hata": None}

    def _ilerleme(asama: str, yuzde: float) -> None:
        with _rapor_is_kilit:
            if is_id in _rapor_is_store:
                _rapor_is_store[is_id]["asama"] = asama
                _rapor_is_store[is_id]["yuzde"] = round(yuzde, 1)

    def _calis():
        try:
            model_secili = functools.partial(_core_llm_complete, model_override=(rapor_model_tercihi() or None))
            ozet = _ozet_uret(transkript, kullanici_talimati, model_secili, _ilerleme)
            sonuc = _plan_ve_yanit_olustur(transkript, ozet, req.klasor)
            with _rapor_is_kilit:
                _rapor_is_store[is_id] = {"durum": "tamam", "asama": "tamam", "yuzde": 100, "sonuc": sonuc, "hata": None}
        except Exception as e:
            with _rapor_is_kilit:
                _rapor_is_store[is_id] = {"durum": "hata", "asama": "hata", "yuzde": 0, "sonuc": None, "hata": str(e)}

    threading.Thread(target=_calis, daemon=True).start()
    return {"is_id": is_id}


@router.get("/rapor/durum/{is_id}")
def _route_rapor_durum(is_id: str):
    with _rapor_is_kilit:
        girdi = _rapor_is_store.get(is_id)
    if not girdi:
        return {"durum": "bulunamadi"}
    return {"durum": girdi["durum"], "asama": girdi.get("asama"), "yuzde": girdi.get("yuzde"), "hata": girdi.get("hata")}


@router.get("/rapor/sonuc/{is_id}")
def _route_rapor_sonuc(is_id: str):
    with _rapor_is_kilit:
        girdi = _rapor_is_store.get(is_id)
    if not girdi or girdi["durum"] != "tamam":
        raise HTTPException(404, "Sonuç henüz hazır değil ya da iş bulunamadı.")
    return girdi["sonuc"]


class RaporDuzenleIstegi(BaseModel):
    plan_id: str
    rapor_markdown: str


@router.post("/rapor/duzenle")
def _route_rapor_duzenle(req: RaporDuzenleIstegi):
    """Kullanıcının, LLM'e tekrar sormadan (yazım hatası düzeltme, atlanmış
    bir noktayı ekleme gibi) rapor metnini elle düzenleyip kaydedebilmesi
    için — transkript HARİÇ (o ayrı bir sekmede, çok uzun olabiliyor).
    `_plan_store[plan_id]["icerik"]` güncellenir, mevcut "✓ Kaydet"
    akışı (`web_execute`) bunu OLDUĞU GİBİ dosyaya yazmaya devam eder."""
    entry = _plan_store.get(req.plan_id)
    if not entry:
        raise HTTPException(404, "Plan bulunamadı veya süresi doldu.")
    entry["rapor_govde"] = req.rapor_markdown
    entry["icerik"] = req.rapor_markdown + f"## Tam Transkript\n\n{entry['transkript']}\n"
    return {"basarili": True}


class TranskriptKaydetIstegi(BaseModel):
    transkript: str
    klasor: str


@router.post("/transkript/kaydet")
def _route_transkript_kaydet(req: TranskriptKaydetIstegi):
    """Rapor üretmeden (LLM'e hiç gitmeden) SADECE ham transkripti kendi
    dosyası olarak kaydeder — kullanıcı isteği: rate limit'e/API'ye hiç
    bağımlı kalmadan da bir çıktısı olsun, isterse raporu kendi harici
    LLM'ine (bkz. panel.js'teki "prompt kopyala" özelliği) kendisi
    ürettirsin. `web_execute`'un yazdığı dosyalarla AYNI `_session_store`
    mekanizmasını kullanıyor (sadece `dosya_yolu` dolu) — mevcut genel
    `web_rollback` bunu da sorunsuz siler, ayrı bir rollback yolu gerekmedi."""
    if not req.transkript.strip():
        raise HTTPException(400, "Transkript boş olamaz.")
    klasor = Path(req.klasor)
    from datetime import datetime
    taban_ad = f"Toplanti_Transkript_{datetime.now().strftime('%Y-%m-%d_%H%M')}"
    dosya_yolu = _benzersiz_dosya_yolu(klasor, taban_ad, ".txt")
    try:
        dosya_yolu.write_text(req.transkript, encoding="utf-8")
    except Exception as e:
        raise HTTPException(500, f"Transkript dosyaya yazılamadı: {e}")

    session_id = str(uuid.uuid4())
    _session_store[session_id] = {"dosya_yolu": str(dosya_yolu)}
    return {"dosya_yolu": str(dosya_yolu), "session_id": session_id}


def web_execute(plan_id: str, approved_ids: list[str] | None) -> dict:
    """approved_ids burada anlamsız (tek bir not dosyası var, ayrı ayrı
    onaylanacak öğe listesi yok) — core'un imzası yine de değişmiyor,
    parametre sessizce yok sayılıyor (AGENTS.md Madde 2)."""
    entry = _plan_store.get(plan_id)
    if not entry:
        raise HTTPException(404, "Plan bulunamadı veya süresi doldu.")

    klasor = Path(entry["klasor"])
    dosya_yolu = _benzersiz_dosya_yolu(klasor, entry["taban_ad"])
    try:
        dosya_yolu.write_text(entry["icerik"], encoding="utf-8")
    except Exception as e:
        raise HTTPException(500, f"Not dosyaya yazılamadı: {e}")

    dosya_yolu_html = _benzersiz_dosya_yolu(klasor, entry["taban_ad"], ".html")
    try:
        dosya_yolu_html.write_text(entry.get("icerik_html", ""), encoding="utf-8")
    except Exception as e:
        # .md zaten yazıldı — diğer formatlardan biri başarısız olsa bile
        # ana kayıt kaybolmasın, sadece o format atlanıp uyarı basılsın.
        dosya_yolu_html = None
        print(f"[UYARI] HTML rapor dosyaya yazılamadı: {e}")

    dosya_yolu_pdf = _benzersiz_dosya_yolu(klasor, entry["taban_ad"], ".pdf")
    try:
        dosya_yolu_pdf.write_bytes(_rapor_pdf_olustur(entry.get("icerik_html", "")))
    except Exception as e:
        dosya_yolu_pdf = None
        print(f"[UYARI] PDF rapor dosyaya yazılamadı: {e}")

    dosya_yolu_xlsx = _benzersiz_dosya_yolu(klasor, entry["taban_ad"], ".xlsx")
    try:
        dosya_yolu_xlsx.write_bytes(_rapor_excel_olustur(entry.get("ozet", {}), entry["taban_ad"]))
    except Exception as e:
        dosya_yolu_xlsx = None
        print(f"[UYARI] Excel rapor dosyaya yazılamadı: {e}")

    session_id = str(uuid.uuid4())
    _session_store[session_id] = {
        "dosya_yolu": str(dosya_yolu),
        "dosya_yolu_html": str(dosya_yolu_html) if dosya_yolu_html else None,
        "dosya_yolu_pdf": str(dosya_yolu_pdf) if dosya_yolu_pdf else None,
        "dosya_yolu_xlsx": str(dosya_yolu_xlsx) if dosya_yolu_xlsx else None,
    }
    del _plan_store[plan_id]

    return {"uygulanan": 1, "basarisiz": [], "session_id": session_id,
            "dosya_yolu": str(dosya_yolu),
            "dosya_yolu_html": str(dosya_yolu_html) if dosya_yolu_html else None,
            "dosya_yolu_pdf": str(dosya_yolu_pdf) if dosya_yolu_pdf else None,
            "dosya_yolu_xlsx": str(dosya_yolu_xlsx) if dosya_yolu_xlsx else None}


def web_rollback(klasor: str, session_id: str | None) -> dict:
    if not session_id or session_id not in _session_store:
        return {"basarili": False, "hatalar": ["Geri alınacak işlem bulunamadı."], "session_id": None}
    entry = _session_store[session_id]
    hatalar = []
    for anahtar in ("dosya_yolu", "dosya_yolu_html", "dosya_yolu_pdf", "dosya_yolu_xlsx"):
        if entry.get(anahtar):
            try:
                Path(entry[anahtar]).unlink(missing_ok=True)
            except Exception as e:
                hatalar.append(str(e))
    if hatalar:
        return {"basarili": False, "hatalar": hatalar, "session_id": session_id}
    del _session_store[session_id]
    return {"basarili": True, "hatalar": [], "session_id": session_id}
