(() => {
  const scene = document.getElementById('scene');
  const figure = document.querySelector('.cosmic-figure');
  if (!scene || !figure || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let x = 0, y = 0, raf = 0;
  const move = () => {
    raf = 0;
    figure.style.setProperty('--tilt-x', `${y * -5}deg`);
    figure.style.setProperty('--tilt-y', `${x * 7}deg`);
    figure.style.transform = `translateZ(16px) translate(${x * 10}px, ${y * 7 - 8}px) rotateY(${x * 7}deg) rotateX(${y * -5}deg)`;
  };
  document.querySelector('.stage')?.addEventListener('pointermove', (event) => {
    x = event.clientX / innerWidth - .5;
    y = event.clientY / innerHeight - .5;
    if (!raf) raf = requestAnimationFrame(move);
  });
})();
