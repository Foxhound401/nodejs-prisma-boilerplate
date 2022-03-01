const { Router } = require("express");
const userRoutes = require("./users");
const authRoutes = require("./auth");
const router = Router();

router.get("/v1/", (req, res) => res.send("hello sso"));

router.use("/v1/users", userRoutes);
router.use("/v1/", authRoutes);

module.exports = router;
