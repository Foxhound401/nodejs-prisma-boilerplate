const models = require("../database/models");
const jwt = require("jsonwebtoken");
const useragent = require("express-useragent");

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let source = req.headers["user-agent"],
    ua = useragent.parse(source);
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    console.log(token);
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
      if (err) {
        console.log(err);
        return res.sendStatus(403);
      }
      // check if token is valid
      const existedUser = await models.User.findOne({
        where: {
          email: payload.user.email,
          token: token,
        },
      });
      console.log(existedUser);

      // token is invalid
      if (!existedUser) {
        return res.sendStatus(401);
      }

      // user agent source is invalid
      if (
        existedUser &&
        existedUser.ua_source &&
        existedUser.ua_source !== ua.source
      ) {
        return res.sendStatus(401);
      }

      req.user = payload.user;
      next();
    });
  } else {
    return res.sendStatus(401);
  }
};

module.exports = {
  authenticateJWT,
};
