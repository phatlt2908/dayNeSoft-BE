const express = require('express');
const app = express();

// parse requests of content-type - application/json
app.use(express.json());

// app.use(function (req, res, next) {
// 	res.header("Access-Control-Allow-Origin", "*");
// 	res.header("Access-Control-Allow-Headers", "*");
// 	res.header("Access-Control-Allow-Methods", "*");
// 	next();
// });

var cors = require('cors');
app.use(cors({ origin: true, credentials: true }));

// Read environment variable
require('dotenv').config();

require('./src/routers/routes')(app);

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log("App listening on port:", port);
});