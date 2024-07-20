const { default: axios } = require("axios");
const { Map } = require("../models/index");

const map = async (req, res) => {
  let { lat, lng } = req.query;

  if (!lat || !lng) {
    return res
      .status(500)
      .send({ message: "Latitude & Longitude is required" });
  }

  lat = parseFloat(lat);
  lng = parseFloat(lng);

  try {
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
            radius: req.query.radius || 5000,
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.displayName,places.location,places.rating,places.id",
          "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
        },
      }
    );

    if (JSON.stringify(googleResponse.data) === "{}") {
      return res.status(200).send([]);
    }

    const items = await Promise.all(
      googleResponse.data.places.map(async (r) => {
        if (req.query.hours) {
          const item = await Map.findOne({
            googlePlaceId: r.id,
            prices: {
              $elemMatch: {
                hours: {
                  $all: req.query.hours.map((h) => parseInt(h)),
                },
              },
            },
          });

          if (item) {
            return { ...r, prices: item.prices };
          } else {
            return null;
          }
        } else {
          const item = await Map.findOne({
            googlePlaceId: r.id,
          });

          if (item) {
            return { ...r, prices: item.prices };
          } else {
            return r;
          }
        }
      })
    );

    return res.status(200).send(items.filter((x) => x));
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: e });
  }
};

const createMap = async (req, res) => {
  try {
    const item = await Map.create({
      googlePlaceId: req.body.googlePlaceId,
      prices: req.body.prices || [],
    });

    return res.status(200).send(item);
  } catch (e) {
    return res.status(500).send({ message: e });
  }
};

module.exports = {
  map,
  createMap,
};
