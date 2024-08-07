const { default: axios } = require("axios");
const { Map } = require("../models/index");
const { getNCPCarParks } = require("../ncpScraper.js");
const { checkDistance } = require("../helpers/generic.js");

// ** GET **
const map = async (req, res) => {
  let { lat, lng } = req.query;

  if (!lat || !lng) {
    return res
      .status(500)
      .send({ message: "Latitude & Longitude is required" });
  }

  lat = parseFloat(lat);
  lng = parseFloat(lng);

  const filters = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: req.query.radius || 500,
      },
    },
  };

  if (req.query.hours) {
    filters.prices = {
      $elemMatch: {
        hours: {
          $eq: req.query.hours,
        },
      },
    };
  }

  try {
    let items = await Map.find(filters);
    let itemsWithoutGoogle = items
      .map((item) => item._doc)
      .filter((item) => !item.placeId);

    items = [...items.filter((item) => item.placeId)];

    if (itemsWithoutGoogle.length || !items.length) {
      const googleResponse = await axios.post(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          includedTypes: ["parking"],
          locationRestriction: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng,
              },
              radius: req.query.radius || 500,
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "places.displayName,places.location,places.rating,places.id,places.formattedAddress",
            "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
          },
        }
      );

      itemsWithoutGoogle = googleResponse.data.places.map((r) => {
        const matchingItem = itemsWithoutGoogle.find((i) => {
          return checkDistance(
            i.location.coordinates[1],
            i.location.coordinates[0],
            r.location.latitude,
            r.location.longitude,
            25
          );
        });

        const itemAlreadySaved = items.find((item) => item.placeId === r.id);

        if (matchingItem) {
          return {
            name: r.displayName.text,
            address: r.formattedAddress,
            rating: r.rating,
            placeId: r.id,
            ...matchingItem,
          };
        } else if (!itemAlreadySaved) {
          return {
            type: "google",
            name: r.displayName.text,
            address: r.formattedAddress,
            rating: r.rating,
            placeId: r.id,
            location: {
              type: "Point",
              coordinates: [r.location.longitude, r.location.latitude],
            },
            info: {},
            prices: [],
          };
        }

        return null;
      });

      items.push(...itemsWithoutGoogle.filter((x) => x));
    }

    await Promise.all(
      items.map(async (item) => {
        if (item._id) {
          await Map.findByIdAndUpdate(item._id, item);
        } else {
          await Map.create(item);
        }

        return item;
      })
    );

    return res.status(200).send(items);
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: e });
  }
};

// ** POST **
const scrapeNcp = async (req, res) => {
  try {
    await getNCPCarParks();

    return res.status(200).send({});
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: e });
  }
};

module.exports = {
  map,
  scrapeNcp,
};
