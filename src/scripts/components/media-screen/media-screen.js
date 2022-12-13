import Util from '@services/util';
import './media-screen.scss';

/** Class representing a madia screen */
export default class MediaScreen {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {number} [params.contentId] H5P content id.
   * @param {string} [params.titleText] Title text.
   * @param {object} [params.l10n={}] Localization strings.
   * @param {string} [params.l10n.buttonText='Close'] Default button text.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onButtonClicked] Callback when button clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      titleText: '',
      l10n: {
        buttonText: 'Close'
      }
    }, params);

    this.callbacks = Util.extend({
      onButtonClicked: () => {}
    }, callbacks);

    // Container
    this.dom = this.buildDOM();

    this.mediumFile = this.getMediumFile(this.params.medium);

    // Visual header
    if (this.mediumFile) {
      this.visuals = this.buildVisualsElement(this.params.medium);
      if (this.visuals) {
        this.dom.appendChild(this.visuals);
      }
    }

    // Introduction
    if (this.params.introduction) {
      this.dom.appendChild(this.buildIntroduction(this.params.introduction));
    }

    // Content
    if (this.params.content) {
      this.content = this.buildContent(this.params.content);
      this.dom.appendChild(this.content);
    }

    // Button
    this.dom.appendChild(
      this.buildButton(this.params.l10n.buttonText)
    );

    if (this.mediumFile) {
      /*
      * Get started once visible and ready. YouTube requires the video to be
      * attached to the DOM.
      */
      window.requestIdleCallback(() => {
        this.observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            this.observer.unobserve(this.dom);
            this.initMedia();
          }
        }, {
          root: document.documentElement,
          threshold: 0
        });
        this.observer.observe(this.dom);
      });
    }
  }

  /**
   * Return the DOM for this class.
   *
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Create the top level element.
   *
   * @returns {HTMLElement} Cover.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('media-screen');
    return dom;
  }

  /**
   * Create an element which contains both medium and the background bar.
   *
   * @param {object} [params={}] Parameters.
   * @param {object} params.params = H5P media content parameters.
   * @returns {HTMLElement} Visual stuff for cover.
   */
  buildVisualsElement(params = {}) {
    if (!params.params) {
      return null;
    }

    const visuals = document.createElement('div');
    visuals.classList.add('media-screen-medium');

    return visuals;
  }

  /**
   * Build element responsible for the bar behind medium.
   *
   * @returns {HTMLElement} Horizontal bar in the background.
   */
  buildBar() {
    const coverBar = document.createElement('div');
    coverBar.classList.add('media-screen-bar');

    return coverBar;
  }

  /**
   * Build introduction.
   *
   * @param {string} introductionHTML Text for title element.
   * @returns {HTMLElement} Title element.
   */
  buildIntroduction(introductionHTML) {
    const introduction = document.createElement('p');
    introduction.innerHTML = introductionHTML;

    const introductionWrapper = document.createElement('div');
    introductionWrapper.classList.add('media-screen-introduction');
    introductionWrapper.appendChild(introduction);

    return introductionWrapper;
  }

  /**
   * Build content.
   *
   * @param {HTMLElement} content Content.
   * @returns {HTMLElement} Content element.
   */
  buildContent(content) {
    if (!content) {
      return null;
    }

    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('media-screen-content');
    descriptionElement.innerHTML = content;

    return descriptionElement;
  }

  /**
   * Build button.
   *
   * @param {string} buttonText Button text.
   * @returns {HTMLElement} Button element.
   */
  buildButton(buttonText) {
    const button = document.createElement('button');
    button.innerText = buttonText;
    button.addEventListener('click', () => {
      this.hide();
      this.callbacks.onButtonClicked();
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('media-screen-button');
    buttonWrapper.appendChild(button);

    return buttonWrapper;
  }

  /**
   * Get medium file data.
   *
   * @param {object} medium H5P medium file data.
   * @returns {object|null} Media file data.
   */
  getMediumFile(medium) {
    if (medium?.params?.file) {
      return medium.params.file;
    }

    if (
      Array.isArray(medium?.params?.sources) &&
      medium.params.sources.length
    ) {
      return medium.params.sources[0];
    }

    return null;
  }

  /**
   * Initialize Media.
   * The YouTube handler requires the video wrapper to be attached to the DOM
   * already.
   */
  initMedia() {
    if (!this.visuals || !this.mediumFile ||
      this.params.contentId === undefined
    ) {
      return;
    }

    const medium = this.params.medium;

    // Preparation
    if ((medium.library || '').split(' ')[0] === 'H5P.Video') {
      medium.params.visuals.fit = false; // TODO: for all types?
    }

    H5P.newRunnable(
      medium,
      this.params.contentId,
      H5P.jQuery(this.visuals),
      false,
      { metadata: medium.medatata }
    );

    // Postparation
    if ((medium.library || '').split(' ')[0] === 'H5P.Image') {
      const image = this.visuals.querySelector('img') ||
        this.visuals.querySelector('.h5p-placeholder');
      image.style.height = 'auto';
      image.style.width = 'auto';
    }

    this.visuals.appendChild(this.buildBar());
  }

  /**
   * Show.
   *
   * @param {object} params Parameters.
   * @param {boolean} [params.focusButton] If true, start button will get focus.
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');

    if (params.focusButton) {
      this.button.focus();
    }
  }

  /**
   * Hide title screen.
   */
  hide() {
    this.dom.classList.add('display-none');
  }
}
