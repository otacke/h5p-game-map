import MediaScreen from './media-screen.js';
import './end-screen.scss';

/** Class representing the end screen */
export default class EndScreen extends MediaScreen {

  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);
  }
}
