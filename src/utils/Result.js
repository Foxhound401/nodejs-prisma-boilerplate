class Result {
  constructor(isSuccess, error, value) {
    this.isSucess = isSuccess;
    this.isFailure = !this.isSucess;
    this.error = error;
    this._value = value;

    if (isSuccess && error) {
      // throw new Error('Invalid');
      console.error('Invalid');
      return;
    }

    if (!isSuccess && !error) {
      // throw new Error('invalid');
      console.error('Invalid');
      return;
    }

    Object.freeze(this);
  }

  get value() {
    if (!this.isSuccess) {
      throw new Error(`Cant retrieve the value from a failed result.`);
    }
    return this._value;
  }

  static ok(value) {
    return new Result(true, null, value);
  }

  static fail(error) {
    return new Result(false, error, null);
  }
}

module.exports = Result;
