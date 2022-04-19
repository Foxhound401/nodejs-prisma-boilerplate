const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

const ErrorCode = {
  USER_NON_EXISTED: 'auth001',
  PASSWORD_INVALID: 'auth002',
  PASSWORD_ABOVE_8: 'auth003',
  EMAIL_INVALID: 'auth004',
  PHONE_NUMBER_INVALID: 'auth005',
  OTP_INVALID: 'auth006',
  USERNAME_ABOVE_2: 'auth007',
  PASSWORD_SAME_AS_OLD: 'auth008',
  USER_EXISTED: 'auth009',
  USER_NON_VERIFIED: 'auth010',

  COMMENT_CREATE_FAILED: 'post001',
  REACTION_CREATE_FAILED: 'post002',
  REACTION_REMOVE_FAILED: 'post003',

  FOLLOW_CREATE_FAILED: 'user001',
  BIRTHDAY_INVALID: 'user002',
};

module.exports = {
  HttpStatus,
  ErrorCode,
};
