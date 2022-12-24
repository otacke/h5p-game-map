import Util from '@services/util';
import './media-screen.scss';

/** Class representing a media screen */
export default class MediaScreen {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {number} [params.contentId] H5P content id.
   * @param {string} [params.titleText] Title text.
   * @param {object} [params.l10n={}] Localization strings.
   * @param {string} [params.l10n.buttonText='Close'] Default button text.
   * @param {object} [params.a11y={}] Screen reader strings.
   * @param {object} [params.a11y.screenOpened] Screen opened text.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onButtonClicked] Callback when button clicked.
   * @param {function} [callbacks.read] Callback to read on screen reader.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      buttons: [],
      l10n: {
        buttonText: 'Close'
      },
      a11y: {
        screenOpened: 'Screen was opened'
      }
    }, params);

    this.callbacks = Util.extend({
      onButtonClicked: () => {},
      onRead: () => {}
    }, callbacks);

    this.buttons = [];

    // Container
    this.dom = this.buildDOM();

    // Visual header (placeholder)
    this.visuals = this.buildVisualsElement(this.params.medium);
    this.dom.append(this.visuals);

    this.setMedium(this.params.medium);

    // Introduction
    this.introduction = this.buildIntroduction();
    this.setIntroduction(this.params.introduction);
    this.dom.append(this.introduction);

    // Content
    this.content = this.buildContent();
    this.setContent(this.params.content);
    this.dom.append(this.content);

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('media-screen-buttons-wrapper');
    this.dom.append(buttonsWrapper);

    // Button
    this.params.buttons.forEach((buttonParams) => {
      const button = this.buildButton(buttonParams.id, buttonParams.text);
      buttonsWrapper.append(button);
      this.buttons.push(button);
    });
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
    if (this.params.id) {
      dom.classList.add(this.params.id);
    }

    return dom;
  }

  /**
   * Create an element which contains both medium and the background bar.
   *
   * @returns {HTMLElement} Visual stuff for cover.
   */
  buildVisualsElement() {
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
   * @returns {HTMLElement} Title element.
   */
  buildIntroduction() {
    const introduction = document.createElement('div');
    introduction.classList.add('media-screen-introduction');

    return introduction;
  }

  /**
   * Build content.
   *
   * @returns {HTMLElement} Content element.
   */
  buildContent() {
    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('media-screen-content');

    return descriptionElement;
  }

  /**
   * Build button.
   *
   * @param {string} id Button id.
   * @param {string} buttonText Button text.
   * @returns {HTMLElement} Button element.
   */
  buildButton(id, buttonText) {
    const button = document.createElement('button');
    button.innerText = buttonText;
    button.addEventListener('click', () => {
      this.hide();
      this.callbacks.onButtonClicked(id);
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('media-screen-button');
    buttonWrapper.classList.add(`media-screen-button-${id}`);
    buttonWrapper.appendChild(button);

    return buttonWrapper;
  }

  /**
   * Set introduction text.
   *
   * @param {string} html Text for title element.
   */
  setIntroduction(html) {
    if (html) {
      this.introduction.innerHTML = html;
      this.introduction.classList.remove('display-none');
    }
    else {
      this.introduction.classList.add('display-none');
    }
  }

  /**
   * Set content.
   *
   * @param {HTMLElement} content Content.
   */
  setContent(content) {
    if (content) {
      this.content.innerHTML = '';
      this.content.append(content);
      this.content.classList.remove('display-none');
    }
    else {
      this.content.classList.add('display-none');
    }
  }

  /**
   * Set medium.
   *
   * @param {object} medium object.
   */
  setMedium(medium) {
    this.medium = medium;
    this.mediumFile = this.getMediumFile(medium);

    if (this.mediumFile) {

      // Remove old visual
      const newVisuals = this.buildVisualsElement(this.params.medium);
      this.dom.replaceChild(newVisuals, this.visuals);
      this.visuals = newVisuals;

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
    else {
      this.visuals.classList.add('display-none');
    }
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

    // Preparation
    if ((this.medium.library || '').split(' ')[0] === 'H5P.Video') {
      this.medium.params.visuals.fit = false; // TODO: for all types?
    }

    H5P.newRunnable(
      this.medium,
      this.params.contentId,
      H5P.jQuery(this.visuals),
      false,
      { metadata: this.medium.medatata }
    );

    // Postparation
    if ((this.medium.library || '').split(' ')[0] === 'H5P.Image') {
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
   * @param {boolean} [params.readOpened] If true, announce screen was opened.
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');

    if (params.readOpened) {
      this.callbacks.read(this.params.a11y.screenOpened);
    }

    // Read before focussing button
    window.setTimeout(() => {
      if (params.focusButton && this.buttons.length) {
        this.buttons[0].querySelector('button').focus();
      }
    }, 100);
  }

  /**
   * Hide title screen.
   */
  hide() {
    this.dom.classList.add('display-none');
  }
}
