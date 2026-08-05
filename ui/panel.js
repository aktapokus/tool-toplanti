/**
 * tools/toplanti/ui/panel.js
 * Toplantı Notları Tool'un core'a sunduğu UI yüzeyi — AGENTS.md Madde 4 + 4.1
 * sözleşmesi.
 */

const STYLE_ID = 'toplanti-panel-style';
const ACCENT = '#7C3AED';
const ACCENT_DARK = '#5B21B6';
const ACCENT_LIGHT = '#EDE9FE';

// core'un AnalyzeRequest'i sadece {tool, istek, klasor} kabul ediyor — yeni bir
// alan eklenemiyor (AGENTS.md Madde 2, core değişmiyor). Bu yüzden kullanıcının
// serbest metin talimatı ile transkript, TEK bir "istek" string'i içinde bu
// ayırıcıyla birleştirilip gönderiliyor; web.py bunu ayırıyor (bkz. Gmail'in
// "istek metninden sayı ayıklama" deseniyle aynı yaklaşım).
const TALIMAT_AYIRICI = '\n---AKTAPOKUS_TRANSKRIPT---\n';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .toplanti-theme {
      --tp-accent: ${ACCENT}; --tp-accent-dark: ${ACCENT_DARK}; --tp-accent-light: ${ACCENT_LIGHT};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .toplanti-theme .btn-primary { background: var(--tp-accent) !important; border-color: var(--tp-accent) !important; }
    .toplanti-theme .btn-primary:hover { background: var(--tp-accent-dark) !important; }
    .tp-split { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .tp-split-left {
      width: 300px; flex-shrink: 0; border-right: 1px solid var(--border);
      overflow-y: auto; display: flex; flex-direction: column;
    }
    .tp-split-right { flex: 1; min-width: 0; overflow-y: auto; display: flex; flex-direction: column; }
    .toplanti-form { padding: 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .toplanti-kayit-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
    .toplanti-kayit-durum {
      display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-dim);
    }
    .toplanti-kayit-nokta {
      width: 10px; height: 10px; border-radius: 50%; background: #DC2626; display: inline-block;
      animation: toplanti-pulse 1.2s infinite;
    }
    @keyframes toplanti-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .toplanti-veya { font-size: 12px; color: var(--text-xs); margin: 0 4px; }
    .toplanti-sonuc-area { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; }
    .toplanti-durum-kutu {
      padding: 12px 16px; background: var(--tp-accent-light); border: 1px solid var(--tp-accent);
      border-radius: 6px; font-size: 13px; color: var(--tp-accent-dark); margin-bottom: 12px;
    }
    .toplanti-ilerleme-bar-dis { background: #fff; border-radius: 4px; height: 6px; overflow: hidden; margin-top: 8px; }
    .toplanti-ilerleme-bar-ic { background: var(--tp-accent); height: 100%; transition: width 0.5s; }
    .toplanti-gecen-sure { margin-top: 8px; font-size: 11px; color: var(--text-dim, #6B6A63); }
    .toplanti-hata-kutu {
      padding: 12px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px;
      font-size: 13px; color: #B91C1C; margin-bottom: 12px;
    }
    .toplanti-konusmaci-listesi { margin-bottom: 14px; }
    .toplanti-konusmaci-satir { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .toplanti-konusmaci-satir label { font-size: 12px; color: var(--text-dim); width: 90px; flex-shrink: 0; }
    .toplanti-konusmaci-satir input { flex: 1; font-size: 13px; }
    .toplanti-segment { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--surface-2); font-size: 13px; }
    .toplanti-segment-konusmaci { font-weight: 600; color: var(--tp-accent-dark); flex-shrink: 0; min-width: 100px; }
    .toplanti-segment-metin { color: var(--text); line-height: 1.5; }
    .toplanti-transkript-kutu { border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; max-height: 340px; overflow-y: auto; margin-bottom: 14px; }
    .toplanti-ayarlar-toggle {
      display: flex; justify-content: space-between; align-items: center; width: 100%;
      margin: 10px 0 0; padding: 8px 10px; background: var(--surface-2, #F2F1EC);
      border: 1px solid var(--border); border-radius: 6px;
      color: var(--text-dim); font-size: 12px; cursor: pointer;
    }
    .toplanti-ayarlar-toggle:hover { border-color: var(--tp-accent); color: var(--tp-accent-dark); }
    .toplanti-ayarlar-durum { font-size: 11px; color: var(--text-xs); }
    .toplanti-ayarlar-durum.hazir { color: #15803D; font-weight: 500; }
    .toplanti-ayarlar-panel {
      margin-top: 8px; padding: 14px; background: var(--bg-alt, #F7F7F5); border: 1px solid var(--border);
      border-radius: 6px; font-size: 12px; line-height: 1.6;
    }
    .toplanti-ayarlar-baslik { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .toplanti-ayarlar-aciklama { color: var(--text-dim); margin-bottom: 12px; }
    .toplanti-ayarlar-aciklama a { color: var(--tp-accent-dark); }
    .toplanti-key-row { display: flex; gap: 8px; }
    .toplanti-key-row input { flex: 1; }
    .toplanti-tab-row { display: flex; gap: 1px; margin-bottom: 14px; }
    .toplanti-tab {
      font-size: 12px; font-weight: 500; padding: 6px 14px; border: 1px solid var(--border);
      background: var(--bg); color: var(--text-dim); cursor: pointer;
    }
    .toplanti-tab:hover { border-color: var(--tp-accent); color: var(--tp-accent); }
    .toplanti-tab.active { background: var(--tp-accent); border-color: var(--tp-accent); color: #fff; }
    .toplanti-ozet-blok { margin-bottom: 12px; }
    .toplanti-ozet-blok h4 { font-size: 13px; margin: 0 0 6px; color: var(--tp-accent-dark); }
    .toplanti-ozet-blok ul { margin: 0; padding-left: 18px; }
    .toplanti-plan-footer { display: flex; gap: 8px; margin-top: 14px; }
    .toplanti-placeholder { padding: 24px; text-align: center; color: var(--text-xs); font-size: 12px; }
    .toplanti-workflow {
      display: flex; flex-direction: column; align-items: stretch; gap: 2px; margin-top: 14px;
    }
    .toplanti-workflow-node {
      display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box;
      padding: 8px 10px; border: 1px solid var(--border);
      border-radius: 8px; background: var(--bg-alt, #F7F7F5); text-align: left;
    }
    .toplanti-workflow-node-clickable { cursor: pointer; }
    .toplanti-workflow-node-clickable:hover { border-color: var(--tp-accent); background: var(--tp-accent-light); }
    .toplanti-workflow-icon { font-size: 18px; line-height: 1; flex-shrink: 0; }
    .toplanti-workflow-body { min-width: 0; flex: 1; }
    .toplanti-workflow-title { font-size: 11px; font-weight: 600; color: var(--text); }
    .toplanti-workflow-sub { font-size: 10px; color: var(--text-dim); margin-top: 2px; word-break: break-word; }
    .toplanti-workflow-arrow { text-align: center; color: var(--text-xs); font-size: 13px; line-height: 1.4; }
    .toplanti-workflow-hint { font-size: 11px; color: var(--text-xs); text-align: center; margin-top: 6px; }
    .toplanti-workflow-sub select { width: 100%; font-size: 11px; padding: 2px; box-sizing: border-box; }
  `;
  document.head.appendChild(style);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function gecenSureMetni(baslangicMs) {
  const saniye = Math.floor((Date.now() - baslangicMs) / 1000);
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return dk > 0 ? `${dk} dk ${sn} sn` : `${sn} sn`;
}

export function mount(container, api, toolId) {
  ensureStyles();
  container.classList.add('toplanti-theme');

  let mediaRecorder = null;
  let kayitParcalari = [];
  let kayitStream = null;
  let segmentler = [];
  let etiketHaritasi = {};
  let sonPlanId = null;
  let sonKlasor = null;
  let sonTranskriptSuresi = null;
  let sonRaporSuresi = null;
  let durumPollTimer = null;

  container.innerHTML = `
    <div class="tp-split">
      <div class="tp-split-left">
        <div class="toplanti-form">
          <div class="toplanti-kayit-row">
            <button class="btn-primary" id="tpBaslatBtn">● Kaydı Başlat</button>
            <button class="btn-secondary" id="tpDurdurBtn" disabled>■ Kaydı Durdur</button>
          </div>
          <div class="toplanti-kayit-row">
            <span class="toplanti-kayit-durum" id="tpKayitDurum"></span>
          </div>
          <div class="toplanti-kayit-row">
            <span class="toplanti-veya">veya dosya yükle:</span>
            <input type="file" id="tpDosyaSec" accept="audio/*">
          </div>
          <div class="field-block">
            <label class="field-label">// İstek — rapor nasıl olsun? (opsiyonel)</label>
            <textarea id="tpTalimat" rows="4" placeholder="Rapor nasıl olsun?">Resmi bir toplantı tutanağı formatında yaz, sadece aksiyon maddelerine odaklan, kısa ve net yaz</textarea>
          </div>
          <button class="toplanti-ayarlar-toggle" id="tpAyarlarToggle">
            <span>⚙ Konuşmacı Ayrımı Bağlantısı</span>
            <span class="toplanti-ayarlar-durum" id="tpAyarlarDurum">kontrol ediliyor…</span>
          </button>
          <div class="toplanti-ayarlar-panel" id="tpAyarlarPanel" style="display:none">
            <div class="toplanti-ayarlar-baslik">HuggingFace Erişim Token'ı</div>
            <p class="toplanti-ayarlar-aciklama">
              Konuşmacı ayrımı (kim ne zaman konuştu) bir kerelik kurulum gerektiriyor:
              HuggingFace hesabınızla <a href="https://huggingface.co/pyannote/speaker-diarization-3.1" target="_blank">3 model sayfasında</a>
              lisansı kabul edip <a href="https://huggingface.co/settings/tokens" target="_blank">bir erişim token'ı</a> oluşturun — adımlar README.md'de.
            </p>
            <div class="toplanti-key-row">
              <input type="text" id="tpHfTokenInput" placeholder="hf_...">
              <button class="btn-primary" id="tpHfTokenKaydetBtn">Kaydet</button>
            </div>
            <div id="tpHfTokenSonuc" style="margin-top:8px"></div>
          </div>

          <div class="toplanti-workflow" id="tpWorkflow">
            <div class="toplanti-workflow-node">
              <div class="toplanti-workflow-icon">🎙</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">Ses Girişi</div>
                <div class="toplanti-workflow-sub">Kayıt / Dosya</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node toplanti-workflow-node-clickable" id="tpWfStt">
              <div class="toplanti-workflow-icon">📝</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">Transkripsiyon</div>
                <div class="toplanti-workflow-sub" id="tpWfSttSub">…</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node toplanti-workflow-node-clickable" id="tpWfKonusmaci">
              <div class="toplanti-workflow-icon">🗣</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">Konuşmacı Ayrımı</div>
                <div class="toplanti-workflow-sub" id="tpWfKonusmaciSub">…</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node toplanti-workflow-node-clickable" id="tpWfRapor">
              <div class="toplanti-workflow-icon">📄</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">Rapor Oluştur</div>
                <div class="toplanti-workflow-sub" id="tpWfRaporSub">…</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node">
              <div class="toplanti-workflow-icon">✅</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">Çıktı</div>
                <div class="toplanti-workflow-sub">Özet + PDCA</div>
              </div>
            </div>
          </div>
          <div class="toplanti-workflow-hint">Düğüme tıkla, modeli değiştir</div>
        </div>
      </div>
      <div class="tp-split-right">
        <div class="toplanti-sonuc-area" id="tpSonucArea">
          <div class="toplanti-placeholder">// Kayıt yapın ya da bir ses dosyası yükleyin</div>
        </div>
      </div>
    </div>
  `;

  const durumEl = container.querySelector('#tpKayitDurum');
  const sonucArea = container.querySelector('#tpSonucArea');
  const baslatBtn = container.querySelector('#tpBaslatBtn');
  const durdurBtn = container.querySelector('#tpDurdurBtn');
  const dosyaSec = container.querySelector('#tpDosyaSec');
  const talimatEl = container.querySelector('#tpTalimat');

  async function ayarlarDurumGoster() {
    const durumEl = container.querySelector('#tpAyarlarDurum');
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/settings/hf-token`);
      const d = await r.json();
      durumEl.textContent = d.yapilandirilmis ? '✓ hazır' : 'kurulum gerekli';
      durumEl.classList.toggle('hazir', !!d.yapilandirilmis);
    } catch (e) {
      durumEl.textContent = '';
    }
  }
  ayarlarDurumGoster();

  container.querySelector('#tpAyarlarToggle').onclick = () => {
    const panel = container.querySelector('#tpAyarlarPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  container.querySelector('#tpHfTokenKaydetBtn').onclick = async () => {
    const token = container.querySelector('#tpHfTokenInput').value.trim();
    const sonucEl = container.querySelector('#tpHfTokenSonuc');
    if (!token) { sonucEl.innerHTML = '<span style="color:#B91C1C">Token boş olamaz.</span>'; return; }
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/settings/hf-token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      sonucEl.innerHTML = (r.ok && d.basarili)
        ? '<span style="color:#15803D">✓ Kaydedildi.</span>'
        : `<span style="color:#B91C1C">${esc(d.detail || 'Kaydedilemedi.')}</span>`;
      if (r.ok && d.basarili) ayarlarDurumGoster();
    } catch (e) {
      sonucEl.innerHTML = `<span style="color:#B91C1C">Bağlantı hatası: ${esc(e.message)}</span>`;
    }
  };

  // ── Model seçimi workflow diyagramı — core'un birleşik registry'sinden
  // (models.json, /settings) STT (transkripsiyon) ve rapor modeli seçimi.
  // Düğüme tıklayınca etiket yerine bir <select> açılır, seçim değişince
  // hemen kaydedilir — ayrı bir "Kaydet" butonu yok.
  let modelTercihVerisi = null;
  let konusmaciAyrimiAcik = true;

  function saglayiciRozeti(provider) {
    return provider === 'ollama' ? '💻 Yerel' : '☁ Bulut';
  }

  function sttEtiket() {
    if (!modelTercihVerisi) return '…';
    if (modelTercihVerisi.stt_secili === 'yerel' || !modelTercihVerisi.stt_secili) {
      return '💻 Yerel (whisper+pyannote)';
    }
    const girdi = modelTercihVerisi.ses_modelleri.find(m => m.id === modelTercihVerisi.stt_secili);
    return girdi ? `${saglayiciRozeti(girdi.provider)} ${girdi.id}` : modelTercihVerisi.stt_secili;
  }

  function raporEtiket() {
    if (!modelTercihVerisi) return '…';
    if (!modelTercihVerisi.rapor_secili) return '⚙ Varsayılan (admin panel modeli)';
    const girdi = modelTercihVerisi.metin_modelleri.find(m => m.id === modelTercihVerisi.rapor_secili);
    return girdi ? `${saglayiciRozeti(girdi.provider)} ${girdi.id}` : modelTercihVerisi.rapor_secili;
  }

  function workflowGoster() {
    container.querySelector('#tpWfSttSub').textContent = sttEtiket();
    container.querySelector('#tpWfRaporSub').textContent = raporEtiket();
    container.querySelector('#tpWfKonusmaciSub').textContent = konusmaciAyrimiAcik ? '✓ Açık' : '✕ Kapalı (daha hızlı)';
  }

  async function modelTercihYukle() {
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/model-tercihi`);
      modelTercihVerisi = await r.json();
    } catch (e) {
      modelTercihVerisi = { stt_secili: 'yerel', rapor_secili: '', ses_modelleri: [], metin_modelleri: [] };
    }
    try {
      const r2 = await api.apiFetch(`/api/tools/${toolId}/ayarlar/konusmaci-ayrimi`);
      konusmaciAyrimiAcik = (await r2.json()).acik !== false;
    } catch (e) {
      konusmaciAyrimiAcik = true;
    }
    workflowGoster();
  }

  async function modelTercihKaydet(alan, deger) {
    await api.apiFetch(`/api/tools/${toolId}/model-tercihi`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [alan]: deger }),
    });
    await modelTercihYukle();
  }

  container.querySelector('#tpWfKonusmaci').onclick = () => {
    const sub = container.querySelector('#tpWfKonusmaciSub');
    if (sub.querySelector('select')) return;
    sub.innerHTML = `
      <select>
        <option value="acik" ${konusmaciAyrimiAcik ? 'selected' : ''}>✓ Açık</option>
        <option value="kapali" ${!konusmaciAyrimiAcik ? 'selected' : ''}>✕ Kapalı (daha hızlı, "kim konuştu" bilgisi olmaz)</option>
      </select>`;
    const select = sub.querySelector('select');
    select.onclick = (e) => e.stopPropagation();
    select.onchange = async (e) => {
      e.stopPropagation();
      await api.apiFetch(`/api/tools/${toolId}/ayarlar/konusmaci-ayrimi`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acik: select.value === 'acik' }),
      });
      await modelTercihYukle();
    };
  };

  container.querySelector('#tpWfStt').onclick = () => {
    const sub = container.querySelector('#tpWfSttSub');
    if (sub.querySelector('select')) return;
    const secenekler = [`<option value="yerel">💻 Yerel (whisper+pyannote)</option>`]
      .concat((modelTercihVerisi.ses_modelleri || []).map(m =>
        `<option value="${esc(m.id)}" ${m.id === modelTercihVerisi.stt_secili ? 'selected' : ''}>${saglayiciRozeti(m.provider)} ${esc(m.id)}</option>`
      ));
    sub.innerHTML = `<select>${secenekler.join('')}</select>`;
    const select = sub.querySelector('select');
    select.value = modelTercihVerisi.stt_secili || 'yerel';
    select.onclick = (e) => e.stopPropagation();
    select.onchange = (e) => { e.stopPropagation(); modelTercihKaydet('stt', select.value); };
  };

  container.querySelector('#tpWfRapor').onclick = () => {
    const sub = container.querySelector('#tpWfRaporSub');
    if (sub.querySelector('select')) return;
    const secenekler = [`<option value="">⚙ Varsayılan (admin panel modeli)</option>`]
      .concat((modelTercihVerisi.metin_modelleri || []).map(m =>
        `<option value="${esc(m.id)}" ${m.id === modelTercihVerisi.rapor_secili ? 'selected' : ''}>${saglayiciRozeti(m.provider)} ${esc(m.id)}</option>`
      ));
    sub.innerHTML = `<select>${secenekler.join('')}</select>`;
    const select = sub.querySelector('select');
    select.value = modelTercihVerisi.rapor_secili || '';
    select.onclick = (e) => e.stopPropagation();
    select.onchange = (e) => { e.stopPropagation(); modelTercihKaydet('rapor', select.value); };
  };

  modelTercihYukle();

  baslatBtn.onclick = async () => {
    try {
      kayitStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      api.gosterfeedback('Mikrofona erişilemedi: ' + e.message, 'err');
      return;
    }
    kayitParcalari = [];
    mediaRecorder = new MediaRecorder(kayitStream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) kayitParcalari.push(e.data); };
    mediaRecorder.onstop = () => {
      kayitStream.getTracks().forEach(t => t.stop());
      const blob = new Blob(kayitParcalari, { type: mediaRecorder.mimeType || 'audio/webm' });
      yukleVeIsle(blob, 'kayit.webm');
    };
    mediaRecorder.start();
    baslatBtn.disabled = true;
    durdurBtn.disabled = false;
    dosyaSec.disabled = true;
    durumEl.innerHTML = '<span class="toplanti-kayit-nokta"></span> Kayıt sürüyor…';
  };

  durdurBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    baslatBtn.disabled = false;
    durdurBtn.disabled = true;
    dosyaSec.disabled = false;
    durumEl.textContent = '';
  };

  dosyaSec.onchange = () => {
    const dosya = dosyaSec.files[0];
    if (dosya) yukleVeIsle(dosya, dosya.name);
  };

  // Sayfa yenilenince (ya da başka bir tool'a geçip geri dönünce) devam eden
  // bir iş varsa kaybolmasın diye is_id + başlangıç zamanı localStorage'da
  // tutuluyor — sunucu tarafındaki iş zaten bağımsız çalışıyor (bkz.
  // __init__.py'deki is_baslat), burada sadece İSTEMCİ tarafının o işi
  // yeniden bulup poll etmeye devam etmesi sağlanıyor.
  const KAYIT_IZLEME_ANAHTARI = `toplanti_${toolId}_aktif_kayit`;

  function kayitIzlemeKaydet(is_id, baslangicZamani) {
    try { localStorage.setItem(KAYIT_IZLEME_ANAHTARI, JSON.stringify({ is_id, baslangicZamani })); } catch (e) {}
  }
  function kayitIzlemeTemizle() {
    try { localStorage.removeItem(KAYIT_IZLEME_ANAHTARI); } catch (e) {}
  }

  const KAYIT_ASAMA_METNI = {
    baslatiliyor: 'Başlatılıyor…',
    sirada_bekliyor: 'Kuyrukta bekliyor — başka bir kayıt şu an işleniyor…',
    model_yukleniyor: 'Model yükleniyor (ilk kullanımda ağırlıklar indiriliyor olabilir)…',
    transkripsiyon: 'Transkripsiyon yapılıyor',
    konusmaci_ayrimi: 'Konuşmacı ayrımı yapılıyor (bu adımda tam yüzde hesaplanamıyor, uzun kayıtlarda biraz sürebilir)…',
    hizalaniyor: 'Sonuçlar hizalanıyor…',
    tamamlaniyor: 'Tamamlanıyor…',
  };

  function kayitAsamaMetni(asama) {
    if (KAYIT_ASAMA_METNI[asama]) return KAYIT_ASAMA_METNI[asama];
    const parcaEslesme = /^bulut_transkripsiyon_parca_(\d+)\/(\d+)$/.exec(asama || '');
    if (parcaEslesme) return `Bulut transkripsiyon — parça ${parcaEslesme[1]}/${parcaEslesme[2]}`;
    return 'İşleniyor…';
  }

  function kayitIzlemeBaslat(is_id, baslangicZamani) {
    function ilerlemeGoster(d) {
      const yuzde = typeof d.yuzde === 'number' ? Math.round(d.yuzde) : null;
      const metin = kayitAsamaMetni(d.asama);
      const barHtml = (yuzde !== null)
        ? `<div class="toplanti-ilerleme-bar-dis"><div class="toplanti-ilerleme-bar-ic" style="width:${yuzde}%"></div></div>`
        : '';
      sonucArea.innerHTML = `<div class="toplanti-durum-kutu">${esc(metin)}${yuzde !== null ? ' — %' + yuzde : ''}${barHtml}<div class="toplanti-gecen-sure">Geçen süre: ${gecenSureMetni(baslangicZamani)}</div></div>`;
    }

    ilerlemeGoster({ asama: 'baslatiliyor', yuzde: 0 });
    const sureTimer = setInterval(() => {
      const el = sonucArea.querySelector('.toplanti-gecen-sure');
      if (el) el.textContent = `Geçen süre: ${gecenSureMetni(baslangicZamani)}`;
      else clearInterval(sureTimer);
    }, 1000);
    if (durumPollTimer) clearInterval(durumPollTimer);
    durumPollTimer = setInterval(async () => {
      try {
        const r = await api.apiFetch(`/api/tools/${toolId}/kayit/durum/${is_id}`);
        const d = await r.json();
        if (d.durum === 'tamam') {
          clearInterval(durumPollTimer);
          kayitIzlemeTemizle();
          sonTranskriptSuresi = gecenSureMetni(baslangicZamani);
          api.log(`Transkripsiyon tamamlandı — süre: ${sonTranskriptSuresi}.`, 'ok', true);
          const rs = await api.apiFetch(`/api/tools/${toolId}/kayit/sonuc/${is_id}`);
          const ds = await rs.json();
          segmentler = ds.segmentler || [];
          etiketHaritasi = {};
          renderTranskript();
        } else if (d.durum === 'hata') {
          clearInterval(durumPollTimer);
          kayitIzlemeTemizle();
          sonucArea.innerHTML = `<div class="toplanti-hata-kutu">İşleme hatası: ${esc(d.hata || 'bilinmeyen hata')}</div>`;
        } else if (d.durum === 'bulunamadi') {
          clearInterval(durumPollTimer);
          kayitIzlemeTemizle();
          sonucArea.innerHTML = '<div class="toplanti-hata-kutu">İş bulunamadı.</div>';
        } else {
          ilerlemeGoster(d);
        }
      } catch (e) {
        // geçici ağ hatası — bir sonraki pollde tekrar dener
      }
    }, 3000);
  }

  async function yukleVeIsle(blobOrFile, dosyaAdi) {
    sonucArea.innerHTML = '<div class="toplanti-durum-kutu">Ses dosyası yükleniyor…</div>';
    const formData = new FormData();
    formData.append('dosya', blobOrFile, dosyaAdi);
    let is_id;
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/kayit/yukle`, { method: 'POST', body: formData });
      const d = await r.json();
      if (!r.ok) { sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(d.detail || 'Yükleme başarısız.')}</div>`; return; }
      is_id = d.is_id;
    } catch (e) {
      sonucArea.innerHTML = `<div class="toplanti-hata-kutu">Bağlantı hatası: ${esc(e.message)}</div>`;
      return;
    }

    const baslangicZamani = Date.now();
    kayitIzlemeKaydet(is_id, baslangicZamani);
    kayitIzlemeBaslat(is_id, baslangicZamani);
  }

  // Mount olurken yarım kalmış bir iş var mı diye bak — varsa kaldığı
  // yerden (gerçek başlangıç zamanıyla) izlemeye devam et.
  (function kayitIzlemeDevamEttir() {
    try {
      const ham = localStorage.getItem(KAYIT_IZLEME_ANAHTARI);
      if (!ham) return;
      const { is_id, baslangicZamani } = JSON.parse(ham);
      if (!is_id) return;
      kayitIzlemeBaslat(is_id, baslangicZamani);
    } catch (e) {}
  })();

  function benzersizKonusmacilar() {
    return [...new Set(segmentler.map(s => s.konusmaci))];
  }

  function renderTranskript() {
    const konusmacilar = benzersizKonusmacilar();
    sonucArea.innerHTML = `
      ${sonTranskriptSuresi ? `<div class="toplanti-gecen-sure" style="margin-bottom:10px">Transkripsiyon süresi: ${esc(sonTranskriptSuresi)}</div>` : ''}
      <div class="toplanti-konusmaci-listesi" id="tpKonusmaciListesi">
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">İstersen konuşmacı adlarını değiştir:</div>
        ${konusmacilar.map(k => `
          <div class="toplanti-konusmaci-satir">
            <label>${esc(k)}</label>
            <input type="text" data-orijinal="${esc(k)}" value="${esc(k)}">
          </div>
        `).join('')}
      </div>
      <div class="toplanti-transkript-kutu" id="tpTranskriptKutu"></div>
      <div class="btn-row">
        <button class="btn-primary" id="tpNotOlusturBtn">📝 Not Oluştur</button>
        <button class="btn-secondary" id="tpTranskriptKaydetBtn">💾 Transkripti Kaydet</button>
        <button class="btn-secondary" id="tpPromptKopyalaBtn">📋 Harici LLM İçin Prompt Kopyala</button>
      </div>
      <div id="tpTranskriptEkstraSonuc" style="margin-top:8px"></div>
    `;

    container.querySelectorAll('#tpKonusmaciListesi input').forEach(inp => {
      inp.oninput = () => {
        etiketHaritasi[inp.dataset.orijinal] = inp.value.trim() || inp.dataset.orijinal;
        renderSegmentler();
      };
    });

    renderSegmentler();

    container.querySelector('#tpNotOlusturBtn').onclick = notOlustur;

    // ── Rapor üretmeden SADECE ham transkripti kaydet — API'ye/rate
    // limit'e hiç bağımlı kalmadan da bir çıktı elde etmek isteyenler için.
    container.querySelector('#tpTranskriptKaydetBtn').onclick = async () => {
      const sonucEl = container.querySelector('#tpTranskriptEkstraSonuc');
      const klasor = await api.pickFolder();
      if (!klasor) return;
      try {
        const r = await api.apiFetch(`/api/tools/${toolId}/transkript/kaydet`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transkript: transkriptMetniOlustur(), klasor }),
        });
        const d = await r.json();
        if (r.ok) {
          sonucEl.innerHTML = `<span style="color:#15803D">✓ Transkript kaydedildi: ${esc(d.dosya_yolu)}</span>`;
        } else {
          sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(d.detail || 'Kaydedilemedi.')}</span>`;
        }
      } catch (e) {
        sonucEl.innerHTML = `<span style="color:#B91C1C">Bağlantı hatası: ${esc(e.message)}</span>`;
      }
    };

    // ── Kendi ChatGPT/Claude/Gemini hesabınıza yapıştırıp raporu ORADA
    // ürettirebilmeniz için — hiçbir API/model bağımlılığı olmadan da
    // esnek kalınsın diye. Panoya kopyalar, kaydetmez/göndermez.
    container.querySelector('#tpPromptKopyalaBtn').onclick = async () => {
      const sonucEl = container.querySelector('#tpTranskriptEkstraSonuc');
      const prompt = `Aşağıdaki toplantı transkriptini oku ve Türkçe bir toplantı raporu hazırla. Rapor şu başlıkları içersin:

ÖNEMLİ BİÇİM KURALI: Hiçbir bölümde düz yazı/paragraf kullanma — her şey
madde işaretli liste ya da tablo olsun, anlatı tarzı cümleler yazma.

## Özet
Düz yazı DEĞİL — 3-5 maddelik kısa liste halinde genel özet.

## Gündem Maddeleri
Görüşmede geçen ana konu başlıkları, liste halinde.

## Alınan Kararlar
Tekilleştirilmiş, netleşmiş kararlar, liste halinde.

## Aksiyon Maddeleri — Excel'e yapıştırılabilir tablo
Bunu bir kod bloğu içinde, NOKTALI VİRGÜLLE ayrılmış CSV formatında ver
(Türkçe Excel noktalı virgülü ayraç olarak kullanır, doğrudan yapıştırınca
sütunlara ayrılsın diye). İlk satır başlık olsun:
\`\`\`
Aksiyon;Sorumlu;Termin;Öncelik
...
\`\`\`
Sorumlu belirtilmemişse "Atanmamış", termin belirtilmemişse "Açık" yaz.
Öncelik sütununa Yüksek/Orta/Düşük değerlerinden birini yaz.

## Belirsiz Noktalar
Netleşmemiş, çelişkili ya da yarım kalan konular, liste halinde.

## PDCA (sadece görüşme bir süreç/proje takibiyse)
Plan / Do / Check / Act başlıkları altında MADDE LİSTESİ olarak özetle —
görüşme buna uymuyorsa bu bölümü tamamen atla.

Kurallar: transkriptte GEÇMEYEN hiçbir bilgi uydurma, sadece gerçekten
söylenenleri yansıt.

---
TRANSKRİPT:
${transkriptMetniOlustur()}
---`;
      try {
        await navigator.clipboard.writeText(prompt);
        sonucEl.innerHTML = '<span style="color:#15803D">✓ Prompt panoya kopyalandı — istediğiniz LLM sohbetine yapıştırabilirsiniz.</span>';
      } catch (e) {
        sonucEl.innerHTML = `<span style="color:#B91C1C">Panoya kopyalanamadı: ${esc(e.message)}</span>`;
      }
    };
  }

  function etiket(konusmaci) {
    return etiketHaritasi[konusmaci] || konusmaci;
  }

  function renderSegmentler() {
    const kutu = container.querySelector('#tpTranskriptKutu');
    kutu.innerHTML = segmentler.map(s => `
      <div class="toplanti-segment">
        <span class="toplanti-segment-konusmaci">${esc(etiket(s.konusmaci))}:</span>
        <span class="toplanti-segment-metin">${esc(s.metin)}</span>
      </div>
    `).join('');
  }

  function raporAsamaMetni(asama) {
    if (!asama || asama === 'basliyor') return 'Başlatılıyor…';
    if (asama === 'nihai_rapor_hazirlaniyor') return 'Nihai rapor hazırlanıyor…';
    const bolumEslesme = /^bolum_(\d+)_(isleniyor|tamam)$/.exec(asama);
    if (bolumEslesme) return `Bölüm ${bolumEslesme[1]} işleniyor…`;
    return 'İşleniyor…';
  }

  // Aynı sayfa-hayatta-kalma deseni rapor işi için de — bkz. yukarıdaki
  // KAYIT_IZLEME_ANAHTARI notu. Not: sayfa yenilenirse `segmentler` (Tam
  // Transkript sekmesi için) kaybolur, bu bilinçli bir sınırlama — asıl
  // rapor sonucu yine de eksiksiz gösterilir, sadece transkript sekmesi
  // yenilemeden önce yeniden yüklenmiş olmalı.
  const RAPOR_IZLEME_ANAHTARI = `toplanti_${toolId}_aktif_rapor`;

  function raporIzlemeKaydet(is_id, baslangicZamani, klasor) {
    try { localStorage.setItem(RAPOR_IZLEME_ANAHTARI, JSON.stringify({ is_id, baslangicZamani, klasor })); } catch (e) {}
  }
  function raporIzlemeTemizle() {
    try { localStorage.removeItem(RAPOR_IZLEME_ANAHTARI); } catch (e) {}
  }

  function raporIzlemeBaslat(is_id, baslangicZamani, klasor) {
    sonKlasor = klasor;

    function ilerlemeGoster(d) {
      const yuzde = typeof d.yuzde === 'number' ? Math.round(d.yuzde) : null;
      const barHtml = (yuzde !== null)
        ? `<div class="toplanti-ilerleme-bar-dis"><div class="toplanti-ilerleme-bar-ic" style="width:${yuzde}%"></div></div>`
        : '';
      sonucArea.innerHTML = `<div class="toplanti-durum-kutu">${esc(raporAsamaMetni(d.asama))}${yuzde !== null ? ' — %' + yuzde : ''}${barHtml}<div class="toplanti-gecen-sure">Geçen süre: ${gecenSureMetni(baslangicZamani)}</div></div>`;
    }

    ilerlemeGoster({ asama: 'basliyor', yuzde: 0 });
    const raporSureTimer = setInterval(() => {
      const el = sonucArea.querySelector('.toplanti-gecen-sure');
      if (el) el.textContent = `Geçen süre: ${gecenSureMetni(baslangicZamani)}`;
      else clearInterval(raporSureTimer);
    }, 1000);
    return new Promise((resolve) => {
      const timer = setInterval(async () => {
        try {
          const r = await api.apiFetch(`/api/tools/${toolId}/rapor/durum/${is_id}`);
          const d = await r.json();
          if (d.durum === 'tamam') {
            clearInterval(timer);
            raporIzlemeTemizle();
            sonRaporSuresi = gecenSureMetni(baslangicZamani);
            api.log(`Rapor oluşturuldu — süre: ${sonRaporSuresi}.`, 'ok', true);
            const rs = await api.apiFetch(`/api/tools/${toolId}/rapor/sonuc/${is_id}`);
            const ds = await rs.json();
            sonPlanId = ds.plan_id;
            renderPlan(ds);
            resolve();
          } else if (d.durum === 'hata') {
            clearInterval(timer);
            raporIzlemeTemizle();
            sonucArea.innerHTML = `<div class="toplanti-hata-kutu">Rapor üretimi hatası: ${esc(d.hata || 'bilinmeyen hata')}</div>`;
            resolve();
          } else if (d.durum === 'bulunamadi') {
            clearInterval(timer);
            raporIzlemeTemizle();
            sonucArea.innerHTML = '<div class="toplanti-hata-kutu">İş bulunamadı.</div>';
            resolve();
          } else {
            ilerlemeGoster(d);
          }
        } catch (e) {
          // geçici ağ hatası — bir sonraki pollde tekrar dener
        }
      }, 3000);
    });
  }

  function transkriptMetniOlustur() {
    return segmentler.map(s => `${etiket(s.konusmaci)}: ${s.metin}`).join('\n');
  }

  async function raporUret(transkriptMetni, talimat, klasor) {
    // Core'un AnalyzeRequest'i sadece istek/klasor kabul ediyor — talimat +
    // transkript TEK bir string'de birleştirilip gönderiliyor, web.py bunu ayırıyor.
    const istekMetni = talimat ? `${talimat}${TALIMAT_AYIRICI}${transkriptMetni}` : transkriptMetni;

    let is_id;
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/rapor/baslat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ istek: istekMetni, klasor }),
      });
      const d = await r.json();
      if (!r.ok) { api.gosterfeedback('Rapor başlatılamadı: ' + (d.detail || 'bilinmeyen hata'), 'err'); return; }
      is_id = d.is_id;
    } catch (e) {
      api.gosterfeedback('Bağlantı hatası: ' + e.message, 'err');
      return;
    }

    const baslangicZamani = Date.now();
    raporIzlemeKaydet(is_id, baslangicZamani, klasor);
    await raporIzlemeBaslat(is_id, baslangicZamani, klasor);
  }

  async function notOlustur() {
    const klasor = await api.pickFolder();
    if (!klasor) return;
    await raporUret(transkriptMetniOlustur(), talimatEl.value.trim(), klasor);
  }

  // Mount olurken yarım kalmış bir rapor işi var mı diye bak.
  (function raporIzlemeDevamEttir() {
    try {
      const ham = localStorage.getItem(RAPOR_IZLEME_ANAHTARI);
      if (!ham) return;
      const { is_id, baslangicZamani, klasor } = JSON.parse(ham);
      if (!is_id) return;
      raporIzlemeBaslat(is_id, baslangicZamani, klasor);
    } catch (e) {}
  })();

  function renderPlan(d) {
    const liste = (arr) => (arr && arr.length) ? `<ul>${arr.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : '<div style="color:var(--text-xs)">(yok)</div>';
    const transkriptHtml = segmentler.map(s => `
      <div class="toplanti-segment">
        <span class="toplanti-segment-konusmaci">${esc(etiket(s.konusmaci))}:</span>
        <span class="toplanti-segment-metin">${esc(s.metin)}</span>
      </div>
    `).join('');

    let raporMarkdownGuncel = d.rapor_markdown || '';

    sonucArea.innerHTML = `
      <div class="toplanti-durum-kutu">${esc(d.aciklama)}</div>
      ${sonRaporSuresi ? `<div class="toplanti-gecen-sure" style="margin-bottom:10px">Rapor oluşturma süresi: ${esc(sonRaporSuresi)}${sonTranskriptSuresi ? ` (transkripsiyon: ${esc(sonTranskriptSuresi)})` : ''}</div>` : ''}
      <div class="toplanti-tab-row">
        <button class="toplanti-tab active" data-sekme="rapor">Rapor</button>
        <button class="toplanti-tab" data-sekme="transkript">Tam Transkript</button>
      </div>
      <div id="tpSekmeRapor"></div>
      <div id="tpSekmeTranskript" class="toplanti-transkript-kutu" style="display:none">${transkriptHtml}</div>
      <div class="toplanti-plan-footer">
        <button class="btn-primary" id="tpKaydetBtn">✓ Kaydet (${esc(d.onerilen_dosya_adi)})</button>
        <button class="btn-secondary" id="tpDuzenleBtn">✏ Düzenle</button>
        <button class="btn-secondary" id="tpYenidenOlusturBtn">🔄 Yeniden Oluştur</button>
        <button class="btn-secondary" id="tpIptalBtn">İptal</button>
      </div>
    `;

    function raporGoster() {
      container.querySelector('#tpSekmeRapor').innerHTML = `
        <div class="toplanti-ozet-blok"><h4>Özet</h4><div>${esc(d.ozet_onizleme)}</div></div>
        <div class="toplanti-ozet-blok"><h4>Gündem Maddeleri</h4>${liste(d.gundem_maddeleri)}</div>
        <div class="toplanti-ozet-blok"><h4>Alınan Kararlar</h4>${liste(d.alinan_kararlar)}</div>
        <div class="toplanti-ozet-blok"><h4>Aksiyon Maddeleri</h4>${liste(d.aksiyon_maddeleri)}</div>
        ${d.pdca ? `
        <div class="toplanti-ozet-blok"><h4>PDCA</h4>
          <div style="margin-bottom:6px"><strong>Plan</strong>${liste(d.pdca.plan)}</div>
          <div style="margin-bottom:6px"><strong>Do</strong>${liste(d.pdca.do)}</div>
          <div style="margin-bottom:6px"><strong>Check</strong>${liste(d.pdca.check)}</div>
          <div><strong>Act</strong>${liste(d.pdca.act)}</div>
        </div>` : ''}
        ${(d.belirsiz_noktalar && d.belirsiz_noktalar.length) ? `
        <div class="toplanti-ozet-blok"><h4>Belirsiz Noktalar</h4>${liste(d.belirsiz_noktalar)}</div>` : ''}
        ${(d.filtrelenen_konu_disi && d.filtrelenen_konu_disi.length) ? `
        <div class="toplanti-ozet-blok"><h4>Filtrelenen Konu Dışı İçerik</h4>${liste(d.filtrelenen_konu_disi)}</div>` : ''}
      `;
    }

    function raporDuzenleGoster() {
      container.querySelector('#tpSekmeRapor').innerHTML = `
        <div class="field-block">
          <label class="field-label">// Rapor metni — düzenleyin (yazım hatası, atlanmış nokta vb.)</label>
          <textarea id="tpRaporDuzenleAlani" rows="16" style="font-family:inherit;font-size:13px">${esc(raporMarkdownGuncel)}</textarea>
        </div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn-primary" id="tpRaporKaydetDuzenleBtn">💾 Değişiklikleri Kaydet</button>
          <button class="btn-secondary" id="tpRaporVazgecBtn">Vazgeç</button>
        </div>
        <div id="tpRaporDuzenleSonuc" style="margin-top:8px"></div>
      `;
      container.querySelector('#tpRaporVazgecBtn').onclick = () => raporGoster();
      container.querySelector('#tpRaporKaydetDuzenleBtn').onclick = async () => {
        const yeniMetin = container.querySelector('#tpRaporDuzenleAlani').value;
        const sonucEl = container.querySelector('#tpRaporDuzenleSonuc');
        try {
          const r = await api.apiFetch(`/api/tools/${toolId}/rapor/duzenle`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: sonPlanId, rapor_markdown: yeniMetin }),
          });
          const dd = await r.json();
          if (r.ok && dd.basarili) {
            raporMarkdownGuncel = yeniMetin;
            sonucEl.innerHTML = '<span style="color:#15803D">✓ Değişiklikler kaydedildi.</span>';
          } else {
            sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(dd.detail || 'Kaydedilemedi.')}</span>`;
          }
        } catch (e) {
          sonucEl.innerHTML = `<span style="color:#B91C1C">Bağlantı hatası: ${esc(e.message)}</span>`;
        }
      };
    }

    raporGoster();

    container.querySelectorAll('.toplanti-tab').forEach(btn => {
      btn.onclick = () => {
        container.querySelectorAll('.toplanti-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const raporSekme = btn.dataset.sekme === 'rapor';
        container.querySelector('#tpSekmeRapor').style.display = raporSekme ? 'block' : 'none';
        container.querySelector('#tpSekmeTranskript').style.display = raporSekme ? 'none' : 'block';
      };
    });
    container.querySelector('#tpDuzenleBtn').onclick = () => {
      container.querySelectorAll('.toplanti-tab')[0].click();
      raporDuzenleGoster();
    };
    container.querySelector('#tpYenidenOlusturBtn').onclick = async () => {
      await raporUret(transkriptMetniOlustur(), talimatEl.value.trim(), sonKlasor);
    };
    container.querySelector('#tpIptalBtn').onclick = () => renderTranskript();
    container.querySelector('#tpKaydetBtn').onclick = async () => {
      const dd = await api.execute(toolId, sonPlanId, null);
      if (dd.hata || dd.detail) { api.gosterfeedback('Kaydetme başarısız: ' + (dd.detail || dd.hata), 'err'); return; }
      sonucArea.innerHTML = `
        <div class="toplanti-durum-kutu">✓ Not kaydedildi: ${esc(dd.dosya_yolu)}${dd.dosya_yolu_html ? `<br>✓ Stilize HTML: ${esc(dd.dosya_yolu_html)}` : ''}${dd.dosya_yolu_pdf ? `<br>✓ PDF: ${esc(dd.dosya_yolu_pdf)}` : ''}${dd.dosya_yolu_xlsx ? `<br>✓ Excel: ${esc(dd.dosya_yolu_xlsx)}` : ''}</div>
        <button class="btn-danger" id="tpGeriAlBtn">↩ Geri Al</button>
      `;
      container.querySelector('#tpGeriAlBtn').onclick = async () => {
        if (!confirm('Kaydedilen not dosyası silinsin mi?')) return;
        await api.rollback(toolId, sonKlasor, api.lastSessionId());
        sonucArea.innerHTML = '<div class="toplanti-placeholder">// Kayıt yapın ya da bir ses dosyası yükleyin</div>';
      };
    };
  }
}

export function unmount(container) {
  container.classList.remove('toplanti-theme');
  container.innerHTML = '';
}
