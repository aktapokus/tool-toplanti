/**
 * tools/toplanti/ui/panel.js
 * Toplantı Notları Tool'un core'a sunduğu UI yüzeyi — AGENTS.md Madde 4 + 4.1
 * sözleşmesi.
 */

const STYLE_ID = 'toplanti-panel-style';

// ── İkonlar — monokrom SVG, emoji/renkli glyph yok (platform standardı). ──
const ICON_GEAR = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/></svg>";
const ICON_MIC = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='2' width='6' height='12' rx='3'/><path d='M5 11a7 7 0 0 0 14 0'/><line x1='12' y1='18' x2='12' y2='22'/><line x1='8' y1='22' x2='16' y2='22'/></svg>";
const ICON_NOTE = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'/></svg>";
const ICON_USERS = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3'/><path d='M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6'/><circle cx='17' cy='9' r='2.4'/><path d='M15.5 14.2c2.5.4 4.5 2.5 4.5 5.8'/></svg>";
const ICON_DOC = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>";
const ICON_CHECK_CIRCLE = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg>";
const ICON_CHECK = "<svg viewBox='0 0 24 24' width='13' height='13' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><polyline points='20 6 9 17 4 12'/></svg>";
const ICON_X = "<svg viewBox='0 0 24 24' width='13' height='13' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' style='vertical-align:-2px'><line x1='5' y1='5' x2='19' y2='19'/><line x1='19' y1='5' x2='5' y2='19'/></svg>";
const ICON_COMPUTER = "<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><rect x='2' y='4' width='20' height='13' rx='1.5'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>";
const ICON_CLOUD = "<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><path d='M17.5 19H8a5 5 0 1 1 1.3-9.8A6 6 0 0 1 21 12.5 4 4 0 0 1 17.5 19z'/></svg>";
const ICON_SAVE = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/><polyline points='17 21 17 13 7 13 7 21'/><polyline points='7 3 7 8 15 8'/></svg>";
const ICON_CLIPBOARD = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><rect x='8' y='2' width='8' height='4' rx='1'/><path d='M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2'/></svg>";
const ICON_EDIT = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'/></svg>";
const ICON_REFRESH = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><polyline points='23 4 23 10 17 10'/><polyline points='1 20 1 14 7 14'/><path d='M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15'/></svg>";
const ICON_UNDO = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-2px'><path d='M9 14 4 9l5-5'/><path d='M4 9h10a6 6 0 0 1 0 12h-1'/></svg>";
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
    .tp-page { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .tp-split { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .tp-split-left {
      width: 300px; flex-shrink: 0; border-right: 1px solid var(--border);
      overflow-y: auto; display: flex; flex-direction: column;
    }
    .tp-split-right { flex: 1; min-width: 0; overflow-y: auto; display: flex; flex-direction: column; }
    .tp-footer-bar { flex-shrink: 0; border-top: 1px solid var(--border); background: var(--surface); padding: 14px 16px; }
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

export function mount(container, api, toolId) {
  ensureStyles();
  container.classList.add('toplanti-theme');

  // ── i18n — sadece eski bir core'a (api.t henüz yok) karşı çalışırken
  // bozulmamak için TR güvenlik ağı (AGENTS.md Madde 6 Kural 2). Tam metin
  // (satır sayısı çok fazla) burada tekrarlanmıyor — tek doğruluk kaynağı
  // locale/tr.json + locale/en.json; bir key orada yoksa (eski core)
  // anahtarın kendisi görünür, hiçbir şey kırılmaz.
  function t(key, vars) {
    let s = (typeof api.t === 'function') ? api.t(key) : undefined;
    if (s === undefined || s === null) s = key;
    if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
    return s;
  }

  function gecenSureMetni(baslangicMs) {
    const saniye = Math.floor((Date.now() - baslangicMs) / 1000);
    const dk = Math.floor(saniye / 60);
    const sn = saniye % 60;
    return dk > 0 ? `${dk} ${t('gecen_sure_dk')} ${sn} ${t('gecen_sure_sn')}` : `${sn} ${t('gecen_sure_sn')}`;
  }

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
    <div class="tp-page">
    <div class="tp-split">
      <div class="tp-split-left">
        <div class="toplanti-form">
          <div class="toplanti-kayit-row">
            <button class="btn-primary" id="tpBaslatBtn">● ${esc(t('kayit_baslat_btn'))}</button>
            <button class="btn-secondary" id="tpDurdurBtn" disabled>■ ${esc(t('kayit_durdur_btn'))}</button>
          </div>
          <div class="toplanti-kayit-row">
            <span class="toplanti-kayit-durum" id="tpKayitDurum"></span>
          </div>
          <div class="toplanti-kayit-row">
            <span class="toplanti-veya">${esc(t('veya_dosya_yukle'))}</span>
            <input type="file" id="tpDosyaSec" accept="audio/*">
          </div>
          <button class="toplanti-ayarlar-toggle" id="tpAyarlarToggle">
            <span>${ICON_GEAR} ${esc(t('konusmaci_ayrimi_baglanti_toggle'))}</span>
            <span class="toplanti-ayarlar-durum" id="tpAyarlarDurum">${esc(t('kontrol_ediliyor'))}</span>
          </button>
          <div class="toplanti-ayarlar-panel" id="tpAyarlarPanel" style="display:none">
            <div class="toplanti-ayarlar-baslik">${esc(t('hf_token_baslik'))}</div>
            <p class="toplanti-ayarlar-aciklama">${t('hf_token_aciklama_html')}</p>
            <div class="toplanti-key-row">
              <input type="text" id="tpHfTokenInput" placeholder="${esc(t('hf_token_placeholder'))}">
              <button class="btn-primary" id="tpHfTokenKaydetBtn">${esc(t('kaydet_btn'))}</button>
            </div>
            <div id="tpHfTokenSonuc" style="margin-top:8px"></div>
          </div>

          <div class="toplanti-workflow" id="tpWorkflow">
            <div class="toplanti-workflow-node">
              <div class="toplanti-workflow-icon">${ICON_MIC}</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">${esc(t('ses_girisi_baslik'))}</div>
                <div class="toplanti-workflow-sub">${esc(t('ses_girisi_alt'))}</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node toplanti-workflow-node-clickable" id="tpWfStt">
              <div class="toplanti-workflow-icon">${ICON_NOTE}</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">${esc(t('transkripsiyon_baslik'))}</div>
                <div class="toplanti-workflow-sub" id="tpWfSttSub">…</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node toplanti-workflow-node-clickable" id="tpWfKonusmaci">
              <div class="toplanti-workflow-icon">${ICON_USERS}</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">${esc(t('konusmaci_ayrimi_baslik'))}</div>
                <div class="toplanti-workflow-sub" id="tpWfKonusmaciSub">…</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node toplanti-workflow-node-clickable" id="tpWfRapor">
              <div class="toplanti-workflow-icon">${ICON_DOC}</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">${esc(t('rapor_olustur_baslik'))}</div>
                <div class="toplanti-workflow-sub" id="tpWfRaporSub">…</div>
              </div>
            </div>
            <div class="toplanti-workflow-arrow">↓</div>
            <div class="toplanti-workflow-node">
              <div class="toplanti-workflow-icon">${ICON_CHECK_CIRCLE}</div>
              <div class="toplanti-workflow-body">
                <div class="toplanti-workflow-title">${esc(t('cikti_baslik'))}</div>
                <div class="toplanti-workflow-sub">${esc(t('cikti_alt'))}</div>
              </div>
            </div>
          </div>
          <div class="toplanti-workflow-hint">${esc(t('dugume_tikla_ipucu'))}</div>
        </div>
      </div>
      <div class="tp-split-right">
        <div class="toplanti-sonuc-area" id="tpSonucArea">
          <div class="toplanti-placeholder">${esc(t('kayit_yukleme_placeholder'))}</div>
        </div>
      </div>
    </div>
    <div class="tp-footer-bar">
      <div class="field-block">
        <label class="field-label">${esc(t('istek_etiket'))}</label>
        <textarea id="tpTalimat" rows="2" placeholder="${esc(t('istek_placeholder'))}">${esc(t('istek_varsayilan'))}</textarea>
      </div>
      <button class="btn-primary" id="tpFooterNotOlusturBtn" disabled style="margin-top:8px">${ICON_NOTE} ${esc(t('not_olustur_btn'))}</button>
    </div>
    </div>
  `;

  const durumEl = container.querySelector('#tpKayitDurum');
  const sonucArea = container.querySelector('#tpSonucArea');
  const baslatBtn = container.querySelector('#tpBaslatBtn');
  const durdurBtn = container.querySelector('#tpDurdurBtn');
  const dosyaSec = container.querySelector('#tpDosyaSec');
  const talimatEl = container.querySelector('#tpTalimat');
  const footerNotOlusturBtn = container.querySelector('#tpFooterNotOlusturBtn');
  footerNotOlusturBtn.onclick = notOlustur;

  async function ayarlarDurumGoster() {
    const durumEl = container.querySelector('#tpAyarlarDurum');
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/settings/hf-token`);
      const d = await r.json();
      durumEl.innerHTML = d.yapilandirilmis ? `${ICON_CHECK} ${esc(t('hazir_etiket'))}` : esc(t('kurulum_gerekli'));
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
    if (!token) { sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(t('token_bos'))}</span>`; return; }
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/settings/hf-token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      sonucEl.innerHTML = (r.ok && d.basarili)
        ? `<span style="color:#15803D">${ICON_CHECK} ${esc(t('kaydedildi'))}</span>`
        : `<span style="color:#B91C1C">${esc(d.detail || t('kaydedilemedi'))}</span>`;
      if (r.ok && d.basarili) ayarlarDurumGoster();
    } catch (e) {
      sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(t('baglanti_hatasi'))}: ${esc(e.message)}</span>`;
    }
  };

  // ── Model seçimi workflow diyagramı — core'un birleşik registry'sinden
  // (models.json, /settings) STT (transkripsiyon) ve rapor modeli seçimi.
  // Düğüme tıklayınca etiket yerine bir <select> açılır, seçim değişince
  // hemen kaydedilir — ayrı bir "Kaydet" butonu yok.
  let modelTercihVerisi = null;
  let konusmaciAyrimiAcik = true;

  function saglayiciRozeti(provider) {
    return provider === 'ollama' ? `${ICON_COMPUTER} ${esc(t('yerel_etiket'))}` : `${ICON_CLOUD} ${esc(t('bulut_etiket'))}`;
  }
  // <option> elemanları HTML render etmez — SVG içermeyen düz metin gerekir.
  function saglayiciRozetiText(provider) {
    return provider === 'ollama' ? t('yerel_etiket') : t('bulut_etiket');
  }

  function sttEtiket() {
    if (!modelTercihVerisi) return '…';
    if (modelTercihVerisi.stt_secili === 'yerel' || !modelTercihVerisi.stt_secili) {
      return `${ICON_COMPUTER} ${esc(t('stt_yerel_etiket'))}`;
    }
    const girdi = modelTercihVerisi.ses_modelleri.find(m => m.id === modelTercihVerisi.stt_secili);
    return girdi ? `${saglayiciRozeti(girdi.provider)} ${girdi.id}` : modelTercihVerisi.stt_secili;
  }

  function raporEtiket() {
    if (!modelTercihVerisi) return '…';
    if (!modelTercihVerisi.rapor_secili) return `${ICON_GEAR} ${esc(t('rapor_varsayilan_etiket'))}`;
    const girdi = modelTercihVerisi.metin_modelleri.find(m => m.id === modelTercihVerisi.rapor_secili);
    return girdi ? `${saglayiciRozeti(girdi.provider)} ${girdi.id}` : modelTercihVerisi.rapor_secili;
  }

  function workflowGoster() {
    container.querySelector('#tpWfSttSub').innerHTML = sttEtiket();
    container.querySelector('#tpWfRaporSub').innerHTML = raporEtiket();
    container.querySelector('#tpWfKonusmaciSub').innerHTML = konusmaciAyrimiAcik ? `${ICON_CHECK} ${esc(t('acik_etiket'))}` : `${ICON_X} ${esc(t('kapali_etiket'))}`;
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
        <option value="acik" ${konusmaciAyrimiAcik ? 'selected' : ''}>${esc(t('acik_etiket'))}</option>
        <option value="kapali" ${!konusmaciAyrimiAcik ? 'selected' : ''}>${esc(t('kapali_secenek_uzun'))}</option>
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
    const secenekler = [`<option value="yerel">${esc(t('stt_yerel_etiket'))}</option>`]
      .concat((modelTercihVerisi.ses_modelleri || []).map(m =>
        `<option value="${esc(m.id)}" ${m.id === modelTercihVerisi.stt_secili ? 'selected' : ''}>${saglayiciRozetiText(m.provider)} ${esc(m.id)}</option>`
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
    const secenekler = [`<option value="">${esc(t('rapor_varsayilan_etiket'))}</option>`]
      .concat((modelTercihVerisi.metin_modelleri || []).map(m =>
        `<option value="${esc(m.id)}" ${m.id === modelTercihVerisi.rapor_secili ? 'selected' : ''}>${saglayiciRozetiText(m.provider)} ${esc(m.id)}</option>`
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
      api.gosterfeedback(t('mikrofon_erisim_hatasi') + ': ' + e.message, 'err');
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
    durumEl.innerHTML = `<span class="toplanti-kayit-nokta"></span> ${esc(t('kayit_suruyor'))}`;
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

  const KAYIT_ASAMA_ANAHTARI = {
    baslatiliyor: 'basliyor',
    sirada_bekliyor: 'asama_sirada',
    model_yukleniyor: 'asama_model_yukleniyor',
    transkripsiyon: 'asama_transkripsiyon',
    konusmaci_ayrimi: 'asama_konusmaci_ayrimi',
    hizalaniyor: 'asama_hizalaniyor',
    tamamlaniyor: 'asama_tamamlaniyor',
  };

  function kayitAsamaMetni(asama) {
    if (KAYIT_ASAMA_ANAHTARI[asama]) return t(KAYIT_ASAMA_ANAHTARI[asama]);
    const parcaEslesme = /^bulut_transkripsiyon_parca_(\d+)\/(\d+)$/.exec(asama || '');
    if (parcaEslesme) return t('bulut_transkripsiyon_parca', { a: parcaEslesme[1], b: parcaEslesme[2] });
    return t('asama_isleniyor');
  }

  function kayitIzlemeBaslat(is_id, baslangicZamani) {
    function ilerlemeGoster(d) {
      const yuzde = typeof d.yuzde === 'number' ? Math.round(d.yuzde) : null;
      const metin = kayitAsamaMetni(d.asama);
      const barHtml = (yuzde !== null)
        ? `<div class="toplanti-ilerleme-bar-dis"><div class="toplanti-ilerleme-bar-ic" style="width:${yuzde}%"></div></div>`
        : '';
      sonucArea.innerHTML = `<div class="toplanti-durum-kutu">${esc(metin)}${yuzde !== null ? ' — %' + yuzde : ''}${barHtml}<div class="toplanti-gecen-sure">${esc(t('gecen_sure_etiket'))}: ${gecenSureMetni(baslangicZamani)}</div></div>`;
    }

    ilerlemeGoster({ asama: 'baslatiliyor', yuzde: 0 });
    const sureTimer = setInterval(() => {
      const el = sonucArea.querySelector('.toplanti-gecen-sure');
      if (el) el.textContent = `${t('gecen_sure_etiket')}: ${gecenSureMetni(baslangicZamani)}`;
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
          sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(t('isleme_hatasi'))}: ${esc(d.hata || t('bilinmeyen_hata'))}</div>`;
        } else if (d.durum === 'bulunamadi') {
          clearInterval(durumPollTimer);
          kayitIzlemeTemizle();
          sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(t('is_bulunamadi'))}</div>`;
        } else {
          ilerlemeGoster(d);
        }
      } catch (e) {
        // geçici ağ hatası — bir sonraki pollde tekrar dener
      }
    }, 3000);
  }

  async function yukleVeIsle(blobOrFile, dosyaAdi) {
    sonucArea.innerHTML = `<div class="toplanti-durum-kutu">${esc(t('ses_dosyasi_yukleniyor'))}</div>`;
    const formData = new FormData();
    formData.append('dosya', blobOrFile, dosyaAdi);
    let is_id;
    try {
      const r = await api.apiFetch(`/api/tools/${toolId}/kayit/yukle`, { method: 'POST', body: formData });
      const d = await r.json();
      if (!r.ok) { sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(d.detail || t('yukleme_basarisiz'))}</div>`; return; }
      is_id = d.is_id;
    } catch (e) {
      sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(t('baglanti_hatasi'))}: ${esc(e.message)}</div>`;
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
      ${sonTranskriptSuresi ? `<div class="toplanti-gecen-sure" style="margin-bottom:10px">${esc(t('transkripsiyon_suresi'))}: ${esc(sonTranskriptSuresi)}</div>` : ''}
      <div class="toplanti-konusmaci-listesi" id="tpKonusmaciListesi">
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">${esc(t('konusmaci_adi_degistir_ipucu'))}</div>
        ${konusmacilar.map(k => `
          <div class="toplanti-konusmaci-satir">
            <label>${esc(k)}</label>
            <input type="text" data-orijinal="${esc(k)}" value="${esc(k)}">
          </div>
        `).join('')}
      </div>
      <div class="toplanti-transkript-kutu" id="tpTranskriptKutu"></div>
      <div class="btn-row">
        <button class="btn-secondary" id="tpTranskriptKaydetBtn">${ICON_SAVE} ${esc(t('transkripti_kaydet_btn'))}</button>
        <button class="btn-secondary" id="tpPromptKopyalaBtn">${ICON_CLIPBOARD} ${esc(t('harici_llm_prompt_btn'))}</button>
      </div>
      <div id="tpTranskriptEkstraSonuc" style="margin-top:8px"></div>
    `;
    footerNotOlusturBtn.disabled = false;

    container.querySelectorAll('#tpKonusmaciListesi input').forEach(inp => {
      inp.oninput = () => {
        etiketHaritasi[inp.dataset.orijinal] = inp.value.trim() || inp.dataset.orijinal;
        renderSegmentler();
      };
    });

    renderSegmentler();

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
          sonucEl.innerHTML = `<span style="color:#15803D">${ICON_CHECK} ${esc(t('transkript_kaydedildi'))}: ${esc(d.dosya_yolu)}</span>`;
        } else {
          sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(d.detail || t('kaydedilemedi'))}</span>`;
        }
      } catch (e) {
        sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(t('baglanti_hatasi'))}: ${esc(e.message)}</span>`;
      }
    };

    // ── Kendi ChatGPT/Claude/Gemini hesabınıza yapıştırıp raporu ORADA
    // ürettirebilmeniz için — hiçbir API/model bağımlılığı olmadan da
    // esnek kalınsın diye. Panoya kopyalar, kaydetmez/göndermez.
    container.querySelector('#tpPromptKopyalaBtn').onclick = async () => {
      const sonucEl = container.querySelector('#tpTranskriptEkstraSonuc');
      const prompt = t('harici_llm_prompt_sablon', { transkript: transkriptMetniOlustur() });
      try {
        await navigator.clipboard.writeText(prompt);
        sonucEl.innerHTML = `<span style="color:#15803D">${ICON_CHECK} ${esc(t('prompt_kopyalandi'))}</span>`;
      } catch (e) {
        sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(t('panoya_kopyalanamadi'))}: ${esc(e.message)}</span>`;
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
    if (!asama || asama === 'basliyor') return t('basliyor');
    if (asama === 'nihai_rapor_hazirlaniyor') return t('nihai_rapor_hazirlaniyor');
    const bolumEslesme = /^bolum_(\d+)_(isleniyor|tamam)$/.exec(asama);
    if (bolumEslesme) return t('bolum_isleniyor', { n: bolumEslesme[1] });
    return t('asama_isleniyor');
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
      sonucArea.innerHTML = `<div class="toplanti-durum-kutu">${esc(raporAsamaMetni(d.asama))}${yuzde !== null ? ' — %' + yuzde : ''}${barHtml}<div class="toplanti-gecen-sure">${esc(t('gecen_sure_etiket'))}: ${gecenSureMetni(baslangicZamani)}</div></div>`;
    }

    ilerlemeGoster({ asama: 'basliyor', yuzde: 0 });
    const raporSureTimer = setInterval(() => {
      const el = sonucArea.querySelector('.toplanti-gecen-sure');
      if (el) el.textContent = `${t('gecen_sure_etiket')}: ${gecenSureMetni(baslangicZamani)}`;
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
            sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(t('rapor_uretim_hatasi'))}: ${esc(d.hata || t('bilinmeyen_hata'))}</div>`;
            resolve();
          } else if (d.durum === 'bulunamadi') {
            clearInterval(timer);
            raporIzlemeTemizle();
            sonucArea.innerHTML = `<div class="toplanti-hata-kutu">${esc(t('is_bulunamadi'))}</div>`;
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
      if (!r.ok) { api.gosterfeedback(t('rapor_baslatilamadi') + ': ' + (d.detail || t('bilinmeyen_hata')), 'err'); return; }
      is_id = d.is_id;
    } catch (e) {
      api.gosterfeedback(t('baglanti_hatasi') + ': ' + e.message, 'err');
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
    const liste = (arr) => (arr && arr.length) ? `<ul>${arr.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : `<div style="color:var(--text-xs)">${esc(t('liste_bos'))}</div>`;
    const transkriptHtml = segmentler.map(s => `
      <div class="toplanti-segment">
        <span class="toplanti-segment-konusmaci">${esc(etiket(s.konusmaci))}:</span>
        <span class="toplanti-segment-metin">${esc(s.metin)}</span>
      </div>
    `).join('');

    let raporMarkdownGuncel = d.rapor_markdown || '';

    sonucArea.innerHTML = `
      <div class="toplanti-durum-kutu">${esc(d.aciklama)}</div>
      ${sonRaporSuresi ? `<div class="toplanti-gecen-sure" style="margin-bottom:10px">${esc(t('rapor_olusturma_suresi'))}: ${esc(sonRaporSuresi)}${sonTranskriptSuresi ? esc(t('transkripsiyon_ek', { x: sonTranskriptSuresi })) : ''}</div>` : ''}
      <div class="toplanti-tab-row">
        <button class="toplanti-tab active" data-sekme="rapor">${esc(t('rapor_tab'))}</button>
        <button class="toplanti-tab" data-sekme="transkript">${esc(t('tam_transkript_tab'))}</button>
      </div>
      <div id="tpSekmeRapor"></div>
      <div id="tpSekmeTranskript" class="toplanti-transkript-kutu" style="display:none">${transkriptHtml}</div>
      <div class="toplanti-plan-footer">
        <button class="btn-primary" id="tpKaydetBtn">${ICON_CHECK} ${esc(t('kaydet_dosya_btn', { dosya: d.onerilen_dosya_adi }))}</button>
        <button class="btn-secondary" id="tpDuzenleBtn">${ICON_EDIT} ${esc(t('duzenle_btn'))}</button>
        <button class="btn-secondary" id="tpYenidenOlusturBtn">${ICON_REFRESH} ${esc(t('yeniden_olustur_btn'))}</button>
        <button class="btn-secondary" id="tpIptalBtn">${esc(t('iptal_btn'))}</button>
      </div>
    `;

    function raporGoster() {
      container.querySelector('#tpSekmeRapor').innerHTML = `
        <div class="toplanti-ozet-blok"><h4>${esc(t('ozet_baslik'))}</h4><div>${esc(d.ozet_onizleme)}</div></div>
        <div class="toplanti-ozet-blok"><h4>${esc(t('gundem_baslik'))}</h4>${liste(d.gundem_maddeleri)}</div>
        <div class="toplanti-ozet-blok"><h4>${esc(t('kararlar_baslik'))}</h4>${liste(d.alinan_kararlar)}</div>
        <div class="toplanti-ozet-blok"><h4>${esc(t('aksiyon_baslik'))}</h4>${liste(d.aksiyon_maddeleri)}</div>
        ${d.pdca ? `
        <div class="toplanti-ozet-blok"><h4>${esc(t('pdca_baslik'))}</h4>
          <div style="margin-bottom:6px"><strong>${esc(t('plan_etiket'))}</strong>${liste(d.pdca.plan)}</div>
          <div style="margin-bottom:6px"><strong>${esc(t('do_etiket'))}</strong>${liste(d.pdca.do)}</div>
          <div style="margin-bottom:6px"><strong>${esc(t('check_etiket'))}</strong>${liste(d.pdca.check)}</div>
          <div><strong>${esc(t('act_etiket'))}</strong>${liste(d.pdca.act)}</div>
        </div>` : ''}
        ${(d.belirsiz_noktalar && d.belirsiz_noktalar.length) ? `
        <div class="toplanti-ozet-blok"><h4>${esc(t('belirsiz_baslik'))}</h4>${liste(d.belirsiz_noktalar)}</div>` : ''}
        ${(d.filtrelenen_konu_disi && d.filtrelenen_konu_disi.length) ? `
        <div class="toplanti-ozet-blok"><h4>${esc(t('konu_disi_baslik'))}</h4>${liste(d.filtrelenen_konu_disi)}</div>` : ''}
      `;
    }

    function raporDuzenleGoster() {
      container.querySelector('#tpSekmeRapor').innerHTML = `
        <div class="field-block">
          <label class="field-label">${esc(t('rapor_metni_duzenle_etiket'))}</label>
          <textarea id="tpRaporDuzenleAlani" rows="16" style="font-family:inherit;font-size:13px">${esc(raporMarkdownGuncel)}</textarea>
        </div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn-primary" id="tpRaporKaydetDuzenleBtn">${ICON_SAVE} ${esc(t('degisiklikleri_kaydet_btn'))}</button>
          <button class="btn-secondary" id="tpRaporVazgecBtn">${esc(t('vazgec_btn'))}</button>
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
            sonucEl.innerHTML = `<span style="color:#15803D">${ICON_CHECK} ${esc(t('degisiklikler_kaydedildi'))}</span>`;
          } else {
            sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(dd.detail || t('kaydedilemedi'))}</span>`;
          }
        } catch (e) {
          sonucEl.innerHTML = `<span style="color:#B91C1C">${esc(t('baglanti_hatasi'))}: ${esc(e.message)}</span>`;
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
      if (dd.hata || dd.detail) { api.gosterfeedback(t('kaydetme_basarisiz') + ': ' + (dd.detail || dd.hata), 'err'); return; }
      sonucArea.innerHTML = `
        <div class="toplanti-durum-kutu">${ICON_CHECK} ${esc(t('not_kaydedildi'))}: ${esc(dd.dosya_yolu)}${dd.dosya_yolu_html ? `<br>${ICON_CHECK} ${esc(t('stilize_html_etiket'))}: ${esc(dd.dosya_yolu_html)}` : ''}${dd.dosya_yolu_pdf ? `<br>${ICON_CHECK} ${esc(t('pdf_etiket'))}: ${esc(dd.dosya_yolu_pdf)}` : ''}${dd.dosya_yolu_xlsx ? `<br>${ICON_CHECK} ${esc(t('excel_etiket'))}: ${esc(dd.dosya_yolu_xlsx)}` : ''}</div>
        <button class="btn-danger" id="tpGeriAlBtn">${ICON_UNDO} ${esc(t('geri_al_btn'))}</button>
      `;
      footerNotOlusturBtn.disabled = true;
      container.querySelector('#tpGeriAlBtn').onclick = async () => {
        if (!confirm(t('not_silme_onay'))) return;
        await api.rollback(toolId, sonKlasor, api.lastSessionId());
        sonucArea.innerHTML = `<div class="toplanti-placeholder">${esc(t('kayit_yukleme_placeholder'))}</div>`;
      };
    };
  }
}

export function unmount(container) {
  container.classList.remove('toplanti-theme');
  container.innerHTML = '';
}
