# Toplantı Notları

Toplantı sesini kaydedip (canlı mikrofon ya da sonradan yüklenen bir ses
dosyası) Türkçe transkript çıkaran, her farklı sesi ayrı bir konuşmacı olarak
ayırt eden (speaker diarization) ve LLM ile yapılandırılmış bir toplantı
özeti üreten Aktapokus Tool'u. `core.*` namespace, Faz 1 (reversible/IT-domain).

## Ne yapar

1. **Ses kaydı** — tarayıcıdan mikrofonla canlı kayıt (MediaRecorder) ya da
   önceden kaydedilmiş bir ses dosyası (mp3/wav/m4a/ogg/webm) yükleme.
2. **Toplu işleme** — kayıt/yükleme bitince (canlı akan transkript YOK,
   bilinçli bir v0.1 kapsam kararı) ses arka planda işlenir:
   - **Transkripsiyon:** `faster-whisper`, Türkçe (`language="tr"` sabit).
   - **Konuşmacı ayrımı:** `pyannote.audio`'nun pretrained
     `speaker-diarization-3.1` pipeline'ı — "Konuşmacı 1", "Konuşmacı 2"...
     etiketleriyle kim ne zaman konuştu ayırt edilir.
   İkisi de tamamen yerel çalışır (model ağırlıkları bir kez indirildikten
   sonra internet gerekmez).
3. **Konuşmacı adlarını düzenleme** — kullanıcı isterse "Konuşmacı 1" gibi
   etiketleri gerçek isimlerle değiştirebilir (sadece o oturum için —
   kalıcı ses izi/kimlik eşleştirmesi v0.1 kapsamında yok).
4. **Not oluşturma (map-reduce)** — uzun transkriptler tek bir LLM
   çağrısına sığmadığı (ve sığsa bile modelin dikkatinin dağıldığı) için
   transkript, konuşmacı-dönüşü sınırında kelime bazlı parçalara (chunk)
   bölünür; her parça ayrı özetlenir (**map**), sonra tüm parça özetleri
   TEK bir nihai rapora birleştirilir (**reduce**) — özet, gündem
   maddeleri, alınan kararlar, aksiyon maddeleri, (görüşme bir toplantı/
   süreç görüşmesiyse) PDCA, belirsiz/çelişkili noktalar, filtrelenen
   konu dışı içerik. Kısa görüşmeler (tek parçaya sığan) gereksiz bir
   map adımı atlanıp doğrudan tek çağrıda işlenir. Hem map hem reduce
   AYNI modeli kullanır (core'un paylaşılan `llm_complete`'i) — bu
   donanımda (GPU yok) ikinci, daha ağır bir "reasoning" modeli lokal
   çalıştırmak whisper'da yaşanan yavaşlık sorununu bu adımda tekrar
   yaratırdı. Kullanıcı onaylayınca transkript + rapor, seçilen klasöre
   bir Markdown dosyası olarak yazılır. Tamamen geri alınabilir (dosya
   silinerek).
   Chunk boyutu `.env`'deki `TOPLANTI_CHUNK_KELIME` ile ayarlanabilir
   (varsayılan: 2500 kelime — Ollama'nın tipik varsayılan context
   penceresine göre muhafazakâr bir değer).

**Ölçek notu:** CPU'da (bu tool'un varsayılan çalışma şekli — GPU desteği
core'un `docker-compose.yml`'inde şu an tanımlı değil) transkripsiyon+
konuşmacı ayrımı gerçek zamanlıdan yavaş çalışır. Uzun toplantılar (1+ saat)
işlenmesi onlarca dakika sürebilir — bu yüzden "kayıt bitince toplu işle,
arka planda bekle" modeli seçildi, kullanıcı sonucu ilerleme yüzdesiyle
takip eder (bkz. `is_durumu`'ndaki `asama`/`yuzde` alanları).

**Performans ayarı:** `faster-whisper`'ın çıkarım motoru (`ctranslate2`),
`cpu_threads` belirtilmezse muhafazakâr bir varsayım (~4 iş parçacığı)
kullanır — çok çekirdekli makinelerde çekirdeklerin çoğu boşta kalır. Bu
tool, mevcut çekirdek sayısından 2'sini (API sunucusu + diğer tool'lar
için) çıkarıp geri kalanını otomatik kullanır; `BatchedInferencePipeline`
(faster-whisper'ın kendi VAD-tabanlı parçalama+toplu-işleme mekanizması)
ile birlikte bu, elle bir chunk/queue/worker sistemi yazmadan gerçek bir
hızlanma sağlıyor. İsterseniz `.env`'e şu değişkenlerle elle
ayarlayabilirsiniz:
- `TOPLANTI_CPU_THREADS=<sayı>` — varsayılan: `çekirdek_sayısı - 2`.
- `TOPLANTI_BATCH_SIZE=<sayı>` — varsayılan: `8`.
- `TOPLANTI_WHISPER_MODEL=small` (varsayılan `medium`) — doğruluktan
  ödün verip süreyi belirgin şekilde kısaltmak için.

Aynı anda birden fazla kayıt yüklenirse (kazara çift tıklama, birden
fazla kullanıcı), ağır işleme adımı (whisper+pyannote) **kuyruğa alınır**
— aynı anda sadece bir kayıt işlenir, diğerleri sırasını bekler. Bunun
nedeni: iki iş paralel çalışırsa aynı sabit CPU havuzunu paylaşıp ikisi
de birbirini yavaşlatır (gerçek bir kullanımda gözlemlendi).

## Kurulum

1. **HuggingFace hesabı oluşturun** (yoksa): https://huggingface.co/join
2. **Diarization modelinin lisansını kabul edin** — ÜÇ ayrı sayfada
   (`pyannote.audio` 4.x, `speaker-diarization-3.1` pipeline'ını
   yüklerken üçüncüsüne de ihtiyaç duyuyor — gerçek kullanımda
   bulunan bir bağımlılık):
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
   - https://huggingface.co/pyannote/speaker-diarization-community-1

   Her birinde oturum açıp "Agree and access repository" butonuna
   tıklamanız yeterli.
3. **Erişim token'ı oluşturun:**
   - https://huggingface.co/settings/tokens → **"New token"** → "Read"
     yetkisi yeterli.
   - Çıkan token'ı (`hf_...` ile başlar) kopyalayın.
4. Bu repo'yu klonlayın, `setup.bat`'ı çalıştırın — core klasörünün yolunu
   ve az önce aldığınız token'ı soracak (ya da kurulum sonrası Toplantı
   Notları arayüzündeki "⚙ Bağlantı Ayarları"ndan da girebilirsiniz).
5. İlk kayıt/yükleme işleminde whisper ve pyannote model ağırlıkları
   otomatik indirilir (birkaç yüz MB — GB arası, model boyutuna göre) —
   bu tek seferlik bir indirme, sonraki kullanımlarda beklenmez.

## Bağımlılıklar

- `faster-whisper`, `pyannote.audio`, `torch` (CPU) — AGENTS.md Madde 1.1
  gereği core'un paylaşılan container'ına diğer tüm tool'ların
  bağımlılıklarıyla birlikte kurulur. Bu, core container'ın build
  süresini/disk boyutunu belirgin şekilde artırır — bu tool'un doğal bir
  maliyeti, kurulmazsa bu maliyet de oluşmaz.

## Çevrimdışı çalışma (Local First, MANIFESTO Madde 5)

Transkripsiyon (`faster-whisper`) ve konuşmacı ayrımı (`pyannote.audio`)
TAMAMEN yerel çalışır — LLM özet adımı hariç hiçbir işlem dışarıya veri
göndermez. Model ağırlıkları `setup.bat`'ın 3. adımında (ya da ilk gerçek
kullanımda, ağırlıklar henüz inmediyse) bir kez internetten indirilir;
bu indirmeden SONRA sistem internetsiz de çalışır — model yükleme kodu
önce çevrimiçi dener, başarısız olursa (internet yoksa) otomatik olarak
yerel önbellekten (`HF_HUB_OFFLINE`) devam eder, elle bir ayar
değiştirmenize gerek yoktur. LLM özet üretimi ise `core/llm.py` üzerinden
gider — varsayılan olarak yerel Ollama, kullanıcı isterse bulut
sağlayıcıya geçebilir (bkz. ana core repo'sundaki `LLM_SAGLAYICILAR.md`).

## Veri depolama

Yüklenen/kaydedilen ham ses dosyası `data/gecici_ses/` altında yalnızca
işleme sürerken tutulur — transkript çıkarıldıktan sonra (başarılı ya da
başarısız fark etmez) otomatik silinir. Kalıcı olarak saklanan tek şey,
kullanıcının onayladığı toplantı notu Markdown dosyasıdır (seçtiği klasöre
yazılır, bu tool'un `data/` klasöründe değil).

## Mimari

`web.py`, `web_analyze`/`web_execute`/`web_rollback`'i (AGENTS.md Madde 3)
expose eder — bu üçü SADECE son adımda (transkript hazır olduktan sonra LLM
özeti üretme + dosyaya yazma + geri alma) devreye girer. Ses yükleme +
arka planda transkripsiyon/diarization akışı, core'un senkron
`/api/analyze` sözleşmesine sığmadığı için kendi `router`'ında yaşar
(AGENTS.md Madde 4.1 — Gmail'in OAuth entegrasyonuyla birebir aynı desen):
`POST /kayit/yukle`, `GET /kayit/durum/{is_id}`, `GET /kayit/sonuc/{is_id}`.

İş (job) durumu bellek-içi tutulur (Gmail'in plan/session store deseniyle
aynı basitlikte) — process yeniden başlarsa yarım kalan bir iş de zaten
anlamını yitirir, kullanıcı yeniden yükler.

## Katkı

Ana core repo'sundaki MANIFESTO.md ve AGENTS.md'yi okuyun. Canlı/anlık
akan transkripsiyon bu tool'un kapsamına **kasıtlı olarak** girmiyor —
v0.1'de "kayıt bitince toplu işle" kararı verildi, çok daha karmaşık bir
streaming STT + canlı diarization mühendisliği gerektirdiği için
ertelendi. Kalıcı konuşmacı kimliği (ses izinden farklı toplantılar arası
eşleştirme) de aynı şekilde bilinçli olarak v0.1 dışında.
