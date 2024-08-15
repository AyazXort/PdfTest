const express = require('express');
const bodyParser = require('body-parser');
const { connectDB } = require('./database/dbconnect');
const authRoute = require('./routes/auth');
const contactRoute = require('./routes/contact');
require('dotenv').config()
const PORT = process.env.PORT 

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

connectDB().then(() => {

  app.use('/', authRoute);
  app.use('/', contactRoute);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error("Error starting server:", error);
});
