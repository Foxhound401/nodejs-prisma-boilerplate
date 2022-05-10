function ErrorHandler() {
  function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
  }

  function UserError(httpStatus, errorCode, message) {
    this.success = false;
    this.httpStatus = httpStatus;
    this.errorCode = errorCode;
    this.errorKey = getKeyByValue(ErrorCode, errorCode);
    this.message = message;
  }
}

module.exports = ErrorHandler;
