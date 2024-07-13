const express = require("express");
const router = express.Router();

// ** Auth **
const { registerUser, loginUser } = require("../controllers/auth");

router.post("/register", registerUser);

router.post("/login", loginUser);

// ** Maps **
const { map, createMap } = require("../controllers/map");

router.get("/map", map);

router.post("/map", createMap);

module.exports = router;
