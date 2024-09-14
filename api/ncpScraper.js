const puppeteer = require("puppeteer");

const { Map, Info } = require("./models/index");
const { v4: uuidv4 } = require("uuid");
const { calculateHoursBetween } = require("./helpers/generic");
const { default: axios } = require("axios");

let logs;
let page;
let browser;

const getNcpTime = (item) => {
  let match;
  let newItem = {
    appPrice: item.tariffTitle.includes("APP"),
    price: item.tariffCharge,
    text: item.tariffTitle.toLowerCase(),
  };

  // x hour
  if (
    (match = item.tariffTitle
      .toLowerCase()
      .match(/^(?:app\s+)?(?:\w+\s+)?(\d+)\s*hours?$/i))
  ) {
    return { ...newItem, hours: parseInt(match[1], 10) };
  }

  // x to x hours
  if (
    (match = item.tariffTitle
      .toLowerCase()
      .match(/^(?:app\s+)?(\d+)\s*to\s*(\d+)\s*hours$/))
  ) {
    return { ...newItem, hours: parseInt(match[2], 10) };
  }

  return null;
};

const getDaysBetween = (startKey, endKey, enumObj) => {
  const keys = Object.keys(enumObj);
  const startIndex = keys.indexOf(startKey);
  const endIndex = keys.indexOf(endKey);

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return []; // Return an empty array if the keys are invalid or in the wrong order
  }

  const resultKeys = keys.slice(startIndex, endIndex + 1);
  return resultKeys.map((key) => enumObj[key]);
};

const getNcpOpeningHours = (openHours) => {
  const dayEnum = {
    Mo: "monday",
    Tu: "tuesday",
    We: "wednesday",
    Th: "thursday",
    Fr: "friday",
    Sa: "saturday",
    Su: "sunday",
  };

  const hours = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  const differentDays = openHours.split("; ");

  if (differentDays[1]) {
    differentDays.forEach((days) => {
      let [day, time] = days.split(" ");
      time = time.replace(".", "");
      const splitDays = day.split("-");

      if (splitDays[1]) {
        const daysBetween = getDaysBetween(splitDays[0], splitDays[1], dayEnum);

        daysBetween.forEach((d) => {
          const splitTime = time.split("-");

          hours[d] = {
            openingTime: splitTime[0],
            closingTime: splitTime[1],
          };
        });
      } else {
        const splitTime = time.split("-");

        hours[dayEnum[splitDays]] = {
          openingTime: splitTime[0],
          closingTime: splitTime[1],
        };
      }
    });
  } else {
    if (openHours.includes("24 Hr")) {
      Object.keys(hours).forEach(
        (k) =>
          (hours[k] = {
            openingTime: "00:00",
            closingTime: "24:00",
          })
      );
    }
  }

  console.log(hours);

  return hours;
};

const getNcpParkingInfo = async (url) => {
  await page.goto(url);

  await new Promise((resolve) => setTimeout(resolve, 200));

  const parkingUuid = uuidv4();

  const info = {
    uuid: uuidv4(),
    info: {
      spaces: logs.carparks[0].numberOfSpaces,
      disabledSpaces: parseInt(logs.carparks[0].numberOfDisabledBays),
    },
    prices: logs.carparks[0].tariffs.map((x) => getNcpTime(x)).filter((x) => x),
    parkingUuid: parkingUuid,
    openingHours: getNcpOpeningHours(logs.carparks[0].openHours),
    updatedAt: new Date().toISOString(),
    updatedByUuid: "",
    status: "approved",
  };

  await Info.create(info);

  const formattedInfo = {
    uuid: parkingUuid,
    type: "ncp",
    location: {
      type: "Point",
      coordinates: [logs.location.coords.lng, logs.location.coords.lat],
    },
    infoUuid: info.uuid,
  };

  return formattedInfo;
};

const getCarParks = async (url) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  return await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));

    return [
      ...new Set(
        anchors
          .map((anchor) => anchor.href)
          .filter((href) =>
            href.startsWith("https://www.ncp.co.uk/find-a-car-park/car-parks/")
          )
      ),
    ];
  }, url);
};

const getCities = async (url) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  return await page.evaluate(async (mainUrl) => {
    return [
      ...new Set(
        Array.from(document.querySelectorAll("a"))
          .map((anchor) => anchor.href)
          .filter(
            (href) =>
              href.startsWith(mainUrl) &&
              href !== mainUrl &&
              !href.endsWith("#")
          )
      ),
    ];
  }, url);
};

const citiesToCarParks = async (array) => {
  const results = await array.reduce(async (previousPromise, nextItem) => {
    const accum = await previousPromise;

    const result = await new Promise(async (resolve) => {
      setTimeout(async () => {
        const item = await getCarParks(nextItem);

        console.log(`${item.length} new carparks found`);

        resolve(item);
      }, 500);
    });

    accum.push(...result);

    return accum;
  }, Promise.resolve([]));

  return results;
};

const carParkToInfo = async (array) => {
  const results = await array.reduce(async (previousPromise, nextItem) => {
    const accum = await previousPromise;

    const result = await new Promise(async (resolve) => {
      setTimeout(async () => {
        const item = await getNcpParkingInfo(nextItem);

        await Map.create(item);

        resolve(item);
      }, 500);
    });

    accum.push(result);

    return accum;
  }, Promise.resolve([]));

  return results;
};

const getNcpCarParks = async (url, city) => {
  let cities;

  if (url) {
    console.log("Fetching cities..");
    cities = await getCities(url || city);
    console.log(`${cities.length} cities found`);
  } else {
    cities = [city];
  }

  console.log("Fetching carparks..");
  const carParks = await citiesToCarParks(cities);
  console.log(`${carParks.length} carparks found`);

  console.log("Fetching carpark info..");
  const info = await carParkToInfo(carParks);

  await browser.close();

  console.log(`Scraping complete. ${info.length} items stored`);
};

const getNCPCarParks = async (req, res) => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();

  page.on("console", async (msg) => {
    if (msg.type() === "log" && msg.args().length) {
      const jsonValue = await msg.args()[0].jsonValue();
      logs = jsonValue[0];
    }
  });

  if (req.query.city) {
    await getNcpCarParks("", req.query.city);
  } else {
    await getNcpCarParks("https://www.ncp.co.uk/parking-solutions/cities/");
  }
};

// const scrapeGooglePlaces = async () => {
//   let token;

//   do {
//     token = await googleSearch(52.527446, 1.023696, token);

//     await new Promise((r) => setTimeout(r, 2000));
//   } while (token);
// };

// const googleSearch = async (lat, lng, pageToken) => {
//   const params = pageToken
//     ? `key=${process.env.GOOGLE_API_KEY}&pagetoken=${pageToken}`
//     : `key=${
//         process.env.GOOGLE_API_KEY
//       }&radius=50000&type=parking&location=${lat},${lng}${
//         pageToken ? `&pagetoken=${pageToken}` : ""
//       }`;

//   const res = await axios.get(
//     `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
//   );

//   await Promise.all(
//     res?.data?.results.map(async (r) => {
//       await Map.create({
//         type: "google",
//         name: r.name,
//         address: r.vicinity,
//         rating: r.rating,
//         ratingCount: r.user_ratings_total,
//         location: {
//           type: "Point",
//           coordinates: [r.geometry.location.lng, r.geometry.location.lat],
//         },
//         info: {},
//         prices: [],
//       });

//       return r;
//     })
//   );

//   return res?.data?.next_page_token;
// };

module.exports = {
  getNCPCarParks,
};
