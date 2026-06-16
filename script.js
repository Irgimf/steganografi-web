/* ── STATE ── */
const state = {
  encode: { file: null, imageData: null, width: 0, height: 0 },
  decode: { file: null, imageData: null, width: 0, height: 0 },
};

const DELIMITER = "\u0003END\u0003";

/* ── THEME TOGGLE ── */
(function initTheme() {
  const saved = localStorage.getItem("stego-theme") || "dark";
  setTheme(saved, false);
})();

function setTheme(theme, save) {
  if (save === undefined) save = true;
  document.documentElement.setAttribute("data-theme", theme);
  if (save) localStorage.setItem("stego-theme", theme);
  const label = document.getElementById("theme-label");
  const icon = document.getElementById("theme-icon");
  if (theme === "dark") {
    if (label) label.textContent = "Mode Terang";
    if (icon) icon.innerHTML = sunIcon();
  } else {
    if (label) label.textContent = "Mode Gelap";
    if (icon) icon.innerHTML = moonIcon();
  }
}

document.getElementById("theme-toggle").addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

function sunIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}
function moonIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

/* ── TAB SWITCH ── */
function switchTab(tab) {
  ["encode", "decode"].forEach(function (t) {
    const panel = document.getElementById("panel-" + t);
    const btn = document.getElementById("tab-" + t);
    const isActive = t === tab;
    if (isActive) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

/* ── DRAG & DROP ── */
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

/* ── PROCESS FILE ── */
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

      if (mode === "encode") {
        document.getElementById("encode-capacity").removeAttribute("hidden");
        updateCapacity();
      }
      // reset result when new image loaded
      document.getElementById(mode + "-result").setAttribute("hidden", "");
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/* ── REMOVE IMAGE ── */
function removeImage(mode) {
  state[mode] = { file: null, imageData: null, width: 0, height: 0 };
  document.getElementById(mode + "-preview-wrap").setAttribute("hidden", "");
  document.getElementById(mode + "-file-input").value = "";
  document.getElementById(mode + "-result").setAttribute("hidden", "");
  if (mode === "encode")
    document.getElementById("encode-capacity").setAttribute("hidden", "");
}

/* ── CHAR COUNT / CAPACITY ── */
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
  var track = document.querySelector(".capacity-track");
  if (track) track.setAttribute("aria-valuenow", Math.round(pct));
}

/* ── XOR CIPHER ── */
function xorCipher(text, key) {
  if (!key) return text;
  var result = "";
  for (var i = 0; i < text.length; i++)
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  return result;
}

/* ── TEXT TO BITS ── */
function textToBits(text) {
  var bits = [];
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    for (var b = 7; b >= 0; b--) bits.push((code >> b) & 1);
  }
  return bits;
}

/* ── ESCAPE HTML ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── IS READABLE ── */
function readableRatio(str) {
  if (!str || str.length === 0) return 0;
  var count = 0;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if ((c >= 32 && c < 127) || c === 9 || c === 10 || c === 13 || c > 159)
      count++;
  }
  return count / str.length;
}

/* ── PROGRESS BAR ── */
function simulateProgress(barId, fillId, callback) {
  var bar = document.getElementById(barId);
  var fill = document.getElementById(fillId);
  bar.removeAttribute("hidden");
  fill.style.width = "0%";
  var pct = 0;
  var iv = setInterval(function () {
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

/* ── SET LOADING ── */
function setLoading(mode, on) {
  document.getElementById("btn-" + mode).disabled = on;
  document.getElementById(mode + "-spinner").style.display = on
    ? "block"
    : "none";
}

/* ── SHOW RESULT ── */
function showResult(mode, success, errorMsg) {
  var box = document.getElementById(mode + "-result");
  var header = document.getElementById(mode + "-result-header");
  var body = document.getElementById(mode + "-result-body");
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
      '<p style="font-size:0.83rem;color:var(--text-muted);line-height:1.6;">' +
      escapeHtml(errorMsg) +
      "</p>";
  }
}

/* ════════════════════════════════════════
   ENCODE
════════════════════════════════════════ */
function encodeMessage() {
  if (!state.encode.imageData) {
    showResult("encode", false, "Unggah gambar terlebih dahulu.");
    return;
  }
  var msg = document.getElementById("secret-msg").value.trim();
  if (!msg) {
    showResult("encode", false, "Tulis pesan yang ingin disembunyikan.");
    return;
  }

  var pass = document.getElementById("encode-pass").value;
  var payload = (pass ? xorCipher(msg, pass) : msg) + DELIMITER;
  var bits = textToBits(payload);

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
    var data = new Uint8ClampedArray(state.encode.imageData.data);
    var bitIdx = 0;
    for (var i = 0; i < data.length && bitIdx < bits.length; i++) {
      if ((i + 1) % 4 === 0) continue;
      data[i] = (data[i] & 0xfe) | bits[bitIdx++];
    }
    var canvas = document.getElementById("working-canvas");
    var ctx = canvas.getContext("2d");
    ctx.putImageData(
      new ImageData(data, state.encode.width, state.encode.height),
      0,
      0,
    );
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var origName = state.encode.file.name.replace(/\.[^.]+$/, "");
      var thumb = canvas.toDataURL();
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
        " karakter).</p>" +
        '<a href="' +
        url +
        '" download="' +
        origName +
        '_stego.png" class="btn-download">' +
        svgDownload() +
        "Unduh Gambar Stego" +
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

/**
 * Ekstrak bit LSB dari pixel data berdasarkan konfigurasi channel.
 * channels: array index dalam satu pixel RGBA, e.g. [0,1,2] = R,G,B
 * bitPos: posisi bit yang diambil (0=LSB, 1=bit-1, dst)
 */
function extractBits(pixelData, channels, bitPos) {
  var bits = [];
  var step = 4; // RGBA per pixel
  for (var px = 0; px < pixelData.length; px += step) {
    for (var ci = 0; ci < channels.length; ci++) {
      bits.push((pixelData[px + channels[ci]] >> bitPos) & 1);
    }
  }
  return bits;
}

/**
 * Konversi array bit menjadi string teks (MSB-first per byte).
 * Berhenti saat menemukan delimiter atau null byte, maks maxBytes.
 */
function bitsToText(bits, maxBytes) {
  var result = "";
  var byteCount = Math.min(Math.floor(bits.length / 8), maxBytes);
  for (var i = 0; i < byteCount; i++) {
    var byte = 0;
    for (var b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    if (byte === 0) break; // null terminator
    result += String.fromCharCode(byte);
    // Early-exit jika delimiter ditemukan
    if (
      result.length >= DELIMITER.length &&
      result.slice(-DELIMITER.length) === DELIMITER
    ) {
      return { text: result.slice(0, -DELIMITER.length), method: "delimiter" };
    }
  }
  return { text: result, method: "raw" };
}

/**
 * Coba baca panjang pesan dari N piksel pertama sebagai header.
 * Beberapa tools menyimpan uint32 big-endian di 32 bit pertama.
 */
function tryHeaderLength(bits) {
  if (bits.length < 32) return null;
  var len = 0;
  for (var i = 0; i < 32; i++) len = (len << 1) | bits[i];
  return len;
}

/**
 * Semua kombinasi mode yang akan dicoba secara otomatis.
 */
var DECODE_MODES = [
  // ── mode standar website ini (untuk referensi / konfirmasi) ──
  {
    label: "LSB · RGB Sequential",
    channels: [0, 1, 2],
    bitPos: 0,
    skipAlpha: true,
  },

  // ── variasi channel order ──
  {
    label: "LSB · BGR Sequential",
    channels: [2, 1, 0],
    bitPos: 0,
    skipAlpha: true,
  },
  { label: "LSB · R only", channels: [0], bitPos: 0, skipAlpha: true },
  { label: "LSB · G only", channels: [1], bitPos: 0, skipAlpha: true },
  { label: "LSB · B only", channels: [2], bitPos: 0, skipAlpha: true },
  { label: "LSB · GRB", channels: [1, 0, 2], bitPos: 0, skipAlpha: true },
  {
    label: "LSB · RGBA (include alpha)",
    channels: [0, 1, 2, 3],
    bitPos: 0,
    skipAlpha: false,
  },
  {
    label: "LSB · BGRA (include alpha)",
    channels: [2, 1, 0, 3],
    bitPos: 0,
    skipAlpha: false,
  },

  // ── bit position variasi ──
  { label: "Bit-1 · RGB", channels: [0, 1, 2], bitPos: 1, skipAlpha: true },
  { label: "Bit-2 · RGB", channels: [0, 1, 2], bitPos: 2, skipAlpha: true },
  { label: "Bit-1 · R only", channels: [0], bitPos: 1, skipAlpha: true },
  { label: "Bit-1 · G only", channels: [1], bitPos: 1, skipAlpha: true },

  // ── per-channel interleave (R dari px0, G dari px1, B dari px2, dst) ──
  {
    label: "LSB · R-channel interleave",
    channels: [0],
    bitPos: 0,
    skipAlpha: true,
    interleave: true,
  },
  {
    label: "LSB · G-channel interleave",
    channels: [1],
    bitPos: 0,
    skipAlpha: true,
    interleave: true,
  },
];

/**
 * Jalankan satu mode dan kembalikan hasilnya.
 */
function runMode(pixelData, mode, password, maxBytes) {
  var bits;

  if (mode.interleave) {
    // Ambil hanya channel tertentu dari setiap pixel secara berurutan
    bits = [];
    var ch = mode.channels[0];
    for (var px = 0; px < pixelData.length; px += 4) {
      bits.push((pixelData[px + ch] >> mode.bitPos) & 1);
    }
  } else {
    // Sequential per pixel
    bits = extractBits(pixelData, mode.channels, mode.bitPos);
  }

  // Coba baca dengan delimiter standar
  var res = bitsToText(bits, maxBytes);
  var text = res.text;

  // Coba juga dengan null terminator saja (tanpa delimiter)
  if (res.method === "raw" && text.length > 2) {
    // Sudah berhenti di null byte — gunakan hasilnya apa adanya
  }

  // Jika ada password, dekripsi XOR
  var decoded = password ? xorCipher(text, password) : text;

  // Coba juga tanpa password kalau dengan password tidak readable
  var decodedNoPass = text;

  var ratioWith = readableRatio(decoded);
  var ratioWithout = readableRatio(decodedNoPass);

  var bestText = ratioWith >= ratioWithout ? decoded : decodedNoPass;
  var bestRatio = Math.max(ratioWith, ratioWithout);
  var usedPass = ratioWith >= ratioWithout && password;

  return {
    mode: mode.label,
    text: bestText,
    ratio: bestRatio,
    method: res.method,
    length: bestText.length,
    usedPass: usedPass,
  };
}

/**
 * Coba header-based length (beberapa tools menyimpan panjang di awal).
 */
function tryHeaderModes(pixelData, password, maxBytes) {
  var headerChannelSets = [[0, 1, 2], [2, 1, 0], [0], [1], [2]];
  var results = [];
  for (var i = 0; i < headerChannelSets.length; i++) {
    var bits = extractBits(pixelData, headerChannelSets[i], 0);
    var headerLen = tryHeaderLength(bits);
    if (
      headerLen &&
      headerLen > 0 &&
      headerLen < maxBytes &&
      headerLen < 5000
    ) {
      // Baca headerLen karakter setelah 32 bit header
      var msgBits = bits.slice(32, 32 + headerLen * 8);
      var text = "";
      for (var j = 0; j < Math.floor(msgBits.length / 8); j++) {
        var byte = 0;
        for (var b = 0; b < 8; b++) byte = (byte << 1) | msgBits[j * 8 + b];
        text += String.fromCharCode(byte);
      }
      var decoded = password ? xorCipher(text, password) : text;
      var ratio = readableRatio(decoded);
      var ratioRaw = readableRatio(text);
      var best = ratio >= ratioRaw ? decoded : text;
      var bestRatio = Math.max(ratio, ratioRaw);
      if (bestRatio > 0.6) {
        results.push({
          mode: "Header-length · ch=" + headerChannelSets[i].join(","),
          text: best,
          ratio: bestRatio,
          method: "header",
          length: best.length,
          usedPass: ratio >= ratioRaw && !!password,
        });
      }
    }
  }
  return results;
}

/* ════════════════════════════════════════
   DECODE (standard mode)
════════════════════════════════════════ */
function decodeMessage() {
  if (!state.decode.imageData) {
    showResult("decode", false, "Unggah gambar yang ingin dibaca pesannya.");
    return;
  }
  setLoading("decode", true);
  simulateProgress("decode-progress", "decode-progress-fill", function () {
    runStandardDecode();
  });
}

function runStandardDecode() {
  var data = state.decode.imageData.data;
  var pass = document.getElementById("decode-pass").value;
  var bits = [];
  var byteStr = "";
  var result = "";
  var found = false;

  for (var i = 0; i < data.length; i++) {
    if ((i + 1) % 4 === 0) continue;
    bits.push(data[i] & 1);
    if (bits.length === 8) {
      var ch = String.fromCharCode(parseInt(bits.join(""), 2));
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
    if (pass) result = xorCipher(result, pass);
    if (readableRatio(result) >= 0.6) {
      renderDecodeSuccess(result, "LSB · RGB Sequential", false);
      setLoading("decode", false);
      return;
    }
  }

  // Tidak berhasil dengan mode standar — tawarkan Multi-Mode Scanner
  var body = document.getElementById("decode-result-body");
  body.innerHTML =
    '<p style="font-size:0.83rem;color:var(--text-muted);line-height:1.6;margin-bottom:1rem;">' +
    "Mode standar tidak menemukan pesan. Kamu bisa mencoba <strong>Multi-Mode Scanner</strong> yang akan menguji " +
    DECODE_MODES.length +
    " kombinasi metode secara otomatis untuk meningkatkan kemungkinan kompatibilitas dengan tools lain." +
    "</p>" +
    '<button class="btn-secondary" onclick="runMultiModeScan()" id="btn-multimode">' +
    svgScan() +
    "<span>Jalankan Multi-Mode Scanner</span>" +
    '<div class="spinner" id="mm-spinner" aria-hidden="true"></div>' +
    "</button>" +
    '<div id="multimode-log" class="mm-log" hidden></div>' +
    '<div id="multimode-results"></div>';

  var box = document.getElementById("decode-result");
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

  var btn = document.getElementById("btn-multimode");
  var spinner = document.getElementById("mm-spinner");
  var log = document.getElementById("multimode-log");
  var results = document.getElementById("multimode-results");

  btn.disabled = true;
  spinner.style.display = "block";
  log.removeAttribute("hidden");
  log.innerHTML = "";
  results.innerHTML = "";

  var pixelData = state.decode.imageData.data;
  var password = document.getElementById("decode-pass").value;
  var maxBytes = Math.floor(pixelData.length / 8 / 4) + 100;
  var found = [];

  function addLog(msg, ok) {
    var line = document.createElement("div");
    line.className = "mm-log-line " + (ok ? "ok" : "skip");
    line.textContent = (ok ? "+ " : "  ") + msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  // Jalankan semua mode secara async agar UI tidak freeze
  var modeIndex = 0;
  var allResults = [];

  function nextMode() {
    if (modeIndex < DECODE_MODES.length) {
      var mode = DECODE_MODES[modeIndex++];
      var r = runMode(pixelData, mode, password, maxBytes);
      if (r.ratio >= 0.75 && r.length >= 3) {
        allResults.push(r);
        addLog(
          mode.label +
            " — ratio " +
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
      // Coba header-based
      addLog("Mencoba deteksi header panjang pesan...", false);
      var headerRes = tryHeaderModes(pixelData, password, maxBytes);
      headerRes.forEach(function (r) {
        allResults.push(r);
        addLog(
          r.mode +
            " — ratio " +
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
        "<p>Kemungkinan penyebab: gambar di-compress (JPEG lossy), menggunakan enkripsi proprietary, atau bukan gambar steganografi.</p>" +
        "</div>";
      var box = document.getElementById("decode-result");
      box.className = "result-box error";
      document.getElementById("decode-result-header").textContent =
        "Multi-Mode Scanner: tidak ditemukan pesan";
      return;
    }

    // Urutkan berdasarkan ratio tertinggi
    all.sort(function (a, b) {
      return b.ratio - a.ratio || b.length - a.length;
    });

    var box = document.getElementById("decode-result");
    box.className = "result-box success";
    document.getElementById("decode-result-header").textContent =
      "Multi-Mode Scanner: " + all.length + " kemungkinan ditemukan";

    var html =
      '<p class="mm-subtitle">' +
      "Hasil diurutkan berdasarkan tingkat keterbacaan. Pilih yang paling sesuai." +
      "</p>";

    all.forEach(function (r, idx) {
      var preview = r.text.slice(0, 200);
      var id = "mm-result-" + idx;
      html +=
        '<div class="mm-result-card ' +
        (idx === 0 ? "mm-best" : "") +
        '" id="' +
        id +
        '">' +
        '<div class="mm-result-meta">' +
        '<span class="mm-badge">' +
        (idx === 0 ? "Terbaik" : "#" + (idx + 1)) +
        "</span>" +
        '<span class="mm-mode-label">' +
        escapeHtml(r.mode) +
        "</span>" +
        '<span class="mm-ratio">' +
        (r.ratio * 100).toFixed(0) +
        "% terbaca &middot; " +
        r.length +
        " kar</span>" +
        "</div>" +
        '<div class="mm-preview" id="mm-text-' +
        idx +
        '">' +
        escapeHtml(preview) +
        (r.text.length > 200
          ? '<span class="mm-truncated"> ...[terpotong]</span>'
          : "") +
        "</div>" +
        '<div class="mm-actions">' +
        '<button class="copy-btn" onclick="copyMmResult(' +
        idx +
        ')" data-text="' +
        escapeHtml(r.text) +
        '">' +
        svgCopy() +
        "Salin" +
        "</button>" +
        (r.text.length > 200
          ? '<button class="copy-btn" onclick="expandMmResult(' +
            idx +
            ", '" +
            id +
            '\')" id="btn-expand-' +
            idx +
            '">' +
            "Lihat semua" +
            "</button>"
          : "") +
        "</div>" +
        "</div>";
    });

    results.innerHTML = html;
  }
}

function copyMmResult(idx) {
  var btn = document.querySelector('[onclick="copyMmResult(' + idx + ')"]');
  var text = btn ? btn.getAttribute("data-text") : "";
  navigator.clipboard.writeText(text).then(function () {
    if (!btn) return;
    var orig = btn.innerHTML;
    btn.innerHTML = svgCheck() + "Tersalin";
    setTimeout(function () {
      btn.innerHTML = orig;
    }, 2000);
  });
}

function expandMmResult(idx, cardId) {
  var textEl = document.getElementById("mm-text-" + idx);
  var btnEl = document.getElementById("btn-expand-" + idx);
  var card = document.getElementById(cardId);
  var btn = card.querySelector('[onclick="copyMmResult(' + idx + ')"]');
  var fullText = btn ? btn.getAttribute("data-text") : "";
  if (textEl) textEl.innerHTML = escapeHtml(fullText);
  if (btnEl) btnEl.remove();
}

/* ── RENDER DECODE SUCCESS (standard path) ── */
function renderDecodeSuccess(text, modeName, usedPass) {
  document.getElementById("decode-result-body").innerHTML =
    '<div class="mm-result-card mm-best" style="margin:0;">' +
    '<div class="mm-result-meta">' +
    '<span class="mm-badge">Ditemukan</span>' +
    '<span class="mm-mode-label">' +
    escapeHtml(modeName) +
    "</span>" +
    (usedPass ? '<span class="mm-ratio">Terenkripsi kata sandi</span>' : "") +
    "</div>" +
    '<div class="decoded-msg" id="decoded-text">' +
    escapeHtml(text) +
    "</div>" +
    '<div class="mm-actions" style="margin-top:0.75rem;">' +
    '<button class="copy-btn" onclick="copyDecoded()">' +
    svgCopy() +
    "Salin Pesan</button>" +
    "<span style=\"font-size:0.7rem;color:var(--text-dim);font-family:'Space Mono',monospace;\">" +
    text.length +
    " karakter</span>" +
    "</div>" +
    "</div>";
  showResult("decode", true, null);
}

/* ── COPY DECODED ── */
function copyDecoded() {
  var text = document.getElementById("decoded-text").textContent;
  navigator.clipboard.writeText(text).then(function () {
    var btn = document.querySelector(".copy-btn");
    if (!btn) return;
    var orig = btn.innerHTML;
    btn.innerHTML = svgCheck() + "Tersalin";
    setTimeout(function () {
      btn.innerHTML = orig;
    }, 2000);
  });
}

/* ── TOGGLE PASSWORD ── */
function togglePw(inputId, btn) {
  var input = document.getElementById(inputId);
  var isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  var openEye = btn.querySelector(".eye-open");
  var closedEye = btn.querySelector(".eye-closed");
  if (openEye) openEye.style.display = isHidden ? "none" : "";
  if (closedEye) closedEye.style.display = isHidden ? "" : "none";
  btn.setAttribute(
    "aria-label",
    isHidden ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
  );
}

/* ── SVG HELPERS ── */
function svgDownload() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
}
function svgCopy() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
}
function svgCheck() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
}
function svgScan() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>';
}
