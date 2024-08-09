const express = require('express')

const route = express.Router()

const { getAuthorization, getToken } = require('../controler/Auth')


route.get('/oauth/authorize', getAuthorization)

route.get('/oauth/callback', getToken)

module.exports = route