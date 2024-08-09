const express = require('express')

const Route = express()
const {axiosInstance} = require('../controler/Auth')

const Authentication = ((req, res, next) => {
    // console.log(axiosInstance)
    next()
  })  


  module.exports = {Authentication}