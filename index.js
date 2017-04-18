// set up variables and MySQL
var config = require('./config'),
    mysql = require('mysql'),
    localDatabase = mysql.createConnection(config.mysql),
    Shopify = require('shopify-api-node'), // see https://github.com/MONEI/Shopify-api-node#available-resources-and-methods
    shopify = new Shopify(config.shopify),
    databaseQueryString = 'SELECT `contacts`.`First Name` AS first_name, `contacts`.`Last Name` AS last_name, `contacts`.`Email` AS email, REPLACE(REPLACE(`Phone 1`, "    (Mobile)", ""), "    (Work)", "") AS phone, "true" AS verified_email, "true" as accepts_marketing, COUNT(`orders`.`Id`) AS orders_count, SUM(`orders`.`Order Total`) AS total_spent, DATE_FORMAT(`Date Created`, "%Y-%m-%dT%T'+config.general.timezone+'") AS created_at, DATE_FORMAT(`Last Updated`, "%Y-%m-%dT%T'+config.general.timezone+'") AS updated_at, `contacts`.`Street Address 1` AS address1_address1, `contacts`.`Street Address 2` AS address1_address2, `contacts`.`City` AS address1_city, `contacts`.`State` AS address1_state, `contacts`.`Postal Code` AS address1_zip, `contacts`.`Country` AS address1_country, `contacts`.`Street Address 1 (Shipping)` AS address2_address1, `contacts`.`Street Address 2 (Shipping)` AS address2_address2, `contacts`.`City (Shipping)` AS address2_city, `contacts`.`State (Shipping)` AS address2_state, `contacts`.`Postal Code (Shipping)` AS address2_zip, `contacts`.`Country (Shipping)` AS address2_country, `contacts`.`Id` AS infusionsoft_id FROM `infusionsoft_contacts` `contacts` JOIN `infusionsoft_orders` `orders` on `orders`.`contactId` = `contacts`.`Id` WHERE `contacts`.`shopify_id` IS NULL GROUP BY `contacts`.`Id` LIMIT '+config.general.queryLimit+';';
global.customerData = [];

localDatabase.connect();

var customerQuery = localDatabase.query(databaseQueryString);
customerQuery.on('error', function(error) {
    console.error(error);
});
customerQuery.on('result', function(row) {
    localDatabase.pause();
    global.customerData.push(formatAddresses(row));
    localDatabase.resume();
});
customerQuery.on('end', function() {
    for (i in global.customerData) {
        customerJSON = JSON.stringify({
            "customer": global.customerData[i]
        });
        sendCustomersToAPI(customerJSON);
    }
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
