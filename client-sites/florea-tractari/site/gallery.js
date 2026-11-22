const gallery = document.querySelector('[data-gallery]');
const track = gallery.querySelector('[data-gallery-track]');
const slides = Array.from(track.children);
const previous = gallery.querySelector('[data-previous]');
const next = gallery.querySelector('[data-next]');
const rotation = gallery.querySelector('[data-gallery-rotation]');
const position = gallery.querySelector('[data-gallery-position]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rotationDelay = 5500;

let rotationEnabled = !motion.matches;
let inView = false;
let hovered = false;
let timer;

function closestSlide() {
  const offset = slides[0].offsetLeft + track.scrollLeft;
  return slides.reduce((closest, slide, index) =>
    Math.abs(slide.offsetLeft - offset) < Math.abs(slides[closest].offsetLeft - offset) ? index : closest, 0);
}

function atEnd() {
  return track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
}

function update() {
  const label = atEnd() ? 'Ultimele fotografii' : `${closestSlide() + 1} / ${slides.length}`;
  if (position.textContent !== label) position.textContent = label;
  previous.setAttribute('aria-disabled', String(track.scrollLeft <= 2));
  next.setAttribute('aria-disabled', String(atEnd()));
}

function goTo(index, immediate = false) {
  track.scrollTo({
    left: slides[index].offsetLeft - slides[0].offsetLeft,
    behavior: immediate || motion.matches ? 'instant' : 'smooth',
  });
}

function scheduleRotation() {
  clearTimeout(timer);
  const rotating = rotationEnabled && inView && !hovered && !document.hidden;
  position.setAttribute('aria-live', rotating ? 'off' : 'polite');
  rotation.textContent = rotationEnabled ? 'Pauză' : 'Redă';
  rotation.setAttribute('aria-label', rotationEnabled ? 'Pauză derulare automată' : 'Redă automat');
  if (!rotating) return;

  timer = setTimeout(() => {
    if (atEnd()) goTo(0, true);
    else goTo(Math.min(slides.length - 1, closestSlide() + 1));
    scheduleRotation();
  }, rotationDelay);
}

function pause() {
  rotationEnabled = false;
  scheduleRotation();
}

function move(direction) {
  pause();
  const control = direction > 0 ? next : previous;
  if (control.getAttribute('aria-disabled') === 'true') return;
  goTo(Math.max(0, Math.min(slides.length - 1, closestSlide() + direction)));
}

rotation.addEventListener('click', () => {
  rotationEnabled = !rotationEnabled;
  scheduleRotation();
});
previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
track.addEventListener('scroll', update, { passive: true });
track.addEventListener('pointerdown', pause, { passive: true });
track.addEventListener('wheel', event => {
  if (event.deltaX !== 0 || event.shiftKey) pause();
}, { passive: true });
track.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  move(event.key === 'ArrowRight' ? 1 : -1);
});
gallery.addEventListener('focusin', event => {
  if (event.target !== rotation || rotation.matches(':focus-visible')) pause();
});
gallery.addEventListener('pointerenter', event => {
  if (event.pointerType !== 'mouse') return;
  hovered = true;
  scheduleRotation();
});
gallery.addEventListener('pointerleave', () => {
  hovered = false;
  scheduleRotation();
});
document.addEventListener('visibilitychange', scheduleRotation);
motion.addEventListener('change', pause);
window.addEventListener('resize', update);

const galleryObserver = new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting && entry.intersectionRatio >= .35;
  scheduleRotation();
}, { threshold: .35 });

gallery.querySelector('[data-gallery-controls]').hidden = false;
update();
galleryObserver.observe(track);
scheduleRotation();
