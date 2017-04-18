// set up variables and MySQL
var config = require('./config'),
    mysql = require('mysql'),
    localDatabase = mysql.createConnection({
        host:        config.mysql.host,
        user:        config.mysql.username,
        password:    config.mysql.password,
        database:    config.mysql.database
    }),
    json = '';
    shopifyAPI = require('shopify-node-api'),
    Shopify = new shopifyAPI(config.shopify),

localDatabase.connect();

localDatabase.query('SELECT `Name` from infusionsoft_contacts LIMIT 10', function (error, results, fields) {
    if (error) throw error;
    console.log(results);
});

localDatabase.end();

/**
 * Format addresses as JSON objects
 * @param   {object} results database query data
 * @returns {object} database query data with addresses formatted as JSON objects
 */
var formatAddresses = function(row) {
    row.addresses = [
        {
            address1: row.address1_address1,
            address2: row.address1_address2,
            city: row.address1_city,
            state: row.address1_state,
            zip: row.address1_zip,
            country: row.address1_country,
            address_default: "true"
        },
        {
            address1: row.address2_address1,
            address2: row.address2_address2,
            city: row.address2_city,
            state: row.address2_state,
            zip: row.address2_zip,
            country: row.address2_country
        }
    ]
    delete row.address1_address1;
    delete row.address1_address2;
    delete row.address1_city;
    delete row.address1_state;
    delete row.address1_zip;
    delete row.address1_country;
    delete row.address2_address1;
    delete row.address2_address2;
    delete row.address2_city;
    delete row.address2_state;
    delete row.address2_zip;
    delete row.address2_country;
    return row;
}
