const express = require("express");
const router = express.Router();

// ** Auth **
const { registerUser, loginUser } = require("../controllers/auth");

router.post("/register", registerUser);

router.post("/login", loginUser);

// ** Maps **
const { map, scrapeNcp } = require("../controllers/map");

router.get("/map", map);

router.post("/map/ncp-scrape", scrapeNcp);

module.exports = router;
