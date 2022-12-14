import MediaScreen from './media-screen';
import './start-screen.scss';

/** Class representing the start screen */
export default class StartScreen extends MediaScreen {

  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);
  }
}
