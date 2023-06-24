const {test, expect} = require('@playwright/test');
const {chromium} = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const player = require('play-sound')(opts = {})

chromium.use(StealthPlugin())

async function randomDelay(page) {
    await page.waitForTimeout(500 + Math.random() * 1000);
}

chromium.launch({headless: false, devtools: false, timeout: 30_000}).then(async (browser) => {
    const page = await browser.newPage();
    await page.setViewportSize({width: 1280, height: 900});

    do {
        // Go to the website
        await page.goto('https://otv.verwalt-berlin.de/ams/TerminBuchen');

        // Expect a title "to contain" a substring.
        await expect(page).toHaveTitle(/Termin buchen/);

        await page.getByRole('link', {name: 'Termin buchen'}).click();

        const termsCheckbox = await page.getByRole('checkbox', {name: 'Ich erkläre hiermit, die Informationen auf dieser Seite gelesen und verstanden zu haben. Mit der Nutzung dieses Service-Angebots erteile ich meine Zustimmung zur Erhebung und Nutzung meiner persönlichen Daten.'});
        await termsCheckbox.isVisible();

        await termsCheckbox.check();

        await page.getByRole('button', {name: 'Weiter'}).click();

        const nationality = await page.getByRole('combobox', {name: 'Staatsangehörigkeit'});
        await nationality.isVisible();
        await nationality.selectOption({label: 'Syrien (Familienname A - E)'});
        await randomDelay(page);

        const numPersons = await page.getByRole('combobox', {name: 'Anzahl der Personen, die einen Aufenthaltstitel beantragen (auch ausländische Ehepartner und Kinder)'});
        await numPersons.isVisible();
        numPersons.selectOption({label: 'eine Person'});
        await randomDelay(page);

        const otherPerson = await page.getByRole('combobox', {name: 'Leben Sie in Berlin zusammen mit einem Familienangehörigen (z.B. Ehepartner, Kind)'});
        await otherPerson.isVisible();
        otherPerson.selectOption({label: 'ja'});
        await randomDelay(page);

        const otherNationality = await page.getByRole('combobox', {name: 'Staatsangehörigkeit des Familienangehörigen?'});
        await otherNationality.isVisible();
        otherNationality.selectOption({label: 'Syrien (Familienname A - E)'});
        await randomDelay(page);

        await page.locator('label[for=SERVICEWAHL_DE3475-0-2]').click({noWaitAfter: true});
        await randomDelay(page);

        await page.locator('label[for=SERVICEWAHL_DE_475-0-2-5]').click({noWaitAfter: true});
        await randomDelay(page);

        await page.locator('label[for=SERVICEWAHL_DE475-0-2-5-324861]').click({noWaitAfter: true});
        await randomDelay(page);

        const nextButton = await page.getByRole('button', {name: 'Weiter'});
        await nextButton.click();

        await page.waitForTimeout(5_000);

        // now we should see the appointments
        /*
        <td class="  ui-datepicker-current-day" data-handler="selectDay" data-event="click" data-month="5" data-year="2023"><a class="ui-state-default ui-state-active" href="#">29</a></td>
         */
        const dates = await Promise.all((await page.$$('td[data-handler]')).map(async x => {
            const year = parseInt(await x.getAttribute('data-year'));
            const month = parseInt((await x.getAttribute('data-month'))) + 1;
            const day = parseInt((await x.textContent()).trim());
            return `${year}-${month}-${day}`;
        }));

        try {
            const selectedDayNode = (await page.$$('td.ui-datepicker-current-day'))[0];
            const selectedDay = await selectedDayNode.textContent();
            const selectedMonth = await (await (await selectedDayNode.$('../../../../..')).$$('.ui-datepicker-title'))[0].textContent();

            if (selectedMonth.indexOf("Juli") >= 0) {
                dates.push("2023-07-" + selectedDay);
            }
        } catch (ex) {
            console.log("FAILED TO DETERMINE CURRENT DAY", ex);
        }

        console.log("Available dates", dates);

        if (dates.map(date => date.split('-')).filter(date => date[1] === '7').length > 0) {
            console.log('FOUND GOOD DATES!!', dates);
            player.play('alarm.wav');
            await page.pause();
        } else {
            console.log("NO GOOD DATES FOUND, TRY AGAIN LATER");
            // try again in 3 to 6 minutes
            await page.waitForTimeout(60 * 1000 * (3 + Math.random() * 3));
        }
    } while (true);
});
