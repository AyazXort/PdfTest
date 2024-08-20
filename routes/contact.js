const express = require('express')
const {axiosInstance,someApiRequest} = require('../controler/Auth')
const route = express.Router()

const {getPDF } = require('../controler/GeneratePdf')

const {Authentication} = require('../middleware/Auth')


route.get('/contact',Authentication,getPDF)



module.exports = route