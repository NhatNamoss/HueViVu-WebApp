'use strict';
document.documentElement.classList.add('js');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileLayout = window.matchMedia('(max-width: 620px)');
const header = document.querySelector('.site-header');
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function closeMenu(returnFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
window.matchMedia('(max-width: 850px)').addEventListener('change', () => closeMenu());

const chapters = [...document.querySelectorAll('[data-step]')];
const scenes = [...document.querySelectorAll('[data-scene]')];
const chapterButtons = [...document.querySelectorAll('[data-chapter]')];
let activeChapter = 0;
let manualChapter = null;
function activateChapter(index) {
  activeChapter = index;
  scenes.forEach((scene, i) => {
    const active = i === index;
    scene.classList.toggle('is-active', active);
    scene.inert = !active;
    scene.setAttribute('aria-hidden', String(!active));
  });
  chapterButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  document.querySelector('#stage-count').textContent = `${String(index + 1).padStart(2, '0')} / 04`;
}
activateChapter(0);
chapterButtons.forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.chapter);
  activateChapter(index);
  if (!mobileLayout.matches) {
    manualChapter = index;
    chapters[index].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
  }
}));

let scrollQueued = false;
function updateScroll() {
  scrollQueued = false;
  const available = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty('--scroll', String(available > 0 ? scrollY / available : 0));
  header.classList.toggle('is-scrolled', scrollY > 25);
  const hero = document.querySelector('.hero');
  hero.style.setProperty('--hero-shift', reducedMotion.matches ? '0px' : `${-Math.min(scrollY * .14, 90)}px`);
  if (!mobileLayout.matches) {
    const center = innerHeight * .55;
    const visibleChapter = chapters.findIndex(chapter => {
      const rect = chapter.getBoundingClientRect();
      return rect.top < center && rect.bottom > center;
    });
    if (manualChapter !== null) {
      if (visibleChapter === manualChapter) manualChapter = null;
    } else if (visibleChapter >= 0 && visibleChapter !== activeChapter) activateChapter(visibleChapter);
  }
}
function queueScroll() { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }
window.addEventListener('scroll', queueScroll, { passive: true });
window.addEventListener('resize', () => { manualChapter = null; queueScroll(); });
reducedMotion.addEventListener('change', queueScroll);
updateScroll();

const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveals.unobserve(entry.target); }
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(element => reveals.observe(element));

const device = document.querySelector('#hero-device');
const product = document.querySelector('.hero-product');
product.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse' || innerWidth <= 850) return;
  const rect = product.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  device.style.transform = `rotateX(${-y * 7}deg) rotateY(${-12 + x * 12}deg) rotateZ(${7 + x * 3}deg)`;
});
product.addEventListener('pointerleave', () => { device.style.transform = ''; });
window.addEventListener('resize', () => { device.style.transform = ''; });
reducedMotion.addEventListener('change', () => { device.style.transform = ''; });

const weatherSwitch = document.querySelector('#weather-switch');
weatherSwitch.addEventListener('click', () => {
  const rain = weatherSwitch.getAttribute('aria-pressed') !== 'true';
  weatherSwitch.setAttribute('aria-pressed', String(rain));
  document.querySelector('#hero-weather').textContent = rain ? 'Tình huống minh họa: trời mưa' : 'Một ngày thong thả';
  document.querySelector('#hero-weather-icon').textContent = rain ? '☂' : '☀';
  document.querySelector('#hero-next-stop').textContent = rain ? 'Cân nhắc điểm trong nhà' : 'Dạo bên sông Hương';
  document.querySelector('#hero-next-note').textContent = rain ? 'Xem trước, rồi bạn quyết định' : 'Giữ thời gian để cảm nhận';
  document.querySelector('#hero-message').textContent = rain ? 'Giữ điểm đã đi. Xem một phương án phù hợp hơn cho phần còn lại.' : 'Không cần đi cho hết. Chọn điều bạn muốn nhớ.';
});

const scenarios = {
  rain: { label: 'Tình huống / Trời mưa', title: ['Đổi nhịp một chút.', 'Vẫn có một ngày Huế.'], old: 'Điểm tham quan ngoài trời', next: 'Ưu tiên trải nghiệm trong nhà', reason: 'Giảm thời gian ở ngoài trời, thêm một khoảng nghỉ.' },
  late: { label: 'Tình huống / Trễ giờ', title: ['Bớt vội vàng.', 'Giữ điều bạn muốn nhất.'], old: 'Cố đi đủ phần lịch ban đầu', next: 'Cân nhắc bớt một điểm trong phần lịch còn lại', reason: 'Kiểm tra thời gian di chuyển và giờ mở cửa trước khi đổi.' },
  slow: { label: 'Tình huống / Muốn nghỉ thêm', title: ['Một khoảng nghỉ', 'cũng là chuyến đi.'], old: 'Tiếp tục đi ngay sang điểm kế tiếp', next: 'Thêm thời gian nghỉ, giảm nhịp di chuyển', reason: 'Ưu tiên trải nghiệm bạn thích, giữ lại tiến độ đã hoàn thành.' },
};
const board = document.querySelector('.replan-board');
const boardScene = document.querySelector('#board-scene');
const scenarioButtons = [...document.querySelectorAll('[data-scenario]')];
const applyButton = document.querySelector('#preview-apply');
const previewMessage = document.querySelector('#preview-message');
let currentScenario = 'rain';
let applied = false;
function selectScenario(key, userTriggered = true) {
  const scenario = scenarios[key];
  if (!scenario) return;
  currentScenario = key;
  applied = false;
  scenarioButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scenario === key)));
  document.querySelector('#scenario-label').textContent = scenario.label;
  const title = document.querySelector('#scenario-title');
  title.replaceChildren(document.createTextNode(scenario.title[0]), document.createElement('br'), document.createTextNode(scenario.title[1]));
  document.querySelector('#old-plan').textContent = scenario.old;
  document.querySelector('#new-plan').textContent = scenario.next;
  document.querySelector('#new-reason').textContent = scenario.reason;
  board.classList.remove('is-applied');
  boardScene.classList.toggle('is-raining', key === 'rain');
  boardScene.classList.toggle('user-triggered', userTriggered);
  previewMessage.textContent = 'Đây là phương án minh họa. Chưa thay đổi lịch nào.';
  applyButton.textContent = 'Áp dụng vào ví dụ';
}
scenarioButtons.forEach(button => button.addEventListener('click', () => selectScenario(button.dataset.scenario)));
document.querySelectorAll('[data-demo-preset]').forEach(link => link.addEventListener('click', () => selectScenario(link.dataset.demoPreset)));
applyButton.addEventListener('click', () => {
  applied = !applied;
  board.classList.toggle('is-applied', applied);
  previewMessage.textContent = applied ? 'Đã áp dụng vào ví dụ. Tiến độ đã hoàn thành được giữ lại. Không sửa lịch thật.' : 'Đã khôi phục ví dụ. Bạn có thể xem lại phương án hoặc chọn tình huống khác.';
  applyButton.textContent = applied ? 'Khôi phục ví dụ' : 'Áp dụng vào ví dụ';
});
selectScenario(currentScenario, false);
const rainVisibility = new IntersectionObserver(entries => entries.forEach(entry => boardScene.classList.toggle('is-in-view', entry.isIntersecting)), { threshold: .1 });
rainVisibility.observe(boardScene);

const audio = document.querySelector('#heritage-audio');
const audioButtons = [...document.querySelectorAll('.audio-toggle')];
audioButtons.forEach(button => {
  button.dataset.playLabel = button.querySelector('.audio-button-label').textContent;
  button.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); return; }
    try {
      audioButtons.forEach(item => { item.disabled = true; });
      setAudioStatus('Đang mở đoạn thuyết minh Ngọ Môn…');
      if (audio.error) audio.load();
      await audio.play();
    } catch { setAudioStatus('Chưa phát được âm thanh. Kiểm tra kết nối và chọn nghe để thử lại.'); }
    finally { audioButtons.forEach(item => { item.disabled = false; }); }
  });
});
function setAudioStatus(text) { document.querySelectorAll('.audio-status').forEach(element => { element.textContent = text; }); }
function syncAudio() {
  const playing = !audio.paused && !audio.ended;
  document.body.classList.toggle('audio-playing', playing);
  audioButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(playing));
    button.querySelector('.audio-button-label').textContent = playing ? 'Tạm dừng thuyết minh' : button.dataset.playLabel;
  });
}
audio.addEventListener('playing', () => { syncAudio(); setAudioStatus('Đang phát đoạn thuyết minh mẫu về Ngọ Môn. Chọn tạm dừng khi cần.'); });
audio.addEventListener('pause', () => { syncAudio(); if (!audio.ended) setAudioStatus('Đã tạm dừng. Chọn nghe để tiếp tục.'); });
audio.addEventListener('ended', () => { syncAudio(); setAudioStatus('Đã nghe hết đoạn mẫu. Bạn có thể chọn nghe lại.'); });
audio.addEventListener('waiting', () => setAudioStatus('Đang tải âm thanh, vui lòng chờ một chút…'));
audio.addEventListener('error', () => { syncAudio(); setAudioStatus('Chưa tải được âm thanh. Kiểm tra kết nối và chọn nghe để thử lại.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); });

const dialog = document.querySelector('#heritage-dialog');
const modelHost = document.querySelector('#model-viewport');
const modelStatus = document.querySelector('#model-status');
const retryModel = document.querySelector('#retry-heritage');
const modelControls = [...document.querySelectorAll('[data-model-action]')];
let model = null;
let modelPromise = null;
function showModelStatus(title, detail) {
  modelStatus.hidden = false;
  modelStatus.querySelector('strong').textContent = title;
  modelStatus.querySelector('span').textContent = detail;
}
async function loadModel() {
  if (model) { model.resize(); return; }
  if (modelPromise) return modelPromise;
  retryModel.hidden = true;
  showModelStatus('Đang mở không gian Ngọ Môn…', 'Tải bản preview nhẹ từ mô hình di sản của dự án.');
  modelPromise = (async () => {
    try {
      const heritage = await import('./heritage.js');
      model = await heritage.mountHeritage(modelHost, (progress, error = false) => {
        showModelStatus(error ? 'Cảnh 3D cần được mở lại.' : 'Đang mở không gian Ngọ Môn…', progress);
        if (error) {
          model?.dispose();
          model = null;
          modelControls.forEach(button => { button.disabled = true; });
          retryModel.hidden = false;
        }
      });
      modelStatus.hidden = true;
      modelControls.forEach(button => { button.disabled = false; });
    } catch {
      showModelStatus('Chưa mở được mô hình 3D.', 'Kiểm tra kết nối hoặc thử trình duyệt khác. Bạn vẫn có thể nghe thuyết minh và xem ảnh di sản.');
      retryModel.hidden = false;
    } finally { modelPromise = null; }
  })();
  return modelPromise;
}
document.querySelectorAll('[data-open-heritage]').forEach(button => button.addEventListener('click', () => {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
  audio.pause();
  void loadModel();
}));
document.querySelector('#close-heritage').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
retryModel.addEventListener('click', () => { void loadModel(); });
modelControls.forEach(button => button.addEventListener('click', () => model?.action(button.dataset.modelAction)));
window.addEventListener('pagehide', event => { audio.pause(); if (!event.persisted) model?.dispose(); });

try {
  const appUrl = new URL(window.HUEVIVU_CONFIG?.appUrl);
  if (!['http:', 'https:'].includes(appUrl.protocol)) throw new Error('Unsupported URL');
  document.querySelectorAll('[data-app-link]').forEach(link => {
    const target = new URL(appUrl.href);
    if (link.dataset.appPath) target.pathname = target.pathname.replace(/\/$/, '') + link.dataset.appPath;
    link.href = target.href;
  });
} catch {
  document.querySelectorAll('[data-app-link]').forEach(link => { link.href = '#app-link-message'; link.textContent = 'Xem trạng thái bản trải nghiệm'; });
  const message = document.querySelector('#app-link-message');
  message.hidden = false;
  message.textContent = 'Chưa có URL sản phẩm hợp lệ. Các ví dụ, thuyết minh và mô hình di sản trên trang vẫn có thể trải nghiệm.';
}
