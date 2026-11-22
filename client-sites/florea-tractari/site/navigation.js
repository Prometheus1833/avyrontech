const menu = document.querySelector('.mobile-menu');
const menuToggle = menu.querySelector('summary');

menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) menu.open = false;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    menuToggle.focus();
  }
});

const floatingContacts = document.querySelector('.float-actions');
const exclusionZones = document.querySelectorAll('.hero, .inner-hero, .site-footer');
const visibility = new Map();

const contactObserver = new IntersectionObserver(entries => {
  for (const entry of entries) visibility.set(entry.target, entry.isIntersecting);
  floatingContacts.hidden = [...visibility.values()].some(Boolean);
});

exclusionZones.forEach(zone => contactObserver.observe(zone));

const motionPreference = window.matchMedia('(prefers-reduced-motion: no-preference)');
if (motionPreference.matches) {
  const sections = document.querySelectorAll('main .section > .wrap, .area-inner, .band-inner');
  const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('section-arrival');
      sectionObserver.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -9% 0px' });

  sections.forEach(section => sectionObserver.observe(section));
}
