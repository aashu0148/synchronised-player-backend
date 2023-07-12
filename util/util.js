const createError = (res, message, code = 400, err = "") => {
  res.status(code).json({
    success: false,
    message: message || "Something gone wrong",
    error: err,
  });
};

const createResponse = (res, data, code = 200) => {
  res.status(code).json({
    success: true,
    data,
  });
};

const validateEmail = (email) => {
  if (!email) return false;
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

function formatSecondsToMinutesSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = parseInt(seconds % 60);

  return `${minutes}:${
    remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds
  }`;
}

module.exports = {
  createError,
  createResponse,
  validateEmail,
  formatSecondsToMinutesSeconds,
};
