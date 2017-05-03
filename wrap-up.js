// set up variables and MySQL
var config = require('./config'),
    events = require('events'),
    eventEmitter = new events.EventEmitter(),
    mysql = require('mysql'),
    localDatabase = mysql.createPool(config.mysql),
    shopifyAPI = require('shopify-node-api'),
    Shopify = new shopifyAPI(config.shopify),
    updateCustomerData = 'SELECT \
        `orders`.`ContactId` AS `infusionsoft_id`, \
        `contacts`.`shopify_id` AS `id`, \
        SUM(`orders`.`Order Total`) AS `total_spent`, \
        MAX(`orders`.`id`) AS `last_infusionsoft_id` \
    FROM `infusionsoft_orders` `orders` \
    JOIN `infusionsoft_contacts` `contacts` ON `contacts`.`Id` = `orders`.`ContactId` \
    WHERE `wrapup_complete` IS NULL AND `wrapup_complete` IS NULL \
    GROUP BY `orders`.`ContactId` \
    LIMIT '+config.general.queryLimit;

/**
 * Get order data
 * @param {object} MySQL database object
 */
var getCustomers = function(localDatabase) {
    var pool = localDatabase.getConnection(function(error, customerDataConnection) {
        var customerDataQuery = customerDataConnection.query(updateCustomerData);
        customerDataQuery.on('error', function(error) {
            console.error(error);
        });
        customerDataQuery.on('result', function(row) {
            getLastShopifyOrder(row, sendcustomerDataToAPI);
        });
        customerDataQuery.on('end', function() {
            customerDataConnection.release();
            if (error) {
                throw error;
            }
        });
    });
}

/**
 * Get last Shopify order ID
 * @param {object}   customer customer data
 * @param {function} callback callabck function
 */
var getLastShopifyOrder = function(customer, callback) {
    var lastOrderPool = localDatabase.getConnection(function(error, lastOrderConnection) {
        var lastOrderQuery = lastOrderConnection.query('SELECT `shopify_id` FROM `infusionsoft_orders` WHERE `id` = "'+customer.last_infusionsoft_id+'";');
        lastOrderQuery.on('error', function(error) {
            console.error(error);
        });
        lastOrderQuery.on('result', function(row) {
            customer.last_order_id = row.shopify_id;
            callback(customer = {
                "customer": customer
            });
        });
        lastOrderQuery.on('end', function() {
            lastOrderConnection.release();
            if (error) {
                throw error;
            }
        });
    });
}

/**
 * Send order data to Shopify API
 * @param   {object} customerDataObject object containing order data
 * @returns {JSON}   response from Shopify API
 */
var sendcustomerDataToAPI = function(customerDataObject) {
    console.log(customerDataObject.customer);
    Shopify.put('/admin/customers/'+customerDataObject.customer.id+'.json', customerDataObject, function(error, data, headers) {
        if (error) {
            eventEmitter.emit('shopifyOtherError', customerDataObject, data);
        } else {
            console.info('updated at Shopify: '+data.customer.id);
            eventEmitter.emit('shopifyAdded', customerDataObject, data.order);
        }
    });
}

/**
 * Update order data in local database
 * @param {object} customerDataObject order data from MySQL
 * @param {object} shopifyData     order data from Shopify
 */
 var updateLocalCustomerData = function(customerDataObject, shopifyData) {
    if (customerDataObject && shopifyData) {
        var customerId = customerDataObject.customer.infusionsoft_id,
            shopifyId = shopifyData.id;

        localDatabase.getConnection(function (error, updateConnection) {
            var updateOrder = updateConnection.query('UPDATE `infusionsoft_contacts` SET `wrapup_complete` = "1" WHERE `id` = "'+customerId+'"');
            updateOrder.on('error', function(error) {
                console.error(error);
            });
            updateOrder.on('result', function(row) {
                console.log('Customer '+customerId+' complete.');
            });
            updateOrder.on('end', function() {
                updateConnection.release();
                if (error) {
                    throw error;
                }
            });
        });
    }
}

/**
 * Add Shopify error note
 * @param {object} customerDataObject order data from MySQL
 * @param {object} shopifyData     order data from Shopify
 */
 var addShopifyErrorNote = function(customerDataObject, shopifyData) {
    var errorMessage = JSON.stringify(shopifyData),
        customerId = customerDataObject.customer.infusionsoft_id;
    console.log('error note for customer '+customerId+': ');console.log(errorMessage);
    if (customerDataObject && shopifyData) {
        if (typeof errorMessage === 'undefined') {
            errorMessage = 'undefined error';
        }
        var updateOrder = localDatabase.query('UPDATE `infusionsoft_contacts` SET `wrapup_notes` = "'+localDatabase.escape(errorMessage)+'" WHERE `id` = "'+customerId+'"');
        updateOrder.on('error', function(error) {
            console.error(error);
        });
        updateOrder.on('result', function(row) {
            console.log('Order '+customerId+' updated with Shopify error notes.');
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

getCustomers(localDatabase);
eventEmitter.on('shopifyAdded', function(customerDataObject, shopifyData) {
    updateLocalCustomerData(customerDataObject, shopifyData)
});
eventEmitter.on('shopifyOtherError', function(customerDataObject, data) {
    addShopifyErrorNote(customerDataObject, data);
});

process.on('exit', exitHandler.bind(null, {cleanup: true}));
