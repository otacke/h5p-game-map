/**
 * Animate DOM element.
 * @param {HTMLElement} element Element to animate.
 * @param {string} animationName Animation name.
 */
export const animate = (element, animationName = '') => {
  if (!element || !animationName || typeof animationName !== 'string') {
    return;
  }

  const className = `animate-${animationName}`;

  const listener = (event) => {
    if (event.animationName !== animationName) {
      return;
    }

    element.classList.remove(className);
    element.removeEventListener('animationend', listener);
  };

  element.addEventListener('animationend', listener);
  element.classList.add(className);
};
