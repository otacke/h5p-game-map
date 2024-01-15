/**
 * Animate DOM element.
 * @param {HTMLElement} element Element to animate.
 * @param {string|null} animationName Animation name, null to stop animation.
 * @param {function} [callback] Callback when done.
 */
export const animate = (element, animationName = '', callback = () => {}) => {
  if (!element) {
    return;
  }

  if (animationName === null) {
    element.dispatchEvent(new Event('animationend'));
    return;
  }
  else if (typeof animationName !== 'string') {
    return;
  }

  // Determine mediaQuery result for prefers-reduced-motion preference
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  )?.matches;

  if (reduceMotion) {
    return;
  }

  const className = `animate-${animationName}`;

  const listener = (event) => {
    if (
      event.animationName !== animationName &&
      event.animationName !== undefined // Clearing animation.
    ) {
      return;
    }

    element.classList.remove('animate');
    element.classList.remove(className);
    element.removeEventListener('animationend', listener);

    callback();
  };

  element.addEventListener('animationend', listener);

  element.classList.add('animate');
  element.classList.add(className);
};
