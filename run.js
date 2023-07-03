const {test, expect} = require('@playwright/test');
const {chromium} = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const player = require('play-sound')(opts = {})

chromium.use(StealthPlugin())

async function randomDelay(page) {
    await page.waitForTimeout(500 + Math.random() * 1000);
}

async function run(headless, loop) {
    await chromium.launch({headless: headless, devtools: false, timeout: 30_000}).then(async (browser) => {
        try {
            const page = await browser.newPage();
            await page.setViewportSize({width: 1280, height: 900});

            do {
                console.log((new Date().toLocaleTimeString()) + " Checking for appointments...");

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
                await nextButton.isVisible();
                await nextButton.click();

                await page.waitForTimeout(5_000);
                await page.locator('td.ui-datepicker-current-day').waitFor({state: 'visible', timeout: 30_000});

                // dates in YYYY-M-D format (no 0 padding for numbers < 10)
                const dates = await Promise.all((await page.$$('td[data-handler]')).map(async x => {
                    const year = parseInt(await x.getAttribute('data-year'));
                    const month = parseInt((await x.getAttribute('data-month'))) + 1;
                    const day = parseInt((await x.textContent()).trim());
                    return `${year}-${month}-${day}`;
                }));

                try {
                    const selectedDayNode = (await page.$$('td.ui-datepicker-current-day'))[0];
                    const selectedDay = await selectedDayNode.textContent();
                    const tableTitle = await (await (await selectedDayNode.$('../../../../..')).$$('.ui-datepicker-title'))[0].textContent();
                    const selectedMonthGermanName = tableTitle.split(/\s+/)[0]; // Juni, Juli, August etc.
                    const selectedMonth = ({
                        'Januar': '1',
                        'Februar': '2',
                        'März': '3',
                        'April': '4',
                        'Mai': '5',
                        'Juni': '6',
                        'Juli': '7',
                        'August': '8',
                        'September': '9',
                        'Oktober': '10',
                        'November': '11',
                        'Dezember': '12',
                    })[selectedMonthGermanName];
                    if (!selectedMonth) {
                        console.log(`'${selectedMonthGermanName}' is not a valid month name (table title: ${tableTitle})`);
                    }
                    const currentDate = `2023-${selectedMonth}-${selectedDay}`;
                    if (dates.indexOf(currentDate) < 0) {
                        dates.push(currentDate);
                    }
                } catch (ex) {
                    console.log("FAILED TO DETERMINE CURRENT DAY", ex);
                }

                console.log((new Date().toLocaleTimeString()) + " Available dates: " + dates.join(", "));

                if (dates.find(isGoodDate)) {
                    console.log('FOUND GOOD DATES!!', dates);
                    player.play('alarm.wav');

                    // give us some time to book the appointment manually
                    await page.waitForTimeout(60 * 1000 * 30); // appointment is available for 30 min

                    await page.pause();
                } else {
                    // try again in 3 to 6 minutes
                    await page.waitForTimeout(60 * 1000 * (3 + Math.random() * 3));
                }
            } while (loop);

            console.log("closing browser...");
            await browser.close();
        } finally {
            await browser.close();
        }
    });
}

// date = YYYY-M-D
function isGoodDate(date) {
    const parts = date.split("-");
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return (month === 7 && day >= 15) || (month === 8 && day < 14);
}

function mainLoop() {
    (async () => {
        do {
            await run(false, true);
        } while (true);
    })();
}

if (process.argv.length > 2 && process.argv[2] === 'once') {
    console.log("RUN ONCE");
    (async function () {
        await run(true, false);
    })();

    console.log('finished');
} else {
    console.log("RUN LOOP");
    mainLoop();
}