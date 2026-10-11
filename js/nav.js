/* ==========================================================
   PRESSINGS.XYZ: NAV (nav.js)
   Opens and closes the mobile menu. Loaded on every page.
   ========================================================== */

const menu = document.getElementById('mobileMenu');
const hamburger = document.getElementById('hamburger');

hamburger.addEventListener('click', () => {
  menu.classList.toggle('open');
  hamburger.classList.toggle('open');
});

// Tapping anywhere outside the menu closes it
document.addEventListener('click', e => {
  if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
    menu.classList.remove('open');
    hamburger.classList.remove('open');
  }
});
