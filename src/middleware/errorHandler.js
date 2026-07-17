// Converts thrown errors into consistent JSON responses.
function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Email service error." : error.message,
  });
}

module.exports = errorHandler;
