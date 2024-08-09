const express = require('express')
const {axiosInstance,someApiRequest} = require('../controler/Auth')
const route = express.Router()

const {getContact } = require('../controler/Contact')


route.get('/contact', someApiRequest)



module.exports = route