"""
tools/toplanti/__init__.py
Toplantı Notları Tool — public API.

Ses işleme İKİ ayrı yerel model kullanıyor:
1. faster-whisper — Türkçe transkripsiyon (language="tr" SABİT, otomatik
   dil algılamaya güvenilmiyor — görev zaten Türkçe olarak tanımlı).
2. pyannote.audio — konuşmacı ayrımı (speaker diarization). Pretrained
   pipeline HuggingFace'te lisans kabulü + bir erişim token'ı (HF_TOKEN)
   gerektiriyor (bkz. README.md kurulum adımları).

İkisi de TAMAMEN yerel çalışır (indirilen ağırlıklar sonrası internet
gerekmez) — MANIFESTO Madde 5 (Local First) ile uyumlu.

Bu iki model de büyük/yavaş yüklendiği için modül seviyesinde LAZY ve
TEK SEFERLİK (cache'lenmiş) yükleniyor — her istek için yeniden yüklemek
hem çok yavaş hem gereksiz bellek kullanımı olurdu.
"""

from __future__ import annotations
import json
import os
import shutil
import subprocess
import threading
import uuid
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
SES_GECICI_DIR = DATA_DIR / "gecici_ses"
SES_GECICI_DIR.mkdir(exist_ok=True)


# ── .env dosyasını doğrudan okuma/yazma ────────────────────────────────────
# Aynı gerekçe Gmail tool'undaki ve core/llm.py'deki ile birebir aynı:
# Docker'ın env_file mekanizması sadece container İLK OLUŞTURULDUĞUNDA
# process ortamına enjekte ediyor — admin panelden HF_TOKEN gibi bir
# değer kaydedilince restart beklemeden devreye girsin diye .env'i HER
# SEFERİNDE diskten taze okuyoruz (SECURITY.md Madde 5.2).
ENV_DOSYA_YOLU = Path("/app/.env")


def _env_dosya_oku() -> dict:
    sonuc = {}
    if ENV_DOSYA_YOLU.exists():
        for satir in ENV_DOSYA_YOLU.read_text(encoding="utf-8").splitlines():
            if "=" in satir and not satir.strip().startswith("#"):
                anahtar, _, deger = satir.partition("=")
                sonuc[anahtar.strip()] = deger.strip()
    return sonuc


def _env_deger(anahtar: str, varsayilan: str = "") -> str:
    return _env_dosya_oku().get(anahtar, varsayilan)


def _env_deger_yaz(guncellemeler: dict) -> None:
    satirlar = ENV_DOSYA_YOLU.read_text(encoding="utf-8").splitlines() if ENV_DOSYA_YOLU.exists() else []
    bulunanlar = set()
    yeni_satirlar = []
    for satir in satirlar:
        if "=" in satir and not satir.strip().startswith("#"):
            anahtar = satir.split("=", 1)[0].strip()
            if anahtar in guncellemeler:
                yeni_satirlar.append(f"{anahtar}={guncellemeler[anahtar]}")
                bulunanlar.add(anahtar)
                continue
        yeni_satirlar.append(satir)
    for anahtar, deger in guncellemeler.items():
        if anahtar not in bulunanlar:
            yeni_satirlar.append(f"{anahtar}={deger}")
    ENV_DOSYA_YOLU.write_text("\n".join(yeni_satirlar) + "\n", encoding="utf-8")


def hf_token_kaydet(token: str) -> None:
    _env_deger_yaz({"HF_TOKEN": token.strip()})


def hf_token_bilgisi() -> dict:
    token = _env_deger("HF_TOKEN")
    return {"yapilandirilmis": bool(token)}


# ── Model tercihleri — CORE'un paylaşılan model registry'sinden (models.json,
# /settings sayfası) seçim. Toplantı kendi ayrı bir kayıt defteri TUTMUYOR —
# core zaten bu iş için var (MANIFESTO Madde 9: Model Bağımsızlığı), key/
# endpoint'i burada TEKRAR girdirmek istenmiyor (gerçek kullanımda net
# şekilde belirtildi: "core tamamen bu altyapı hazırlığı için dizayn edildi,
# her seferinde ayar yapmayalım diye"). Toplantı sadece core/llm.py'nin
# `liste_modeller()`'ını okuyup iki rol için seçim yapıyor: STT (transkripsiyon)
# ve rapor üretimi (map-reduce). Hiçbir sağlayıcı (bugün) diarization'ı
# bulutta yapmıyor (gerçek API testiyle doğrulandı), bu yüzden STT için
# bulut seçilse bile konuşmacı ayrımı hep yerel pyannote'ta kalıyor.
def _core_model_bilgisi(model_id: str) -> dict | None:
    import llm as _core_llm
    return _core_llm.liste_modeller().get(model_id)


def stt_model_tercihi_kaydet(model_id: str) -> None:
    _env_deger_yaz({"TOPLANTI_STT_MODEL": (model_id or "yerel").strip()})


def stt_model_tercihi() -> str:
    return _env_deger("TOPLANTI_STT_MODEL", "yerel")


def rapor_model_tercihi_kaydet(model_id: str) -> None:
    _env_deger_yaz({"TOPLANTI_RAPOR_MODEL": (model_id or "").strip()})


def rapor_model_tercihi() -> str:
    """Boş string = varsayılan (admin panelindeki tek genel model)."""
    return _env_deger("TOPLANTI_RAPOR_MODEL", "")


def konusmaci_ayrimi_tercihi_kaydet(acik: bool) -> None:
    _env_deger_yaz({"TOPLANTI_KONUSMACI_AYRIMI": "acik" if acik else "kapali"})


def konusmaci_ayrimi_tercihi() -> bool:
    """Varsayılan açık — konuşmacı ayrımı (pyannote) STT'den bağımsız,
    her zaman yerel ve CPU'da çalışan ayrı bir adım; gerçek kullanımda
    uzun toplantılarda asıl darboğazın bu adım olduğu görüldü (Groq'a
    geçilince transkripsiyon hızlandı ama bu adım aynı kaldı). Kapatılırsa
    transkript tek bir genel "Transkript" etiketiyle döner, süreç bu
    adımı (model yükleme + inference + hizalama) tamamen atlar."""
    return _env_deger("TOPLANTI_KONUSMACI_AYRIMI", "acik") != "kapali"


def _whisper_model_boyutu() -> str:
    return _env_deger("TOPLANTI_WHISPER_MODEL", "medium")


def _cpu_thread_sayisi() -> int:
    # ctranslate2 (faster-whisper'ın çıkarım motoru), cpu_threads=0
    # (varsayılan) verildiğinde muhafazakâr bir değer (genelde ~4) seçiyor
    # — çok çekirdekli makinelerde çekirdeklerin büyük kısmı boşta kalıyor.
    # API sunucusuna/diğer tool'lara 1-2 çekirdek pay bırakıp geri kalanını
    # whisper'a veriyoruz.
    override = _env_deger("TOPLANTI_CPU_THREADS")
    if override.isdigit():
        return int(override)
    return max((os.cpu_count() or 4) - 2, 1)


def _batch_boyutu() -> int:
    override = _env_deger("TOPLANTI_BATCH_SIZE")
    return int(override) if override.isdigit() else 8


# ── Model yükleme — lazy + cache'li, iş parçacığı güvenli ─────────────────
# MANIFESTO Madde 5 (Local First): ağırlıklar bir kez indirildikten sonra
# sistem internetsiz çalışmak ZORUNDA. huggingface_hub (hem faster-whisper
# hem pyannote.audio'nun ağırlık indirme mekanizması olarak kullandığı
# kütüphane) varsayılan olarak HER yüklemede önbelleği güncel mi diye
# internete kısa bir kontrol isteği atmaya çalışır — internet yoksa bu,
# başarısız olmadan önce fark edilir bir gecikmeye (DNS/bağlantı zaman
# aşımı) yol açabilir. `_cevrimdisi_yedekli_yukle`, önce normal (çevrimiçi)
# yüklemeyi dener; başarısız olursa HF_HUB_OFFLINE=1 ile SADECE yerel
# önbellekten tekrar dener — böylece internet yokken de (ağırlıklar zaten
# indirilmişse) çalışmaya devam eder, internet varken de en güncel/doğru
# davranışı korur.
_whisper_model = None
_whisper_model_kilit = threading.Lock()
_diarization_pipeline = None
_diarization_kilit = threading.Lock()


def _cevrimdisi_yedekli_yukle(yukleyici_fn):
    try:
        return yukleyici_fn()
    except Exception as e:
        if os.environ.get("HF_HUB_OFFLINE") == "1":
            raise  # zaten çevrimdışı denedik, başka çare yok
        print(f"[toplanti] Model çevrimiçi yüklenemedi ({e}) — yerel önbellekten "
              f"(çevrimdışı) tekrar deneniyor...")
        os.environ["HF_HUB_OFFLINE"] = "1"
        try:
            return yukleyici_fn()
        except Exception:
            raise RuntimeError(
                "Model ne çevrimiçi ne de yerel önbellekten yüklenebildi — muhtemelen "
                "bu model ağırlıkları hiç indirilmemiş ve şu an internet yok. İnternete "
                "bağlıyken bir kez çalıştırıp ağırlıkların inmesini bekleyin."
            ) from e
        finally:
            os.environ.pop("HF_HUB_OFFLINE", None)


def _whisper_yukle():
    global _whisper_model
    if _whisper_model is None:
        with _whisper_model_kilit:
            if _whisper_model is None:
                from faster_whisper import WhisperModel, BatchedInferencePipeline

                def _yukle():
                    model = WhisperModel(
                        _whisper_model_boyutu(), device="cpu", compute_type="int8",
                        cpu_threads=_cpu_thread_sayisi(),
                    )
                    # BatchedInferencePipeline, sesi VAD ile parçalara bölüp
                    # bu parçaları toplu (batch) işliyor — kullanıcının önerdiği
                    # "parçalara böl + paralel işle" fikrinin karşılığı, ama
                    # elle chunk/queue/worker sistemi yazıp parça sınırlarında
                    # kelime bölünmesi gibi yeni hatalar riske atmak yerine
                    # kütüphanenin kendi test edilmiş mekanizması kullanılıyor.
                    return BatchedInferencePipeline(model=model)

                _whisper_model = _cevrimdisi_yedekli_yukle(_yukle)
    return _whisper_model


def _diarization_yukle():
    global _diarization_pipeline
    if _diarization_pipeline is None:
        with _diarization_kilit:
            if _diarization_pipeline is None:
                token = _env_deger("HF_TOKEN")
                if not token:
                    raise RuntimeError(
                        "HF_TOKEN henüz ayarlanmadı. Toplantı Notları'nın bağlantı "
                        "ayarları bölümünden HuggingFace erişim token'ınızı girin "
                        "(bkz. README.md kurulum adımları)."
                    )

                def _yukle():
                    from pyannote.audio import Pipeline
                    # pyannote.audio 4.x, from_pretrained'deki auth parametresini
                    # use_auth_token'dan token'a değiştirdi (requirements.txt'teki
                    # gevşek ">=3.1" pini bu kırılmayı yakalamadı, kurulumda pip
                    # doğrudan 4.x'i getirdi). Geriye dönük destek yok, tek isim
                    # geçerli.
                    return Pipeline.from_pretrained(
                        "pyannote/speaker-diarization-3.1", token=token
                    )

                _diarization_pipeline = _cevrimdisi_yedekli_yukle(_yukle)
    return _diarization_pipeline


# ── Bulut transkripsiyon — sadece transkript (diarization YOK, gerçek API
# testiyle doğrulandı: HF ve Groq'un whisper endpoint'leri konuşmacı ayrımı
# desteklemiyor). Bu yüzden "hibrit" — transkript bulutta, diarization hâlâ
# yukarıdaki yerel pyannote'ta. Segment zaman damgaları ZORUNLU (diarization
# ile hizalama için).
#
# HF Inference API DENENDİ ve çalıştığı doğrulandı, ama son kullanıcı
# onboarding'i (3 ayrı model lisansı kabul + token'da özel bir "Inference
# Providers" izni açma — varsayılan "Read" token'ı yetmiyor) gerçek
# kullanımda çok sürtünmeli bulundu ve kaldırıldı. Groq'un kurulumu (hesap
# aç + key kopyala, lisans/izin adımı yok) çok daha basit — bu yüzden
# bugün tek yerleşik bulut STT sağlayıcı Groq (openai_whisper_compat).
def _openai_uyumlu_whisper_transkript(ses_yolu: Path, endpoint: str, model: str, key: str) -> list[dict]:
    """Groq gibi OpenAI'ın /v1/audio/transcriptions formatını taklit eden
    sağlayıcılar için — multipart dosya yükleme, verbose_json ile segment
    zaman damgaları alınır."""
    import requests

    with open(ses_yolu, "rb") as f:
        dosyalar = {"file": (ses_yolu.name, f, "application/octet-stream")}
        veri_alani = {"model": model, "response_format": "verbose_json"}
        r = requests.post(
            endpoint, headers={"Authorization": f"Bearer {key}"},
            files=dosyalar, data=veri_alani, timeout=600,
        )
    r.raise_for_status()
    veri = r.json()
    segmentler = []
    for seg in veri.get("segments", []):
        metin = (seg.get("text") or "").strip()
        if metin:
            segmentler.append({"baslangic": seg["start"], "bitis": seg["end"], "metin": metin})
    return segmentler


def _ses_bilgisi(ses_yolu: Path) -> tuple[float, int]:
    """ffprobe ile (süre_saniye, bit_hızı_bps) döner — konteynerda zaten
    kurulu (pyannote/torchcodec için eklenmişti, bkz. Dockerfile)."""
    sonuc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration,bit_rate",
         "-of", "json", str(ses_yolu)],
        capture_output=True, text=True, timeout=30,
    )
    if sonuc.returncode != 0:
        raise RuntimeError(f"ffprobe ile ses dosyası okunamadı: {sonuc.stderr.strip()}")
    veri = json.loads(sonuc.stdout).get("format", {})
    return float(veri.get("duration", 0) or 0), int(veri.get("bit_rate", 0) or 0)


_BULUT_STT_HEDEF_MB = 18  # Groq'un ücretsiz katman sınırı 25MB — güvenlik payı bırakıyoruz.


def _ses_parcala(ses_yolu: Path, hedef_mb: int = _BULUT_STT_HEDEF_MB) -> list[Path]:
    """Groq gibi bulut STT sağlayıcılarının dosya boyutu sınırını (25MB,
    gerçek API testiyle doğrulandı: 413 Payload Too Large) aşan kayıtları
    güvenli parçalara böler. Sabit bir SÜRE ile bölmek güvenli değil —
    sıkıştırılmamış wav'da birkaç dakika bile 25MB'ı aşar, sıkıştırılmış
    m4a/opus'ta çok daha uzun süre altında kalabilir — bu yüzden kaynağın
    GERÇEK bit hızına göre güvenli bir parça süresi hesaplanıyor.

    Dosya zaten hedef boyutun altındaysa ffmpeg hiç çalıştırılmadan
    `[ses_yolu]` döner — küçük/native kayıtlarda mevcut hızlı yol
    birebir korunuyor (additive değişiklik)."""
    hedef_bayt = hedef_mb * 1024 * 1024
    if ses_yolu.stat().st_size <= hedef_bayt:
        return [ses_yolu]

    sure, bit_hizi = _ses_bilgisi(ses_yolu)
    if bit_hizi <= 0:
        bit_hizi = int(ses_yolu.stat().st_size * 8 / max(sure, 1))
    parca_saniye = max(60, int((hedef_bayt * 8) / bit_hizi))

    parca_klasoru = SES_GECICI_DIR / f"parca_{uuid.uuid4()}"
    parca_klasoru.mkdir(exist_ok=True)
    cikti_deseni = parca_klasoru / f"parca_%03d{ses_yolu.suffix}"
    sonuc = subprocess.run(
        ["ffmpeg", "-i", str(ses_yolu), "-f", "segment", "-segment_time", str(parca_saniye),
         "-c", "copy", "-reset_timestamps", "1", str(cikti_deseni)],
        capture_output=True, text=True, timeout=300,
    )
    if sonuc.returncode != 0:
        shutil.rmtree(parca_klasoru, ignore_errors=True)
        raise RuntimeError(f"Ses dosyası parçalanamadı: {sonuc.stderr.strip()[-500:]}")

    parcalar = sorted(parca_klasoru.glob(f"parca_*{ses_yolu.suffix}"))
    if not parcalar:
        shutil.rmtree(parca_klasoru, ignore_errors=True)
        raise RuntimeError("Ses dosyası parçalandı ama hiçbir parça üretilmedi.")

    # Güvenlik ağı: VBR sapması yüzünden bir parça hâlâ sınırı aşıyorsa
    # (nadir), o parçayı tek seferlik yarıya böl.
    nihai_parcalar: list[Path] = []
    for parca in parcalar:
        if parca.stat().st_size <= hedef_bayt:
            nihai_parcalar.append(parca)
            continue
        yari_saniye = max(30, parca_saniye // 2)
        alt_deseni = parca.with_name(f"{parca.stem}_alt_%03d{ses_yolu.suffix}")
        subprocess.run(
            ["ffmpeg", "-i", str(parca), "-f", "segment", "-segment_time", str(yari_saniye),
             "-c", "copy", "-reset_timestamps", "1", str(alt_deseni)],
            capture_output=True, text=True, timeout=300,
        )
        alt_parcalar = sorted(parca.parent.glob(f"{parca.stem}_alt_*{ses_yolu.suffix}"))
        nihai_parcalar.extend(alt_parcalar if alt_parcalar else [parca])
    return nihai_parcalar


def _bulut_transkript_al(ses_yolu: Path, core_model_girdi: dict, model_id: str, ilerleme_fn=None) -> list[dict]:
    """CORE registry'sinden (models.json) seçilen bir "ses" görevi modeliyle
    transkript alır. Bugün tüm "ses" görevli girdiler OpenAI-uyumlu
    /audio/transcriptions formatında (Groq ve benzerleri) — provider alanı
    burada ayırt edici değil, gorev=="ses" olması yeterli.

    Groq'un 25MB dosya boyutu sınırını aşan kayıtlar `_ses_parcala` ile
    parçalara bölünüp SIRAYLA gönderilir, her parçanın zaman damgalarına
    bir önceki parçaların GERÇEK (ffprobe'dan okunan) toplam süresi kadar
    offset eklenir — segment kesimi keyframe'e denk geldiği için tahmini
    `parca_saniye` değil, gerçek süre kullanılıyor."""
    if ilerleme_fn is None:
        ilerleme_fn = lambda asama, yuzde: None

    key_env = core_model_girdi.get("key_env", "")
    key = _env_deger(key_env)
    if not key:
        raise RuntimeError(
            f"'{model_id}' için API key girilmemiş — Model Ayarları sayfasından "
            "(/settings) key'i girin."
        )
    endpoint = core_model_girdi.get("endpoint", "")
    if not endpoint:
        raise RuntimeError(f"'{model_id}' için endpoint tanımlı değil (models.json).")
    model_adi = core_model_girdi.get("model", model_id)

    parcalar = _ses_parcala(ses_yolu)
    parcalandi = parcalar[0].parent != ses_yolu.parent
    parca_klasoru = parcalar[0].parent if parcalandi else None
    try:
        segmentler: list[dict] = []
        offset = 0.0
        for i, parca in enumerate(parcalar):
            ilerleme_fn(f"bulut_transkripsiyon_parca_{i + 1}/{len(parcalar)}", 10 + (i / len(parcalar)) * 65)
            parca_segmentleri = _openai_uyumlu_whisper_transkript(parca, endpoint, model_adi, key)
            for seg in parca_segmentleri:
                segmentler.append({
                    "baslangic": seg["baslangic"] + offset,
                    "bitis": seg["bitis"] + offset,
                    "metin": seg["metin"],
                })
            if parcalandi:
                parca_suresi, _ = _ses_bilgisi(parca)
                offset += parca_suresi
        return segmentler
    finally:
        if parca_klasoru is not None:
            shutil.rmtree(parca_klasoru, ignore_errors=True)


# ── İş (job) durumu — bellek-içi, Gmail'in plan/session store deseniyle aynı
# basitlikte. Kalıcı olması gerekmiyor: bir toplantının işlenmesi tek bir
# process ömrü içinde başlayıp bitiyor, process yeniden başlarsa zaten
# yarım kalan bir iş de anlamını yitirir (kullanıcı yeniden yükler).
_is_store: dict[str, dict] = {}
_is_store_kilit = threading.Lock()

# CPU-yoğun asıl işleme (whisper+pyannote) tek seferde SADECE BİR iş
# tarafından yapılır — aynı anda iki yükleme gelirse ikincisi kuyrukta
# bekler. Neden: iki iş paralel çalışırsa aynı sabit CPU havuzunu paylaşıp
# ikisi de yavaşlıyor (gerçek bir kullanım hatasında gözlemlendi — kazasen
# iki kez yüklenen aynı kayıt, ikisi de aynı anda işlenip birbirini
# yavaşlatmıştı). Kuyruğa alma, dosya yükleme/is_id üretimini ENGELLEMİYOR
# — sadece ağır hesaplama adımı serileştiriliyor.
_isleme_kilit = threading.Lock()


def is_baslat(ses_dosya_yolu: Path) -> str:
    """Arka planda transkripsiyon+konuşmacı-ayrımı işini başlatır, hemen
    bir iş id'si döner. UI bunu `is_durumu`/`is_sonucu` ile poll eder —
    Gmail'in oauth/status poll deseniyle aynı yaklaşım, burada da
    core'un /api/analyze'inin senkron/dakikalarca-bekleyemez doğasını
    aşmak için tool'un kendi router'ında (bkz. web.py) kullanılıyor."""
    is_id = str(uuid.uuid4())
    with _is_store_kilit:
        _is_store[is_id] = {"durum": "isleniyor", "asama": "baslatiliyor", "yuzde": 0, "sonuc": None, "hata": None}

    def _ilerleme(asama: str, yuzde: float) -> None:
        with _is_store_kilit:
            if is_id in _is_store:
                _is_store[is_id]["asama"] = asama
                _is_store[is_id]["yuzde"] = round(yuzde, 1)

    def _calis():
        if _isleme_kilit.locked():
            _ilerleme("sirada_bekliyor", 0)
        try:
            with _isleme_kilit:
                sonuc = _ses_isle(ses_dosya_yolu, _ilerleme)
            with _is_store_kilit:
                _is_store[is_id] = {"durum": "tamam", "asama": "tamam", "yuzde": 100, "sonuc": sonuc, "hata": None}
        except Exception as e:
            with _is_store_kilit:
                _is_store[is_id] = {"durum": "hata", "asama": "hata", "yuzde": 0, "sonuc": None, "hata": str(e)}
        finally:
            # Ham ses dosyası — transkript çıkarıldıktan sonra (başarılı ya
            # da başarısız fark etmez) otomatik silinir. Gizlilik + disk
            # alanı önceliği: kullanıcı sadece kaydettiği transkript+özet
            # dosyasını (web_execute ile klasöre yazılan) kalıcı tutar.
            try:
                ses_dosya_yolu.unlink(missing_ok=True)
            except Exception:
                pass

    threading.Thread(target=_calis, daemon=True).start()
    return is_id


def is_durumu(is_id: str) -> dict:
    with _is_store_kilit:
        girdi = _is_store.get(is_id)
    if not girdi:
        return {"durum": "bulunamadi"}
    return {
        "durum": girdi["durum"], "hata": girdi.get("hata"),
        "asama": girdi.get("asama"), "yuzde": girdi.get("yuzde"),
    }


def is_sonucu(is_id: str) -> list[dict] | None:
    with _is_store_kilit:
        girdi = _is_store.get(is_id)
    if not girdi or girdi["durum"] != "tamam":
        return None
    return girdi["sonuc"]


def _ses_isle(ses_dosya_yolu: Path, ilerleme_fn=None) -> list[dict]:
    """Tam işleme hattı: whisper transkripsiyon + pyannote konuşmacı ayrımı
    + ikisinin hizalanması. Döndürülen liste: [{konusmaci, baslangic,
    bitis, metin}, ...] — konuşmacı etiketleri "Konuşmacı 1", "Konuşmacı 2"
    şeklinde, pyannote'un ham SPEAKER_00/01 kimliklerinin ilk görülme
    sırasına göre okunabilir hale getirilmiş versiyonu.

    ilerleme_fn(asama: str, yuzde: float) — opsiyonel geri çağırma. Whisper
    aşaması gerçek segment ilerlemesinden (seg.bitis / toplam_sure) hesaplanan
    yüzdeyi raporlar; konuşmacı ayrımı (pyannote) tek bir bloklama çağrısı
    olduğu için ara ilerleme veremiyor — sadece aşama adı gösterilir. Bu,
    uzun (1+ saat) kayıtlarda kullanıcının "hiçbir şey olmuyor" hissine
    kapılmasını önlemek için var; kesin bir zaman tahmini değildir."""
    if ilerleme_fn is None:
        ilerleme_fn = lambda asama, yuzde: None

    ses_yolu_str = str(ses_dosya_yolu)
    secili_model = stt_model_tercihi()

    if secili_model == "yerel":
        ilerleme_fn("model_yukleniyor", 0)
        whisper_model = _whisper_yukle()

        ilerleme_fn("transkripsiyon", 0)
        # Gürültülü/karışık konuşmalarda (birden çok kişi üst üste konuşuyor,
        # fabrika ortamı vb.) whisper'ın klasik "tekrar döngüsü" hatasına
        # düşmesini önlüyor — model bir cümleye takılıp onu defalarca art
        # arda üretmeye başlayabiliyor (gerçek kullanımda gözlemlendi).
        # condition_on_previous_text=False, önceki (yanlış olabilecek)
        # çıktının sonraki segmenti yanlış yönlendirmesini engelliyor;
        # no_repeat_ngram_size, aynı 3 kelimelik öbeğin art arda tekrarını
        # decoder seviyesinde tamamen yasaklıyor.
        segments, info = whisper_model.transcribe(
            ses_yolu_str, language="tr", batch_size=_batch_boyutu(),
            condition_on_previous_text=False, no_repeat_ngram_size=3, repetition_penalty=1.1,
        )
        toplam_sure = max(info.duration, 1.0)
        whisper_segmentleri = []
        for s in segments:
            if s.text.strip():
                whisper_segmentleri.append({"baslangic": s.start, "bitis": s.end, "metin": s.text.strip()})
            # Transkripsiyon toplam sürenin ~%75'ini kaplıyor (konuşmacı ayrımı
            # genelde ondan daha hızlı) — bu payı transkripsiyona ayırıyoruz.
            ilerleme_fn("transkripsiyon", min(s.end / toplam_sure, 1.0) * 75)
    else:
        # Bulut (hibrit) yol — transkript CORE'un model registry'sinden
        # seçilen bir modelle uzak bir API'den geliyor, konuşmacı ayrımı
        # YİNE de aşağıda yerel pyannote ile yapılıyor (hiçbir sağlayıcı
        # ikisini birden sunmuyor, gerçek API testiyle doğrulandı). Tek bir
        # bloklama çağrısı olduğu için ara ilerleme veremiyoruz — whisper'ın
        # segment-bazlı ilerlemesinin aksine.
        core_girdi = _core_model_bilgisi(secili_model)
        if core_girdi is None:
            raise RuntimeError(
                f"Seçili STT modeli ('{secili_model}') artık models.json'da tanımlı değil — "
                "Model Ayarları sayfasından (/settings) kontrol edin."
            )
        ilerleme_fn("bulut_transkripsiyon", 10)
        whisper_segmentleri = _bulut_transkript_al(ses_dosya_yolu, core_girdi, secili_model, ilerleme_fn)
        ilerleme_fn("transkripsiyon", 75)

    if not konusmaci_ayrimi_tercihi():
        # Kullanıcı hızlanmak için konuşmacı ayrımını kapattıysa — bu adım
        # (model yükleme + inference + hizalama) TAMAMEN atlanır, whisper
        # segmentleri tek bir genel etiketle döner.
        ilerleme_fn("tamamlaniyor", 95)
        return [
            {"konusmaci": "Transkript", "baslangic": s["baslangic"], "bitis": s["bitis"], "metin": s["metin"]}
            for s in whisper_segmentleri
        ]

    ilerleme_fn("konusmaci_ayrimi", 75)
    diarization = _diarization_yukle()
    diarization_sonucu = diarization(ses_yolu_str)
    ilerleme_fn("hizalaniyor", 95)
    # pyannote.audio 4.x, pipeline çıktısını bir DiarizeOutput sarmalayıcısına
    # taşıdı — gerçek Annotation (.itertracks() metoduna sahip nesne) artık
    # .speaker_diarization alanının içinde (gerçek kullanımda AttributeError
    # ile bulundu). getattr ile eski davranışa (nesnenin kendisi zaten
    # Annotation'sa) da geriye dönük uyumlu kalınıyor.
    diarization_annotation = getattr(diarization_sonucu, "speaker_diarization", diarization_sonucu)
    konusmaci_turlari = [
        {"baslangic": turn.start, "bitis": turn.end, "konusmaci_ham": konusmaci}
        for turn, _, konusmaci in diarization_annotation.itertracks(yield_label=True)
    ]

    # Ham SPEAKER_00/SPEAKER_01... kimliklerini ilk görülme sırasına göre
    # "Konuşmacı 1", "Konuşmacı 2" gibi okunabilir etiketlere çeviriyoruz.
    etiket_haritasi: dict[str, str] = {}

    def _okunabilir_etiket(ham: str) -> str:
        if ham not in etiket_haritasi:
            etiket_haritasi[ham] = f"Konuşmacı {len(etiket_haritasi) + 1}"
        return etiket_haritasi[ham]

    sonuc = []
    for seg in whisper_segmentleri:
        orta_nokta = (seg["baslangic"] + seg["bitis"]) / 2
        # Bu whisper segmentinin orta noktasını kapsayan (ya da en yakın)
        # diarization turunu bul — basit ama bu ölçekte yeterli bir
        # hizalama yöntemi.
        en_yakin = min(
            konusmaci_turlari,
            key=lambda t: (
                0 if t["baslangic"] <= orta_nokta <= t["bitis"]
                else min(abs(t["baslangic"] - orta_nokta), abs(t["bitis"] - orta_nokta))
            ),
            default=None,
        )
        konusmaci = _okunabilir_etiket(en_yakin["konusmaci_ham"]) if en_yakin else "Konuşmacı 1"
        sonuc.append({
            "konusmaci": konusmaci,
            "baslangic": seg["baslangic"],
            "bitis": seg["bitis"],
            "metin": seg["metin"],
        })
    return sonuc


def modelleri_onceden_indir() -> None:
    """setup.bat'in kurulum sırasında çağırdığı 'ısınma' adımı — whisper ve
    (token girildiyse) pyannote model ağırlıklarını ÖNCEDEN indirir/yükler,
    böylece kullanıcı İLK gerçek toplantısında bu indirme/yükleme süresini
    beklemek zorunda kalmaz — "sadece setup.bat çalıştıracağım" beklentisiyle
    tutarlı, elle ek bir adım gerektirmiyor.

    Hatalar burada YAKALANIP sadece basılıyor, fırlatılmıyor — ağ sorunu ya
    da henüz girilmemiş bir token, kurulumun geri kalanını başarısız
    yapmamalı; bu durumda indirme sadece ilk gerçek kullanımda (lazy)
    tekrar denenir."""
    print("[toplanti] Whisper modeli indiriliyor/yükleniyor...")
    try:
        _whisper_yukle()
        print("[toplanti] Whisper modeli hazır.")
    except Exception as e:
        print(f"[toplanti] UYARI: Whisper modeli şu an indirilemedi ({e}) — ilk gerçek kullanımda tekrar denenecek.")

    if _env_deger("HF_TOKEN"):
        print("[toplanti] Konuşmacı ayrımı (pyannote) modeli indiriliyor/yükleniyor...")
        try:
            _diarization_yukle()
            print("[toplanti] Konuşmacı ayrımı modeli hazır.")
        except Exception as e:
            print(f"[toplanti] UYARI: Konuşmacı ayrımı modeli şu an indirilemedi ({e}) — ilk gerçek kullanımda tekrar denenecek.")
    else:
        print("[toplanti] HF_TOKEN henüz girilmedi — konuşmacı ayrımı modeli şimdi indirilemiyor, "
              "token girildikten sonra ilk kullanımda indirilecek.")


# web.py bu modüldeki fonksiyonlara bağımlı — import en sonda (circular import önlemi).
from .web import web_analyze, web_execute, web_rollback, router  # noqa: E402
