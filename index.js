var config = require('./config'),
    mysql = require('mysql'),
    localDatabase = mysql.createConnection({
        host        : config.mysql.host,
        user        : config.mysql.username,
        password    : config.mysql.password,
        database    : config.mysql.database
    });

const Shopify = require('shopify-api-node');

const shopify = new Shopify({
  shopName: config.shopify.shopName,
  apiKey: config.shopify.apiKey,
  password: config.shopify.password
});

localDatabase.connect();

localDatabase.query('SELECT `Name` from infusionsoft_contacts LIMIT 10', function (error, results, fields) {
    if (error) throw error;
    console.log(results);
});

localDatabase.end();
