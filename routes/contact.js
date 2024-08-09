const express = require('express')
const {axiosInstance,someApiRequest} = require('../controler/Auth')
const route = express.Router()

const {getContact } = require('../controler/Contact')

const {Authentication} = require('../middleware/Auth')


route.get('/contact',Authentication,someApiRequest)



module.exports = route