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
