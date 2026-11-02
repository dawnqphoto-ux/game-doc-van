/* Game: Bé nói – tìm vần ao, eo
   Luồng: nhận giọng nói -> xử lí (có vần ao/eo không?) -> hiện hình phù hợp
   Hình: đặt ảnh trong thư mục images/. Nếu chưa có ảnh, game tự hiện emoji. */

// ===== 1. Cấu hình ảnh =====
const IMG_DIR = "images/";
const IMG_EXT = ".png";   // đổi thành ".webp" hoặc ".jpg" nếu bạn dùng định dạng khác

// "từ": ["tên-file-không-đuôi", "emoji dự phòng"]
const WORDS = {
  // ----- Vần AO (21 từ) -----
  "ao":        ["ao", "🏞️"],
  "áo":        ["ao-mac", "👕"],
  "cao":       ["huou-cao", "🦒"],
  "cáo":       ["con-cao", "🦊"],
  "báo":       ["con-bao", "🐆"],
  "bao":       ["banh-bao", "🥟"],
  "bánh bao":  ["banh-bao", "🥟"],
  "dao":       ["dao", "🔪"],
  "sao":       ["ngoi-sao", "⭐"],
  "ngôi sao":  ["ngoi-sao", "⭐"],
  "sáo":       ["chim-sao", "🐦"],
  "táo":       ["qua-tao", "🍎"],
  "quả táo":   ["qua-tao", "🍎"],
  "đào":       ["qua-dao", "🍑"],
  "gạo":       ["hat-gao", "🍚"],
  "chào":      ["chao-hoi", "👋"],
  "cháo":      ["chao-nong", "🥣"],
  "gào":       ["gao-thet", "📢"],
  "phao":      ["phao", "🛟"],
  "rào":       ["hang-rao", "🚧"],
  "xào":       ["xao", "🍳"],

  // ----- Vần EO (15 từ) -----
  "kẹo":       ["cai-keo", "🍬"],
  "cái kẹo":   ["cai-keo", "🍬"],
  "bèo":       ["beo", "🌿"],
  "leo":       ["leo-cay", "🧗"],
  "trèo":      ["leo-cay", "🧗"],
  "mèo":       ["meo", "🐱"],
  "đèo":       ["deo-nui", "⛰️"],
  "dẻo":       ["banh-deo", "🍡"],
  "chèo":      ["cheo-thuyen", "🚣"],
  "heo":       ["heo", "🐷"],
  "kéo":       ["cay-keo", "✂️"],
  "treo":      ["treo-tranh", "🖼️"],
  "veo":       ["nuoc-veo", "💧"],
  "lẽo":       ["lanh-leo", "❄️"],
  "lạnh lẽo":  ["lanh-leo", "❄️"],

  // ----- Cụm có cả hai vần -----
  "ao bèo":    ["ao-beo", "🌿"]
};

// Ưu tiên cụm dài (nhiều tiếng) trước
const KEYS = Object.keys(WORDS).sort((a, b) => b.split(" ").length - a.split(" ").length);

// Trả về thẻ <img>; nếu ảnh chưa có thì tự đổi sang emoji
function pic(word) {
  const [file, emoji] = WORDS[word];
  return `<img src="${IMG_DIR}${file}${IMG_EXT}" alt="${word}"
    onerror="this.replaceWith(document.createTextNode('${emoji}'))">`;
}

// ===== 2. Tiện ích & Hiệu ứng Âm thanh =====
const $ = id => document.getElementById(id);
const normalize = s =>
  s.toLowerCase().normalize("NFC").replace(/[.,!?;:"'“”]/g, " ").replace(/\s+/g, " ").trim();

// Tiếng kết thúc bằng ao/eo (có thể kèm dấu thanh trên a hoặc e)
const VAN = /((a|à|á|ả|ã|ạ)o|(e|è|é|ẻ|ẽ|ẹ)o)$/;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

// Quản lý AudioContext kích hoạt an toàn cho di động
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Âm thanh vui nhộn cho trẻ em (Major Arpeggio cho đúng, âm êm dịu cho thử lại)
function playAudioFeedback(ok) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    if (ok) {
      // Hợp âm Đô - Mi - Sol - Đố (C5, E5, G5, C6) chuông ngân vang
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.38);
      });
    } else {
      // Giai điệu nhẹ nhàng động viên (E4 -> C4)
      const notes = [329.63, 261.63];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.14);

        gain.gain.setValueAtTime(0, now + i * 0.14);
        gain.gain.linearRampToValueAtTime(0.16, now + i * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.32);
      });
    }
  } catch (e) {}
}

function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN";
    u.rate = 0.75;
    speechSynthesis.speak(u);
  } catch (e) {}
}

// ===== Hiệu ứng Pháo hoa sao (Star Confetti) =====
let animId = null;
function burstConfetti() {
  const canvas = $("fxCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const count = 36;
  const colors = ["#ff5964", "#f7b05b", "#ffe156", "#35a7ff", "#38b000", "#ff70a6"];
  const particles = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      size: 9 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.018 + Math.random() * 0.015,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      isStar: Math.random() > 0.4
    });
  }

  if (animId) cancelAnimationFrame(animId);

  function drawStar(c, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    c.beginPath();
    c.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      c.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      c.lineTo(x, y);
      rot += step;
    }
    c.lineTo(cx, cy - outerRadius);
    c.closePath();
    c.fill();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      if (p.isStar) {
        drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (alive) {
      animId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animId = null;
    }
  }

  render();
}

// Bộ đếm điểm sao tích lũy cho bé
let streak = 0;
function updateStreak(ok) {
  const badge = $("streakBadge");
  const countEl = $("streakCount");
  if (ok) {
    streak++;
    if (countEl) countEl.textContent = streak;
    if (badge) {
      badge.classList.remove("bump");
      void badge.offsetWidth;
      badge.classList.add("bump");
    }
    burstConfetti();
  }
}

// ===== 3. Nhận giọng nói (Tối ưu cho trẻ em) =====
const setStatus = t => { $("heard").textContent = t; };

// Tô màu vần trong một chuỗi từ
const hlWord = s => s.split(" ")
  .map(t => VAN.test(t) ? t.replace(VAN, m => '<span class="hl">' + m + "</span>") : t)
  .join(" ");

let currentRecognition = null;

$("mic").onclick = () => {
  if (!SR) {
    setStatus("Trình duyệt này chưa hỗ trợ micro. Hãy dùng Chrome, Edge hoặc Safari.");
    return;
  }

  // Kích hoạt AudioContext ngay trong tương tác chạm để bảo đảm âm thanh phát được trên iOS/Android
  getAudioContext();

  if (currentRecognition) {
    try { currentRecognition.abort(); } catch (e) {}
  }

  const r = new SR();
  currentRecognition = r;
  r.lang = "vi-VN";
  r.interimResults = false;
  // Quét đa phương án để bắt chính xác giọng trẻ em và lọc tiếng ồn
  r.maxAlternatives = 5;

  $("mic").classList.add("rec");
  $("mic").textContent = "👂 Đang nghe...";
  setStatus("");
  $("res").textContent = "";

  r.onresult = e => {
    // Thu thập tất cả phương án nhận diện được từ micro
    const candidates = [];
    if (e.results && e.results[0]) {
      for (let i = 0; i < e.results[0].length; i++) {
        const tr = e.results[0][i].transcript;
        if (tr) candidates.push(tr);
      }
    }
    processSpeechCandidates(candidates);
  };

  r.onerror = e => {
    setStatus(
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Chưa được cấp quyền micro. Hãy bấm cho phép micro rồi thử lại nhé!"
        : e.error === "no-speech"
          ? "Máy chưa nghe rõ. Bé nói to lại nhé!"
          : "Có chút trục trặc (" + e.error + "). Bé bấm lại nhé!");
  };

  r.onend = () => {
    $("mic").classList.remove("rec");
    $("mic").textContent = "🎤 Bấm và nói";
    currentRecognition = null;
  };

  try { r.start(); } catch (e) {}
};

// ===== 4. Xử lí: Tìm phương án tốt nhất & tìm hình =====
function showPics(html, count) {
  const multi = count > 1;
  $("pics").style.setProperty("--w", multi ? "min(44vw, 480px)" : "min(94vw, 960px)");
  $("pics").style.setProperty("--h", multi ? "calc(45dvh - 110px)" : "calc(100dvh - 270px)");
  $("pics").innerHTML = html;
}

function analyzeCandidate(text) {
  const tokens = normalize(text).split(" ").filter(Boolean);
  const vanSyllables = tokens.filter(t => VAN.test(t));
  const found = [];
  let k = 0;
  while (k < tokens.length) {
    let hit = null;
    for (const key of KEYS) {
      const n = key.split(" ").length;
      if (tokens.slice(k, k + n).join(" ") === key) { hit = [key, n]; break; }
    }
    if (hit) { found.push(hit[0]); k += hit[1]; } else k++;
  }
  return { text, tokens, vanSyllables, found };
}

function processSpeechCandidates(candidates) {
  setStatus("");
  if (!candidates.length) return;

  // Đánh giá tất cả phương án để chọn phương án khớp vần / từ khóa tốt nhất
  let best = analyzeCandidate(candidates[0]);
  for (let i = 1; i < candidates.length; i++) {
    const analysis = analyzeCandidate(candidates[i]);
    const currentScore = best.found.length * 2 + best.vanSyllables.length;
    const newScore = analysis.found.length * 2 + analysis.vanSyllables.length;
    if (newScore > currentScore) {
      best = analysis;
    }
  }

  const said = best.tokens.join(" ");
  const ok = best.vanSyllables.length > 0;

  playAudioFeedback(ok);
  updateStreak(ok);

  if (!ok) {
    $("res").className = "res no";
    $("res").textContent = "❌ Chưa nghe thấy vần ao hoặc eo";
    showPics(`<div class="pic"><div class="word">${said || "..."}</div><div class="emo">🤔</div></div>`, 1);
    return;
  }

  const vans = [...new Set(best.vanSyllables.map(t =>
    t.match(VAN)[0].replace(/[àáảãạ]/, "a").replace(/[èéẻẽẹ]/, "e")))];
  $("res").className = "res ok";
  $("res").textContent = "🎉 Giỏi quá! Có vần " + vans.join(" và ");

  // Chiếu hình to sinh động
  if (best.found.length) {
    showPics(best.found.map(f =>
      `<div class="pic"><div class="word">${hlWord(f)}</div><div class="emo">${pic(f)}</div></div>`).join(""), best.found.length);
  } else {
    showPics(`<div class="pic"><div class="word">${hlWord(said)}</div><div class="emo">🌟</div></div>`, 1);
  }

  speak(said);
}

// ===== 6. Đăng ký PWA Service Worker =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
