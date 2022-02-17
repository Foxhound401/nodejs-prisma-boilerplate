const validator = require("../services/validator");

const setValidatorConfig = (modelName, methodName) => {
    return (req, res, next) => {
        req.model = modelName
        req.method = methodName
        next()
    }
}

const validate = (req, res, next) => {
    const model = req.model
    const method = req.method
    if (model) {
        const rules = require(`../rules/${model}`)
        validator(req.body, rules[method].rules, rules[method].messages, (err, status) => {
            if (!status) {
                return res.status(412)
                    .json({
                        success: false,
                        message: 'Validation failed',
                        data: err
                    });
            }
        });
    }
    next()
}

module.exports = {
    setValidatorConfig,
    validate
}
