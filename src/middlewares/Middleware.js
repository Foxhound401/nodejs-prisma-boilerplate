const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const jwt = require('jsonwebtoken');
const useragent = require('express-useragent');

const validateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const source = req.headers['user-agent'];
  const userAgent = useragent.parse(source);

  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
    if (err) return res.sendStatus(403);

    if (!payload)
      return res
        .status(401)
        .send({ message: 'Session Expired, Please login again' });

    console.log('PAYLOAD: ', payload);

    const existedUser = await prisma.users.findFirst({
      where: {
        email: payload.data.email,
        token: token,
      },
    });

    // token is invalid
    if (!existedUser)
      return res.status(401).send({
        success: false,
        message: 'Verification Failed, Please re-login',
      });

    // user agent source is invalid
    if (
      existedUser &&
      existedUser.user_agent_source &&
      existedUser.user_agent_source !== userAgent.source
    ) {
      return res.sendStatus(401);
    }

    req.jwt_middleware = payload.data;
    next();
  });
};

module.exports = {
  validateJWT,
};
