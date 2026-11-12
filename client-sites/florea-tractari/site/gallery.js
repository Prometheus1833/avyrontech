const gallery = document.querySelector('[data-gallery]');
const track = gallery.querySelector('[data-gallery-track]');
const slides = Array.from(track.children);
const previous = gallery.querySelector('[data-previous]');
const next = gallery.querySelector('[data-next]');
const position = gallery.querySelector('[data-gallery-position]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

function closestSlide() {
  const start = slides[0].offsetLeft;
  return slides.reduce((closest, slide, index) => {
    const distance = Math.abs(slide.offsetLeft - start - track.scrollLeft);
    return distance < Math.abs(slides[closest].offsetLeft - start - track.scrollLeft) ? index : closest;
  }, 0);
}

function update() {
  const index = closestSlide();
  const atStart = track.scrollLeft <= 2;
  const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  position.textContent = atEnd ? 'Ultimele fotografii' : `${index + 1} / ${slides.length}`;
  previous.setAttribute('aria-disabled', String(atStart));
  next.setAttribute('aria-disabled', String(atEnd));
}

function move(direction) {
  const control = direction > 0 ? next : previous;
  if (control.getAttribute('aria-disabled') === 'true') return;
  const index = Math.max(0, Math.min(slides.length - 1, closestSlide() + direction));
  track.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: motion.matches ? 'instant' : 'smooth' });
}

previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
track.addEventListener('scroll', update, { passive: true });
track.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  move(event.key === 'ArrowRight' ? 1 : -1);
});
window.addEventListener('resize', update);
gallery.querySelector('[data-gallery-controls]').hidden = false;
update();
