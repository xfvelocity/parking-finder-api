const puppeteer = require("puppeteer");

async function scrapeParkopedia(location) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to Parkopedia
  await page.goto("https://www.parkopedia.com/", { waitUntil: "networkidle2" });

  page.on("console", (msg) => console.log(msg.text()));

  // Type the location into the search bar
  await page.type("input", location);

  await page.waitForSelector(".SuggestionList");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await Promise.all([
    await page.click(".SearchForm__submit"),
    page.waitForNavigation({ waitUntil: "networkidle2" }), // Wait for page load
  ]);

  // Wait for parking results to load
  await page.waitForSelector(".fc-cta-consent");
  await page.click(".fc-cta-consent");

  await page.waitForSelector(".LocationsList");

  // Extract parking data
  const parkingData = await page.evaluate(async () => {
    const parkingLots = document.querySelectorAll(".LocationListItem");

    const results = await Promise.all(
      Array.from(parkingLots).map(async (lot) => {
        lot.querySelector(".LocationListItem__containerLink").click();

        const priceElements = document.querySelectorAll(
          ".LocationDetailsPrices__dataList__item"
        );

        return Array.from(priceElements).map((elem) => {
          const priceText =
            elem
              .querySelector(".LocationDetailsPrices__dataList__item__label")
              ?.textContent?.trim() || "";
          const priceValue =
            elem
              .querySelector(".LocationDetailsPrices__dataList__item__value")
              ?.textContent?.trim() || "";
          const priceSubText =
            elem
              .querySelector(
                ".LocationDetailsPrices__dataList__item__subtext__item"
              )
              ?.textContent?.trim() || "";

          return {
            text: priceText,
            subText: priceSubText,
            value: priceValue,
          };
        });
      })
    );

    return results;
  });

  await browser.close();

  return parkingData;
}

// Example usage:
scrapeParkopedia("London")
  .then((data) => console.log("Parking Prices:", data))
  .catch((err) => console.error("Error:", err));
