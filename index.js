// set up variables and MySQL
var config = require('./config'),
    events = require('events'),
    eventEmitter = new events.EventEmitter()
    mysql = require('mysql'),
    localDatabase = mysql.createConnection(config.mysql),
    shopifyAPI = require('shopify-node-api'),
    Shopify = new shopifyAPI(config.shopify),
    customerQueryString = 'SELECT `contacts`.`First Name` AS first_name, `contacts`.`Last Name` AS last_name, `contacts`.`Email` AS email, REPLACE(REPLACE(`Phone 1`, "    (Mobile)", ""), "    (Work)", "") AS phone, "true" AS verified_email, "true" as accepts_marketing, COUNT(`orders`.`Id`) AS orders_count, SUM(`orders`.`Order Total`) AS total_spent, DATE_FORMAT(`Date Created`, "%Y-%m-%dT%T'+config.general.timezone+'") AS created_at, DATE_FORMAT(`Last Updated`, "%Y-%m-%dT%T'+config.general.timezone+'") AS updated_at, `contacts`.`Street Address 1` AS address1_address1, `contacts`.`Street Address 2` AS address1_address2, `contacts`.`City` AS address1_city, `contacts`.`State` AS address1_state, `contacts`.`Postal Code` AS address1_zip, `contacts`.`Country` AS address1_country, `contacts`.`Street Address 1 (Shipping)` AS address2_address1, `contacts`.`Street Address 2 (Shipping)` AS address2_address2, `contacts`.`City (Shipping)` AS address2_city, `contacts`.`State (Shipping)` AS address2_state, `contacts`.`Postal Code (Shipping)` AS address2_zip, `contacts`.`Country (Shipping)` AS address2_country, `contacts`.`Id` AS infusionsoft_id FROM `infusionsoft_contacts` `contacts` JOIN `infusionsoft_orders` `orders` on `orders`.`contactId` = `contacts`.`Id` WHERE `contacts`.`shopify_id` IS NULL AND `contacts`.`shopify_notes` IS NULL GROUP BY `contacts`.`Id` LIMIT '+config.general.queryLimit+';';
global.customerData = [];

/**
 * Handle customer data
 * @param {object} database MySQL database connection
 */
var getCustomerData = function(database) {
    var customerQuery = localDatabase.query(customerQueryString);
    customerQuery.on('error', function(error) {
        console.error(error);
    });
    customerQuery.on('result', function(row) {
        customerObject = {
            "customer": formatAddresses(row)
        };
        sendCustomersToAPI(customerObject);
    });
}

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

/**
 * Send customer data to Shopify API
 * @param   {object} customerObject object containing customer data
 * @returns {JSON}   response from Shopify API
 */
var sendCustomersToAPI = function(customerObject) {
    Shopify.post('/admin/customers.json', customerObject, function(error, data, headers) {
        if (error) {
            if (error.code == 422 && error.error.email && error.error.email[0] == 'has already been taken') {
                eventEmitter.emit('shopifyDuplicateEmail', customerObject);
            } else {
                eventEmitter.emit('shopifyOtherError', customerObject, data);
            }
        } else {
            console.info('added to Shopify: '+data.customer.email);
            eventEmitter.emit('shopifyAdded', customerObject, data.customer);
        }
    });
}

/**
 * Get Shopify ID for a given email address
 * @param {object} customerObject object containing customer data
 */
var getShopifyId = function(customerObject) {
    var customerEmail = {
        "query": "email:"+customerObject.customer.email
    };
    Shopify.get('/admin/customers/search.json', customerEmail, function(error, data, headers) {
        if (error) {
            console.log('Can’t get customer by email address; error: ');console.error(error);
        } else {
            eventEmitter.emit('shopifyAdded', customerObject, data.customers[0]);
        }
    });
}

/**
 * Update customer data in local database
 * @param {object} customerObject customer data from MySQL
 * @param {object} shopifyData    customer data from Shopify
 */
var updateLocalCustomerData = function(customerObject, shopifyCustomer) {
    if (customerObject && shopifyCustomer) {
        var infusionsoftId = customerObject.customer.infusionsoft_id,
            shopifyId = shopifyCustomer.id,
            updateCustomer = localDatabase.query('UPDATE `infusionsoft_contacts` SET `shopify_id` = "'+shopifyId+'" WHERE `Id` = "'+infusionsoftId+'"');
        updateCustomer.on('error', function(error) {
            console.error(error);
        });
        updateCustomer.on('result', function(row) {
            console.log('Customer '+infusionsoftId+' updated with Shopify ID '+shopifyId+'.');
        });
    }
}

/**
 * Add Shopify error note
 * @param {object} customerObject customer data from MySQL
 * @param {object} shopifyData    customer data from Shopify
 */
var addShopifyErrorNote = function(customerObject, shopifyData) {
    console.log('error note: ');console.log(JSON.stringify(shopifyData));
    if (customerObject && shopifyData) {
        var infusionsoftId = customerObject.customer.infusionsoft_id,
            updateCustomer = localDatabase.query('UPDATE `infusionsoft_contacts` SET `shopify_notes` = "'+localDatabase.escape(JSON.stringify(shopifyData))+'" WHERE `Id` = "'+infusionsoftId+'"');
        updateCustomer.on('error', function(error) {
            console.error(error);
        });
        updateCustomer.on('result', function(row) {
            console.log('Customer '+infusionsoftId+' updated with Shopify error notes.');
        });
    }
}

/**
 * Clean up connections when exiting
 * @param {object} error   error
 * @param {object} options options
 */
var exitHandler = function(error, options) {
    localDatabase.end();
    if (options.cleanup) {
        console.log('clean');
    }
    if (error) {
        console.error(error.stack);
    }
    if (options.exit) {
        process.exit();
    }
}

//TODO: update customer last_order_id with latest Shopify order ID

localDatabase.connect();
getCustomerData(localDatabase);
eventEmitter.on('shopifyAdded', function(customerObject, shopifyCustomer) {
    updateLocalCustomerData(customerObject, shopifyCustomer)
});
eventEmitter.on('shopifyDuplicateEmail', function(customerObject) {
    getShopifyId(customerObject);
});
eventEmitter.on('shopifyOtherError', function(customerObject, data) {
    addShopifyErrorNote(customerObject, data);
});

process.on('exit', exitHandler.bind(null, {cleanup: true}));
