/* eslint-disable no-unused-vars */
// Output setup
// eslint-disable-next-line no-unused-vars
import { Browser, Page } from 'puppeteer';
import * as moment from 'moment';
import debugHelper from '../util/debug_helper';

import BrowserHandler from './browser_handler';
import ChatHandler from './chat_handler';

const { print } = debugHelper(__filename);

// Load config
const {
  NODE_ENV = 'development',
  WAAR_DATA_DIR_PATH = '.cache',
  WAAR_CHAT_REPLY_INTERVAL_MINUTES = 90,
  WAAR_CHECK_UNREAD_INTERVAL_SECONDS = 10,
} = process.env;

const menuHandler = {
  printParams() {
    const params = {};
    [...Object.keys(process.env).filter((k) => k.startsWith('WAAR_')), 'NODE_ENV']
      .forEach((k) => {
        params[k] = process.env[k];
      });

    print({ params });
  },

  async launchWaar(message: string) {
    // Launch Chrome
    const browser: Browser = await BrowserHandler.launchBrowser(WAAR_DATA_DIR_PATH);
    const page: Page = await BrowserHandler.loadWhatsappWeb(browser);

    // Launch Chat Monitor
    print(`Auto-Reply started at ${moment().format('HH:mm DD/MM/YYYY')}`);
    ChatHandler.chatMonitor(
      page,
      Number(WAAR_CHAT_REPLY_INTERVAL_MINUTES),
      Number(WAAR_CHECK_UNREAD_INTERVAL_SECONDS),
      message,
    );
  },
};

export default menuHandler;
