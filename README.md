# Usage

Checks for available appointments at Ausländerbehörde Berlin.
Before running, adjust the function `isGoodDate` in `run.js` to your needs.

The program will open a browser window and show you the available dates.
If a suitable appointment is found a warning sound is played and the programs keeps 
the browser window open for 30 minutes. 
If no suitable appointments are found, the program will wait for a randomized amount of time 
between 3 and 6 minutes, and then it will try again, indefinitely.

```
npm install
npx playwright install
npm start [once|watch]
```