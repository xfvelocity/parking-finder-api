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
    const items = await Map.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: 5000,
        },
      },
    });

    return res.status(200).send(items);
  } catch (e) {
    return res.status(500).send({ message: e });
  }
};

const createMap = async (req, res) => {
  try {
    const item = await Map.create(req.body);

    return res.status(200).send(item);
  } catch (e) {
    return res.status(500).send({ message: e });
  }
};

module.exports = {
  map,
  createMap,
};
