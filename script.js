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

function setTheme(theme, save = true) {
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
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
}

function moonIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

/* ── TAB SWITCH ── */
function switchTab(tab) {
  ["encode", "decode"].forEach(function (t) {
    const panel = document.getElementById("panel-" + t);
    const btn = document.getElementById("tab-" + t);
    const isActive = t === tab;

    if (isActive) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
    }

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

  reader.onload = function (e) {
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

      const previewImg = document.getElementById(mode + "-preview-img");
      const previewWrap = document.getElementById(mode + "-preview-wrap");
      previewImg.src = e.target.result;
      previewWrap.removeAttribute("hidden");

      if (mode === "encode") {
        document.getElementById("encode-capacity").removeAttribute("hidden");
        updateCapacity();
      }
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

/* ── REMOVE IMAGE ── */
function removeImage(mode) {
  state[mode] = { file: null, imageData: null, width: 0, height: 0 };
  document.getElementById(mode + "-preview-wrap").setAttribute("hidden", "");
  document.getElementById(mode + "-file-input").value = "";
  document.getElementById(mode + "-result").setAttribute("hidden", "");

  if (mode === "encode") {
    document.getElementById("encode-capacity").setAttribute("hidden", "");
  }
}

/* ── CHAR COUNT ── */
function updateCharCount() {
  const len = document.getElementById("secret-msg").value.length;
  document.getElementById("char-count").textContent = len;
}

/* ── CAPACITY ── */
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

/* ── XOR CIPHER ── */
function xorCipher(text, key) {
  if (!key) return text;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return result;
}

/* ── TEXT TO BITS ── */
function textToBits(text) {
  const bits = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((code >> b) & 1);
    }
  }
  return bits;
}

/* ── PROGRESS BAR ── */
function simulateProgress(barId, fillId, callback) {
  const bar = document.getElementById(barId);
  const fill = document.getElementById(fillId);
  bar.removeAttribute("hidden");
  fill.style.width = "0%";

  let pct = 0;
  const iv = setInterval(function () {
    pct += Math.random() * 22 + 5;
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
      }, 120);
    } else {
      fill.style.width = pct + "%";
    }
  }, 55);
}

/* ── SET LOADING STATE ── */
function setLoading(mode, on) {
  const btn = document.getElementById("btn-" + mode);
  const spinner = document.getElementById(mode + "-spinner");
  btn.disabled = on;
  spinner.style.display = on ? "block" : "none";
}

/* ── SHOW RESULT ── */
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
      '<p style="font-size:0.83rem;color:var(--text-muted);line-height:1.6;">' +
      escapeHtml(errorMsg) +
      "</p>";
  }
}

/* ── ESCAPE HTML ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── ENCODE ── */
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
  const pixels = state.encode.width * state.encode.height;

  if (bits.length > pixels * 3) {
    showResult(
      "encode",
      false,
      "Pesan terlalu panjang untuk gambar ini. Gunakan gambar yang lebih besar atau pesan yang lebih pendek.",
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
    const newImage = new ImageData(
      data,
      state.encode.width,
      state.encode.height,
    );
    ctx.putImageData(newImage, 0, 0);

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
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        "Unduh Gambar Stego" +
        "</a>" +
        "</div>" +
        "</div>";

      showResult("encode", true, null);
      setLoading("encode", false);
    }, "image/png");
  });
}

/* ── DECODE ── */
function decodeMessage() {
  if (!state.decode.imageData) {
    showResult("decode", false, "Unggah gambar yang ingin dibaca pesannya.");
    return;
  }

  setLoading("decode", true);
  simulateProgress("decode-progress", "decode-progress-fill", function () {
    const data = state.decode.imageData.data;
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

    if (!found) {
      showResult(
        "decode",
        false,
        "Tidak ditemukan pesan tersembunyi dalam gambar ini, atau format tidak kompatibel.",
      );
      setLoading("decode", false);
      return;
    }

    const pass = document.getElementById("decode-pass").value;
    if (pass) result = xorCipher(result, pass);

    /* Sanity check: at least 50% printable ASCII */
    const printable = result.split("").filter(function (c) {
      const code = c.charCodeAt(0);
      return (code > 31 && code < 127) || code > 159;
    }).length;

    if (printable / result.length < 0.5) {
      showResult(
        "decode",
        false,
        pass
          ? "Kata sandi salah atau pesan tidak dienkripsi dengan kata sandi. Coba tanpa kata sandi."
          : "Pesan ditemukan namun tidak dapat dibaca. Mungkin diproteksi kata sandi.",
      );
      setLoading("decode", false);
      return;
    }

    document.getElementById("decode-result-body").innerHTML =
      '<div class="decoded-msg" id="decoded-text">' +
      escapeHtml(result) +
      "</div>" +
      '<button class="copy-btn" onclick="copyDecoded()" aria-label="Salin pesan ke clipboard">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
      "Salin Pesan" +
      "</button>" +
      "<p style=\"margin-top:0.6rem;font-size:0.7rem;color:var(--text-dim);font-family:'Space Mono',monospace;\">" +
      result.length +
      " karakter ditemukan</p>";

    showResult("decode", true, null);
    setLoading("decode", false);
  });
}

/* ── COPY DECODED ── */
function copyDecoded() {
  const text = document.getElementById("decoded-text").textContent;
  navigator.clipboard
    .writeText(text)
    .then(function () {
      const btn = document.querySelector(".copy-btn");
      if (!btn) return;
      const original = btn.innerHTML;
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
        "Tersalin";
      setTimeout(function () {
        btn.innerHTML = original;
      }, 2000);
    })
    .catch(function () {
      /* Fallback for older browsers */
      const range = document.createRange();
      range.selectNode(document.getElementById("decoded-text"));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand("copy");
      window.getSelection().removeAllRanges();
    });
}

/* ── TOGGLE PASSWORD VISIBILITY ── */
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";

  const openEye = btn.querySelector(".eye-open");
  const closedEye = btn.querySelector(".eye-closed");
  if (openEye) openEye.style.display = isHidden ? "none" : "";
  if (closedEye) closedEye.style.display = isHidden ? "" : "none";
  btn.setAttribute(
    "aria-label",
    isHidden ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
  );
}
