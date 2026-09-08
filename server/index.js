/*
Copyright (c) 2017, ZOHO CORPORATION
License: MIT
*/
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const errorHandler = require('errorhandler');
const morgan = require('morgan');
const serveIndex = require('serve-index');
const https = require('https');
const chalk = require('chalk');

process.env.PWD = process.env.PWD || process.cwd();


const expressApp = express();
const port = 5000;

expressApp.set('port', port);
expressApp.use(morgan('dev'));
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(errorHandler());


expressApp.use('/', function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

expressApp.get('/plugin-manifest.json', function (req, res) {
  res.sendfile('plugin-manifest.json');
});

expressApp.use('/', express.static('app'));
expressApp.use('/', serveIndex('app'));


expressApp.get('/', function (req, res) {
  res.redirect('/');
});

const options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

https.createServer(options, expressApp).listen(port, function () {
  console.log(chalk.green('Zet running at ht' + 'tps://127.0.0.1:' + port));
  console.log(chalk.bold.cyan("Note: Please enable the host (https://127.0.0.1:"+port+") in a new tab and authorize the connection by clicking Advanced->Proceed to 127.0.0.1 (unsafe)."));
}).on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.log(chalk.bold.red(port + " port is already in use"));
  }
});
