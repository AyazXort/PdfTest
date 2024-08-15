const express = require('express')
const {axiosInstance,someApiRequest} = require('../controler/Auth')
const route = express.Router()

const {getPDF } = require('../controler/Contact')

const {Authentication} = require('../middleware/Auth')


route.get('/contact',Authentication,getPDF)



module.exports = route