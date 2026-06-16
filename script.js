/* ════════════════════════════════════════
   THEME — animated toggle
════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem("stego-theme") || "dark";
  applyTheme(saved, false);
})();

function applyTheme(theme, save) {
  if (save === undefined) save = true;
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const label = document.getElementById("theme-label");

  root.setAttribute("data-theme", theme);
  if (save) localStorage.setItem("stego-theme", theme);

  const isLight = theme === "light";
  if (toggle) toggle.setAttribute("aria-checked", String(isLight));
  if (label) label.textContent = isLight ? "Mode Gelap" : "Mode Terang";
}

document.getElementById("theme-toggle").addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
const DELIMITER = "\u0003END\u0003";

const state = {
  encode: { file: null, imageData: null, width: 0, height: 0 },
  decode: { file: null, imageData: null, width: 0, height: 0 },
};

/* ════════════════════════════════════════
   TAB SWITCH
════════════════════════════════════════ */
function switchTab(tab) {
  ["encode", "decode"].forEach(function (t) {
    const panel = document.getElementById("panel-" + t);
    const btn = document.getElementById("tab-" + t);
    const isActive = t === tab;
    isActive
      ? panel.removeAttribute("hidden")
      : panel.setAttribute("hidden", "");
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

/* ════════════════════════════════════════
   DRAG & DROP / FILE INPUT
════════════════════════════════════════ */
function handleDrag(e, over, id) {
  e.preventDefault();
  document.getElementById(id).classList.toggle("drag-over", over);
}

function handleDrop(e, mode) {
  e.preventDefault();
  document.getElementById(mode + "-dropzone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processFile(file, mode);
}

function handleFile(e, mode) {
  const file = e.target.files[0];
  if (file) processFile(file, mode);
}

/* ════════════════════════════════════════
   PROCESS FILE
════════════════════════════════════════ */
function processFile(file, mode) {
  if (!file.type.match(/image\/(png|bmp|gif)/)) {
    showResult(
      mode,
      false,
      "Format tidak didukung. Gunakan PNG, BMP, atau GIF.",
    );
    return;
  }

  state[mode].file = file;
  const reader = new FileReader();

  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.getElementById("working-canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      state[mode].imageData = ctx.getImageData(0, 0, img.width, img.height);
      state[mode].width = img.width;
      state[mode].height = img.height;

      document.getElementById(mode + "-preview-img").src = ev.target.result;
      document.getElementById(mode + "-preview-wrap").removeAttribute("hidden");
      document.getElementById(mode + "-result").setAttribute("hidden", "");

      if (mode === "encode") {
        document.getElementById("encode-capacity").removeAttribute("hidden");
        updateCapacity();
      }
    };
    img.src = ev.target.result;
  };

  reader.readAsDataURL(file);
}

/* ════════════════════════════════════════
   REMOVE IMAGE
════════════════════════════════════════ */
function removeImage(mode) {
  state[mode] = { file: null, imageData: null, width: 0, height: 0 };
  document.getElementById(mode + "-preview-wrap").setAttribute("hidden", "");
  document.getElementById(mode + "-file-input").value = "";
  document.getElementById(mode + "-result").setAttribute("hidden", "");
  if (mode === "encode")
    document.getElementById("encode-capacity").setAttribute("hidden", "");
}

/* ════════════════════════════════════════
   CHAR COUNT & CAPACITY
════════════════════════════════════════ */
function updateCharCount() {
  document.getElementById("char-count").textContent =
    document.getElementById("secret-msg").value.length;
}

function updateCapacity() {
  if (!state.encode.imageData) return;
  const pixels = state.encode.width * state.encode.height;
  const maxChars = Math.floor((pixels * 3) / 8) - DELIMITER.length - 1;
  const current = document.getElementById("secret-msg").value.length;
  const pct = maxChars > 0 ? Math.min(100, (current / maxChars) * 100) : 0;

  document.getElementById("capacity-text").textContent =
    current + " / " + maxChars + " karakter";
  document.getElementById("capacity-fill").style.width = pct + "%";

  const track = document.querySelector(".capacity-track");
  if (track) track.setAttribute("aria-valuenow", Math.round(pct));
}

/* ════════════════════════════════════════
   UTILITIES
════════════════════════════════════════ */
function xorCipher(text, key) {
  if (!key) return text;
  let result = "";
  for (let i = 0; i < text.length; i++)
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  return result;
}

function textToBits(text) {
  const bits = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) bits.push((code >> b) & 1);
  }
  return bits;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readableRatio(str) {
  if (!str || str.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if ((c >= 32 && c < 127) || c === 9 || c === 10 || c === 13 || c > 159)
      count++;
  }
  return count / str.length;
}

/* ════════════════════════════════════════
   PROGRESS BAR
════════════════════════════════════════ */
function simulateProgress(barId, fillId, callback) {
  const bar = document.getElementById(barId);
  const fill = document.getElementById(fillId);
  bar.removeAttribute("hidden");
  fill.style.width = "0%";

  let pct = 0;
  const iv = setInterval(function () {
    pct += Math.random() * 20 + 5;
    if (pct >= 90) {
      clearInterval(iv);
      fill.style.width = "90%";
      setTimeout(function () {
        fill.style.width = "100%";
        setTimeout(function () {
          bar.setAttribute("hidden", "");
          fill.style.width = "0%";
          callback();
        }, 200);
      }, 100);
    } else {
      fill.style.width = pct + "%";
    }
  }, 55);
}

/* ════════════════════════════════════════
   LOADING STATE
════════════════════════════════════════ */
function setLoading(mode, on) {
  document.getElementById("btn-" + mode).disabled = on;
  document.getElementById(mode + "-spinner").style.display = on
    ? "block"
    : "none";
}

/* ════════════════════════════════════════
   SHOW RESULT
════════════════════════════════════════ */
function showResult(mode, success, errorMsg) {
  const box = document.getElementById(mode + "-result");
  const header = document.getElementById(mode + "-result-header");
  const body = document.getElementById(mode + "-result-body");

  box.removeAttribute("hidden");
  box.className = "result-box " + (success ? "success" : "error");

  if (success) {
    header.textContent =
      mode === "encode"
        ? "Pesan berhasil disembunyikan"
        : "Pesan berhasil ditemukan";
  } else {
    header.textContent = "Proses gagal";
    body.innerHTML =
      '<p style="font-size:0.82rem;color:var(--text-muted);line-height:1.6;">' +
      escapeHtml(errorMsg) +
      "</p>";
  }
}

/* ════════════════════════════════════════
   SVG ICONS
════════════════════════════════════════ */
function svgDownload() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
}
function svgCopy() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
}
function svgCheck() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
}
function svgScan() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>';
}

/* ════════════════════════════════════════
   ENCODE
════════════════════════════════════════ */
function encodeMessage() {
  if (!state.encode.imageData) {
    showResult("encode", false, "Unggah gambar terlebih dahulu.");
    return;
  }

  const msg = document.getElementById("secret-msg").value.trim();
  if (!msg) {
    showResult("encode", false, "Tulis pesan yang ingin disembunyikan.");
    return;
  }

  const pass = document.getElementById("encode-pass").value;
  const payload = (pass ? xorCipher(msg, pass) : msg) + DELIMITER;
  const bits = textToBits(payload);

  if (bits.length > state.encode.width * state.encode.height * 3) {
    showResult(
      "encode",
      false,
      "Pesan terlalu panjang. Gunakan gambar lebih besar atau pesan lebih pendek.",
    );
    return;
  }

  setLoading("encode", true);
  simulateProgress("encode-progress", "encode-progress-fill", function () {
    const data = new Uint8ClampedArray(state.encode.imageData.data);
    let bitIdx = 0;

    for (let i = 0; i < data.length && bitIdx < bits.length; i++) {
      if ((i + 1) % 4 === 0) continue;
      data[i] = (data[i] & 0xfe) | bits[bitIdx++];
    }

    const canvas = document.getElementById("working-canvas");
    const ctx = canvas.getContext("2d");
    ctx.putImageData(
      new ImageData(data, state.encode.width, state.encode.height),
      0,
      0,
    );

    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      const origName = state.encode.file.name.replace(/\.[^.]+$/, "");
      const thumb = canvas.toDataURL();

      document.getElementById("encode-result-body").innerHTML =
        '<div class="download-area">' +
        '<img src="' +
        thumb +
        '" class="result-img-thumb" alt="Thumbnail hasil stego" />' +
        '<div class="download-info">' +
        "<p>Pesan disembunyikan dalam <strong>" +
        bits.length +
        " bit</strong> (" +
        msg.length +
        " karakter). Gambar tampak identik secara visual.</p>" +
        '<a href="' +
        url +
        '" download="' +
        origName +
        '_stego.png" class="btn-download">' +
        svgDownload() +
        " Unduh Gambar Stego" +
        "</a>" +
        "</div>" +
        "</div>";

      showResult("encode", true, null);
      setLoading("encode", false);
    }, "image/png");
  });
}

/* ════════════════════════════════════════
   MULTI-MODE DECODER ENGINE
════════════════════════════════════════ */
const DECODE_MODES = [
  { label: "LSB · RGB Sequential", channels: [0, 1, 2], bitPos: 0 },
  { label: "LSB · BGR Sequential", channels: [2, 1, 0], bitPos: 0 },
  { label: "LSB · R only", channels: [0], bitPos: 0 },
  { label: "LSB · G only", channels: [1], bitPos: 0 },
  { label: "LSB · B only", channels: [2], bitPos: 0 },
  { label: "LSB · GRB", channels: [1, 0, 2], bitPos: 0 },
  { label: "LSB · RGBA (inc. alpha)", channels: [0, 1, 2, 3], bitPos: 0 },
  { label: "LSB · BGRA (inc. alpha)", channels: [2, 1, 0, 3], bitPos: 0 },
  { label: "Bit-1 · RGB", channels: [0, 1, 2], bitPos: 1 },
  { label: "Bit-2 · RGB", channels: [0, 1, 2], bitPos: 2 },
  { label: "Bit-1 · R only", channels: [0], bitPos: 1 },
  { label: "Bit-1 · G only", channels: [1], bitPos: 1 },
  { label: "LSB · R interleave", channels: [0], bitPos: 0, interleave: true },
  { label: "LSB · G interleave", channels: [1], bitPos: 0, interleave: true },
];

function extractBits(pixelData, channels, bitPos, interleave) {
  const bits = [];
  for (let px = 0; px < pixelData.length; px += 4) {
    for (let ci = 0; ci < channels.length; ci++) {
      bits.push((pixelData[px + channels[ci]] >> bitPos) & 1);
    }
    if (interleave) break; // one pixel at a time handled outside
  }
  return bits;
}

function bitsToText(bits, maxBytes) {
  let result = "";
  const byteCount = Math.min(Math.floor(bits.length / 8), maxBytes);
  for (let i = 0; i < byteCount; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    if (byte === 0) break;
    result += String.fromCharCode(byte);
    if (
      result.length >= DELIMITER.length &&
      result.slice(-DELIMITER.length) === DELIMITER
    )
      return { text: result.slice(0, -DELIMITER.length), found: true };
  }
  return { text: result, found: false };
}

function tryHeaderLength(bits) {
  if (bits.length < 32) return null;
  let len = 0;
  for (let i = 0; i < 32; i++) len = (len << 1) | bits[i];
  return len;
}

function runMode(pixelData, mode, password, maxBytes) {
  let bits = [];

  if (mode.interleave) {
    const ch = mode.channels[0];
    for (let px = 0; px < pixelData.length; px += 4)
      bits.push((pixelData[px + ch] >> mode.bitPos) & 1);
  } else {
    for (let px = 0; px < pixelData.length; px += 4)
      for (let ci = 0; ci < mode.channels.length; ci++)
        bits.push((pixelData[px + mode.channels[ci]] >> mode.bitPos) & 1);
  }

  const res = bitsToText(bits, maxBytes);
  const raw = res.text;
  const decoded = password ? xorCipher(raw, password) : raw;

  const ratioWith = readableRatio(decoded);
  const ratioWithout = readableRatio(raw);
  const best = ratioWith >= ratioWithout ? decoded : raw;
  const bestRatio = Math.max(ratioWith, ratioWithout);

  return {
    mode: mode.label,
    text: best,
    ratio: bestRatio,
    found: res.found,
    length: best.length,
    usedPass: ratioWith >= ratioWithout && !!password,
  };
}

function tryHeaderModes(pixelData, password, maxBytes) {
  const sets = [[0, 1, 2], [2, 1, 0], [0], [1], [2]];
  const results = [];

  sets.forEach(function (ch) {
    const bits = [];
    for (let px = 0; px < pixelData.length; px += 4)
      ch.forEach(function (c) {
        bits.push(pixelData[px + c] & 1);
      });

    const headerLen = tryHeaderLength(bits);
    if (
      !headerLen ||
      headerLen <= 0 ||
      headerLen >= maxBytes ||
      headerLen > 5000
    )
      return;

    const msgBits = bits.slice(32, 32 + headerLen * 8);
    let text = "";
    for (let j = 0; j < Math.floor(msgBits.length / 8); j++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) byte = (byte << 1) | msgBits[j * 8 + b];
      text += String.fromCharCode(byte);
    }

    const decoded = password ? xorCipher(text, password) : text;
    const ratio = readableRatio(decoded);
    const ratioRaw = readableRatio(text);
    const best = ratio >= ratioRaw ? decoded : text;
    const bestRatio = Math.max(ratio, ratioRaw);

    if (bestRatio > 0.6) {
      results.push({
        mode: "Header-length · ch=" + ch.join(","),
        text: best,
        ratio: bestRatio,
        found: true,
        length: best.length,
        usedPass: ratio >= ratioRaw && !!password,
      });
    }
  });

  return results;
}

/* ════════════════════════════════════════
   STANDARD DECODE
════════════════════════════════════════ */
function decodeMessage() {
  if (!state.decode.imageData) {
    showResult("decode", false, "Unggah gambar yang ingin dibaca pesannya.");
    return;
  }
  setLoading("decode", true);
  simulateProgress(
    "decode-progress",
    "decode-progress-fill",
    runStandardDecode,
  );
}

function runStandardDecode() {
  const data = state.decode.imageData.data;
  const pass = document.getElementById("decode-pass").value;
  let bits = [];
  let byteStr = "";
  let result = "";
  let found = false;

  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 === 0) continue;
    bits.push(data[i] & 1);
    if (bits.length === 8) {
      const ch = String.fromCharCode(parseInt(bits.join(""), 2));
      bits = [];
      byteStr += ch;
      result += ch;
      if (byteStr.endsWith(DELIMITER)) {
        result = result.slice(0, -DELIMITER.length);
        found = true;
        break;
      }
    }
  }

  if (found) {
    const decoded = pass ? xorCipher(result, pass) : result;
    if (readableRatio(decoded) >= 0.6) {
      renderDecodeSuccess(decoded, "LSB · RGB Sequential", !!pass);
      setLoading("decode", false);
      return;
    }
  }

  // Tawarkan multi-mode scanner
  const body = document.getElementById("decode-result-body");
  body.innerHTML =
    '<p style="font-size:0.82rem;color:var(--text-muted);line-height:1.6;margin-bottom:0.9rem;">' +
    "Mode standar tidak menemukan pesan. Gunakan <strong>Multi-Mode Scanner</strong> yang menguji " +
    DECODE_MODES.length +
    " kombinasi metode secara otomatis." +
    "</p>" +
    '<button class="btn-secondary" onclick="runMultiModeScan()" id="btn-multimode">' +
    svgScan() +
    "<span>Jalankan Multi-Mode Scanner</span>" +
    '<div class="spinner" id="mm-spinner" aria-hidden="true"></div>' +
    "</button>" +
    '<div id="multimode-log" class="mm-log" hidden></div>' +
    '<div id="multimode-results"></div>';

  const box = document.getElementById("decode-result");
  box.removeAttribute("hidden");
  box.className = "result-box warn";
  document.getElementById("decode-result-header").textContent =
    "Mode standar tidak menemukan pesan";

  setLoading("decode", false);
}

/* ════════════════════════════════════════
   MULTI-MODE SCANNER
════════════════════════════════════════ */
function runMultiModeScan() {
  if (!state.decode.imageData) return;

  const btn = document.getElementById("btn-multimode");
  const spinner = document.getElementById("mm-spinner");
  const log = document.getElementById("multimode-log");
  const results = document.getElementById("multimode-results");

  btn.disabled = true;
  spinner.style.display = "block";
  log.removeAttribute("hidden");
  log.innerHTML = "";
  results.innerHTML = "";

  const pixelData = state.decode.imageData.data;
  const password = document.getElementById("decode-pass").value;
  const maxBytes = Math.floor(pixelData.length / 4 / 8) + 100;
  const allResults = [];

  function addLog(msg, ok) {
    const line = document.createElement("div");
    line.className = "mm-log-line" + (ok ? " ok" : "");
    line.textContent = (ok ? "+ " : "  ") + msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  let modeIndex = 0;

  function nextMode() {
    if (modeIndex < DECODE_MODES.length) {
      const mode = DECODE_MODES[modeIndex++];
      const r = runMode(pixelData, mode, password, maxBytes);

      if (r.ratio >= 0.75 && r.length >= 3) {
        allResults.push(r);
        addLog(
          mode.label +
            " — " +
            (r.ratio * 100).toFixed(0) +
            "% (" +
            r.length +
            " kar)",
          true,
        );
      } else {
        addLog(
          mode.label + " — tidak terbaca (" + (r.ratio * 100).toFixed(0) + "%)",
          false,
        );
      }
      setTimeout(nextMode, 0);
    } else {
      addLog("Mencoba deteksi header panjang pesan...", false);
      const headerRes = tryHeaderModes(pixelData, password, maxBytes);
      headerRes.forEach(function (r) {
        allResults.push(r);
        addLog(
          r.mode +
            " — " +
            (r.ratio * 100).toFixed(0) +
            "% (" +
            r.length +
            " kar)",
          true,
        );
      });
      finalizeScan(allResults);
    }
  }

  setTimeout(nextMode, 50);

  function finalizeScan(all) {
    btn.disabled = false;
    spinner.style.display = "none";

    if (all.length === 0) {
      results.innerHTML =
        '<div class="mm-empty">' +
        "<p>Tidak ada metode yang berhasil mendekode pesan dari gambar ini.</p>" +
        "<p>Kemungkinan: gambar di-compress lossy (JPEG), enkripsi proprietary, atau bukan gambar steganografi.</p>" +
        "</div>";

      const box = document.getElementById("decode-result");
      box.className = "result-box error";
      document.getElementById("decode-result-header").textContent =
        "Multi-Mode Scanner: tidak ditemukan pesan";
      return;
    }

    all.sort(function (a, b) {
      return b.ratio - a.ratio || b.length - a.length;
    });

    const box = document.getElementById("decode-result");
    box.className = "result-box success";
    document.getElementById("decode-result-header").textContent =
      "Multi-Mode Scanner: " + all.length + " kemungkinan ditemukan";

    let html =
      '<p class="mm-subtitle">Hasil diurutkan berdasarkan tingkat keterbacaan. Pilih yang paling sesuai.</p>';

    all.forEach(function (r, idx) {
      const preview = escapeHtml(r.text.slice(0, 200));
      const id = "mm-card-" + idx;
      const isBest = idx === 0;
      html +=
        '<div class="mm-result-card' +
        (isBest ? " mm-best" : "") +
        '" id="' +
        id +
        '">' +
        '<div class="mm-result-meta">' +
        '<span class="mm-badge">' +
        (isBest ? "Terbaik" : "#" + (idx + 1)) +
        "</span>" +
        '<span class="mm-mode-label">' +
        escapeHtml(r.mode) +
        "</span>" +
        '<span class="mm-ratio">' +
        (r.ratio * 100).toFixed(0) +
        "% &middot; " +
        r.length +
        " kar</span>" +
        "</div>" +
        '<div class="mm-preview" id="mm-text-' +
        idx +
        '">' +
        preview +
        (r.text.length > 200
          ? '<span class="mm-truncated"> ...[terpotong]</span>'
          : "") +
        "</div>" +
        '<div class="mm-actions">' +
        '<button class="copy-btn" data-idx="' +
        idx +
        '" data-full="' +
        escapeHtml(r.text) +
        '" onclick="copyMmResult(this)">' +
        svgCopy() +
        " Salin" +
        "</button>" +
        (r.text.length > 200
          ? '<button class="copy-btn" onclick="expandMmResult(' +
            idx +
            ",'" +
            id +
            '\')" id="btn-exp-' +
            idx +
            '">Lihat semua</button>'
          : "") +
        "</div>" +
        "</div>";
    });

    results.innerHTML = html;
  }
}

function copyMmResult(btn) {
  const text = btn.getAttribute("data-full");
  navigator.clipboard.writeText(text).then(function () {
    const orig = btn.innerHTML;
    btn.innerHTML = svgCheck() + " Tersalin";
    setTimeout(function () {
      btn.innerHTML = orig;
    }, 2000);
  });
}

function expandMmResult(idx, cardId) {
  const textEl = document.getElementById("mm-text-" + idx);
  const btnEl = document.getElementById("btn-exp-" + idx);
  const copyBtn = document.querySelector(
    "#" + cardId + ' [data-idx="' + idx + '"]',
  );
  if (textEl && copyBtn)
    textEl.innerHTML = escapeHtml(copyBtn.getAttribute("data-full"));
  if (btnEl) btnEl.remove();
}

/* ════════════════════════════════════════
   RENDER DECODE SUCCESS
════════════════════════════════════════ */
function renderDecodeSuccess(text, modeName, usedPass) {
  const body = document.getElementById("decode-result-body");
  body.innerHTML =
    '<div class="mm-result-card mm-best" style="margin:0;">' +
    '<div class="mm-result-meta">' +
    '<span class="mm-badge">Ditemukan</span>' +
    '<span class="mm-mode-label">' +
    escapeHtml(modeName) +
    "</span>" +
    (usedPass ? '<span class="mm-ratio">Terenkripsi</span>' : "") +
    "</div>" +
    '<div class="decoded-msg" id="decoded-text">' +
    escapeHtml(text) +
    "</div>" +
    '<div class="mm-actions" style="margin-top:0.6rem;">' +
    '<button class="copy-btn" onclick="copyDecoded()">' +
    svgCopy() +
    " Salin Pesan</button>" +
    "<span style=\"font-size:0.68rem;color:var(--text-dim);font-family:'Space Mono',monospace;\">" +
    text.length +
    " karakter</span>" +
    "</div>" +
    "</div>";
  showResult("decode", true, null);
}

function copyDecoded() {
  const text = document.getElementById("decoded-text").textContent;
  navigator.clipboard.writeText(text).then(function () {
    const btn = document.querySelector("#decode-result .copy-btn");
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = svgCheck() + " Tersalin";
    setTimeout(function () {
      btn.innerHTML = orig;
    }, 2000);
  });
}

/* ════════════════════════════════════════
   TOGGLE PASSWORD VISIBILITY
════════════════════════════════════════ */
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  const open = btn.querySelector(".eye-open");
  const closed = btn.querySelector(".eye-closed");
  if (open) open.style.display = isHidden ? "none" : "";
  if (closed) closed.style.display = isHidden ? "" : "none";
  btn.setAttribute(
    "aria-label",
    isHidden ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
  );
}
