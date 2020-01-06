// Output setup
import debugHelper from "./../util/debug_helper";
const { debug, logError, print } = debugHelper(__filename);

import * as moment from "moment";
import { Page } from "puppeteer";

const sent = {};

const generateMessage = (name: string, text: string) => `
>> -- AUTO-REPLY -- <<

Hola ${name}!
                    
${text}

>> --- v1.0.1 (beta) --- <<
`;

const sendMessage = async (page: Page, name: string, text: string) => {
    try {
        const userSelector = `#pane-side span[title="${name}"]`;
        await page.waitFor(userSelector);
        await page.click(userSelector);
        await page.waitFor('#main > footer div.selectable-text[contenteditable]');
        await page.click('#main > footer div.selectable-text[contenteditable]');
        const titleName = await page.$eval('#main > header span[title]', e => e.textContent);
        if (titleName !== name) {
            logError(`Can't load chat with ${name}`);
            return false;
        }

        const parts = text.replace('/\\+n/g', '\n').split('\n');

        for (var i = 0; i < parts.length; i++) {
            await page.keyboard.type(parts[i]);
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
        }

        await page.waitFor(1000);
        await page.keyboard.press('Enter');
        print(`Sent to ${name} at ${moment().format('HH:mm')}`);
        return true;
    
    } catch(e) {
        return false;
    }
};

export default {
    
    async chatMonitor(page: Page, CHAT_REPLY_INTERVAL_MINUTES: number, CHECK_UNREAD_INTERVAL_SECONDS: number, MESSAGE: string) {
        const allUnreads = await page.$eval('#pane-side', (ps) => {
            return Array.from(ps.firstChild.firstChild.firstChild.childNodes || [])
                .map((c: any) => {
                    return {
                        isGroup: null, //TODO group detection
                        num: c.lastChild.lastChild.lastChild.lastChild.lastChild.textContent || '0',
                        name: c.lastChild.firstChild.lastChild.firstChild.firstChild.firstChild.firstChild.title || ''
                    }
                })
                .filter((c: any) => parseInt(c.num) > 0 && c.name.length > 0)
        });

        const toReply = [];

        for (const unread of allUnreads) {
            
            const minsDiff = moment().diff(sent[unread.name], 'minutes');

            if( !sent[unread.name] || minsDiff >= CHAT_REPLY_INTERVAL_MINUTES ) {
                toReply.push(unread);

            } else {
                //test: check chat
                const userSelector = `#pane-side span[title="${unread.name}"]`;
                await page.waitFor(userSelector);
                await page.click(userSelector);
                await page.waitFor('#main > footer div.selectable-text[contenteditable]');
                sent[unread.name] = moment();
                print(`Skipped ${unread.name}'s chat: Only ${minsDiff} minutes passed since last auto-reply.`);
            }
        }

        for (const target of toReply) {
            const text = generateMessage(target.name, MESSAGE);
            if (await sendMessage(page, target.name, text)) {
                sent[target.name] = moment();
            } else {
                logError(`Failed messaging ${target.name}`);
            }
        }

        //await page.waitFor(CHECK_UNREAD_INTERVAL_SECONDS * 1000);
        setTimeout(
            () => this.chatMonitor(page, CHAT_REPLY_INTERVAL_MINUTES, CHECK_UNREAD_INTERVAL_SECONDS, MESSAGE),
            CHECK_UNREAD_INTERVAL_SECONDS * 1000
        );
    }
}