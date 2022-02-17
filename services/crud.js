const { QueryTypes } = require('sequelize');
// const winston = require('winston')

class CRUDService {
    constructor(model) {
        this.model = model;
    }

    async create(data) {
        let result = await this.model.create(Object.assign({}, data))
        return result
    }

    async list(condition, options = {}) {
        let queryObj = {
            where: condition,
            ...options
        }
        let result = await this.model.findAll(queryObj);
        return result
    }

    async firstRow(condition, attributes = "all") {
        try {
            if (attributes != "all") {
                await this.model.findOne({
                    where: condition,
                    attributes: attributes
                });
            }

            let result = await this.model.findOne({
                where: condition,
            });

            return result
        } catch (error) {
            throw error
        }
    }

    async update(condition, data) {
        let result = await this.model.update(data, {
            where: condition
        });
        return result
    }

    async delete(condition) {
        let result = await this.model.destroy({
            where: condition,
        });
        return result
    }

    async queryRaw(sequelize, raw) {
        try {
            let query = await sequelize.query(raw, {
                type: QueryTypes.SELECT,
                nest: true,
            })
            return query
        } catch (error) {
            return ({ error: error.message });
        }
    }

    async count(condition) {
        let result = this.model.count({
            where: condition
        })
        return result
    }
}

module.exports = { CRUDService }
