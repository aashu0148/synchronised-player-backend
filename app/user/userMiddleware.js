const userSchema = require("./userSchema");

const authenticateUserMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    res.status(400).json({
      status: false,
      message: "Token not found",
    });
    return;
  }

  const user = await userSchema.findOne({
    token: token,
  });
  if (!user) {
    res.status(422).json({
      status: false,
      message: "Invalid Token",
    });
    return;
  }

  req.user = user;
  next();
};

module.exports = {
  authenticateUserMiddleware,
};
