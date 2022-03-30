```javascript
enum STATUS_CODE {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  SERVER_INTERNAL_ERROR = 500,
}

const MessageStatusMapping: Record<number, string> = {
  [STATUS_CODE.SUCCESS]: 'Success',
  [STATUS_CODE.CREATED]: 'Created',
  [STATUS_CODE.BAD_REQUEST]: 'Bad Request',
  [STATUS_CODE.UNAUTHORIZED]: 'Unauthorized',
  [STATUS_CODE.PAYMENT_REQUIRED]: 'Payment required',
  [STATUS_CODE.FORBIDDEN]: 'Forbidden',
  [STATUS_CODE.NOT_FOUND]: 'Not found',
  [STATUS_CODE.CONFLICT]: 'Conflict',
  [STATUS_CODE.TOO_MANY_REQUESTS]: 'Too many requests',
  [STATUS_CODE.SERVER_INTERNAL_ERROR]: 'Server internal error',
};

```
