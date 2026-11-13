const input = document.querySelector('#access-code');
const toggle = document.querySelector('.login-toggle');
toggle.hidden = false;
toggle.addEventListener('click', () => {
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(visible));
  toggle.textContent = visible ? 'Ascunde codul' : 'Arată codul';
});
