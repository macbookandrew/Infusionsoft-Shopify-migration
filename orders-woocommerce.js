// set up variables and MySQL
var config = require('./config'),
    events = require('events'),
    eventEmitter = new events.EventEmitter(),
    mysql = require('mysql'),
    localDatabase = mysql.createPool(config.mysql),
    shopifyAPI = require('shopify-node-api'),
    Shopify = new shopifyAPI(config.shopify),
    orderQueryString = 'SELECT \
        `contacts`.`Id` AS `infusionsoft_id`, `contacts`.`shopify_id`, GROUP_CONCAT(`orders`.`woocommerce_order_id`) AS `woocommerce_orders` \
        FROM `infusionsoft_contacts` `contacts` \
        JOIN `infusionsoft_orders` `orders` ON `orders`.`contactId` = `contacts`.`id` \
        WHERE `contacts`.`shopify_id` IS NOT NULL AND `orders`.`woocommerce_order_id` IS NOT NULL AND `orders`.`shopify_id` IS NULL \
        GROUP BY `contacts`.`id` \
        LIMIT '+config.general.queryLimit+';',
    orderDataQueryString = 'SELECT \
            p.ID as woocommerce_order_id, \
            p.post_status, \
            p.ID AS order_number, \
            CONCAT("WooCommerce order WC-",p.ID,"; Infusionsoft order ",max( CASE WHEN pm.meta_key = "infusionsoft_order_id" AND p.ID = pm.post_id THEN pm.meta_value END )) AS note, \
            "fulfilled" AS fulfillment_status, \
            DATE_FORMAT(post_date, "%Y-%m-%dT%T'+config.general.timezone+'") AS created_at, \
            DATE_FORMAT(post_date, "%Y-%m-%dT%T'+config.general.timezone+'") AS closed_at, \
            DATE_FORMAT(post_date, "%Y-%m-%dT%T'+config.general.timezone+'") AS processed_at, \
            (SELECT shopify_id FROM infusionsoft_contacts `contacts` WHERE `contacts`.`id` = `orders`.`ContactId`) AS customer_id, \
            max( CASE WHEN pm.meta_key = "_billing_email" AND p.ID = pm.post_id THEN pm.meta_value END ) AS email, \
            max( CASE WHEN pm.meta_key = "_billing_email" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_email, \
            max( CASE WHEN pm.meta_key = "_billing_first_name" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_first_name, \
            max( CASE WHEN pm.meta_key = "_billing_last_name" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_last_name, \
            max( CASE WHEN pm.meta_key = "_billing_company" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_company, \
            max( CASE WHEN pm.meta_key = "_billing_address_1" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_address_1, \
            max( CASE WHEN pm.meta_key = "_billing_address_2" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_address_2, \
            max( CASE WHEN pm.meta_key = "_billing_city" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_city, \
            max( CASE WHEN pm.meta_key = "_billing_state" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_state, \
            max( CASE WHEN pm.meta_key = "_billing_postcode" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_postcode, \
            max( CASE WHEN pm.meta_key = "_billing_country" AND p.ID = pm.post_id THEN pm.meta_value END ) AS billing_country_code, \
            max( CASE WHEN pm.meta_key = "_shipping_first_name" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_first_name, \
            max( CASE WHEN pm.meta_key = "_shipping_last_name" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_last_name, \
            max( CASE WHEN pm.meta_key = "_shipping_address_1" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_address_1, \
            max( CASE WHEN pm.meta_key = "_shipping_address_2" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_address_2, \
            max( CASE WHEN pm.meta_key = "_shipping_city" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_city, \
            max( CASE WHEN pm.meta_key = "_shipping_state" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_state, \
            max( CASE WHEN pm.meta_key = "_shipping_postcode" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_postcode, \
            max( CASE WHEN pm.meta_key = "_shipping_country" AND p.ID = pm.post_id THEN pm.meta_value END ) AS shipping_country_code, \
            max( CASE WHEN pm.meta_key = "_customer_ip_address" AND p.ID = pm.post_id THEN pm.meta_value END ) AS browser_ip, \
            max( CASE WHEN pm.meta_key = "_order_tax" AND p.ID = pm.post_id THEN pm.meta_value END ) AS total_tax, \
            max( CASE WHEN pm.meta_key = "_order_total" AND p.ID = pm.post_id THEN pm.meta_value END ) AS total_price, \
            "USD" AS currency, \
            ( SELECT group_concat( order_item_name SEPARATOR "|" ) FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "line_item" ) AS line_items_titles, \
            ( SELECT group_concat( shopify_product_id SEPARATOR "|" ) FROM infusionsoft_products products JOIN wpora_woocommerce_order_itemmeta meta WHERE meta.order_item_id IN ( SELECT order_item_id FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "line_item" ) AND meta.meta_key = "_product_id" ) AS line_items_ids, \
            ( SELECT group_concat( shopify_variant_id SEPARATOR "|" ) FROM infusionsoft_products products JOIN wpora_woocommerce_order_itemmeta meta WHERE meta.order_item_id IN ( SELECT order_item_id FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "line_item" ) AND meta.meta_key = "_variation_id" ) AS line_items_variant_ids, \
            ( SELECT group_concat( meta_value SEPARATOR "|" ) FROM wpora_woocommerce_order_itemmeta WHERE order_item_id IN ( SELECT order_item_id FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "line_item" ) AND meta_key = "_qty" ) AS line_items_quantities, \
            ( SELECT group_concat( meta_value SEPARATOR "|" ) FROM wpora_woocommerce_order_itemmeta WHERE order_item_id IN ( SELECT order_item_id FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "line_item" ) AND meta_key = "_line_total" ) AS line_items_prices, \
            ( SELECT group_concat(order_item_name) FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "shipping" ) AS shipping_lines_title, \
            ( SELECT group_concat(meta_value) FROM wpora_woocommerce_order_itemmeta WHERE order_item_id IN ( SELECT order_item_id FROM wpora_woocommerce_order_items WHERE order_id = p.ID AND order_item_type = "shipping" ) AND meta_key = "cost" ) AS shipping_lines_price \
        FROM \
            wpora_posts p \
            JOIN wpora_postmeta pm ON p.ID = pm.post_id \
            JOIN infusionsoft_orders orders ON orders.woocommerce_order_id = p.ID  \
        WHERE \
            orders.shopify_id IS NULL AND \
            orders.shopify_notes IS NULL ';

/**
 * Get orders
 * @param {object} database MySQL database connection
 */
var getOrders = function(database) {
    var pool = localDatabase.getConnection(function(error, orderConnection) {
        var orderQuery = orderConnection.query(orderQueryString);
        orderQuery.on('error', function(error) {
            console.error(error);
        });
        orderQuery.on('result', function(row) {
            getOrderData(row);
        });
        orderQuery.on('end', function() {
            orderConnection.release();
            if (error) {
                throw error;
            }
        });
    });
}

/**
 * Get order data
 * @param {object} orders row with customer data
 */
var getOrderData = function(orders) {
    var pool = localDatabase.getConnection(function(error, orderDataConnection) {
        var orderDataQuery = orderDataConnection.query(orderDataQueryString+'AND p.ID IN ('+orders.woocommerce_orders+') GROUP BY p.ID;');
        orderDataQuery.on('error', function(error) {
            console.error(error);
        });
        orderDataQuery.on('result', function(row) {

            orderDataObject = {
                "order": formatOrderData(row)
            };
            sendOrderDataToAPI(orderDataObject);
        });
        orderDataQuery.on('end', function() {
            orderDataConnection.release();
            if (error) {
                throw error;
            }
        });
    });
}

/**
 * Format order data as JSON objects
 * @param   {object} results database query data
 * @returns {object} database query data with orders formatted as JSON objects
 */
var formatOrderData = function(row) {
    row.billing_address = {
        "first_name": row.billing_first_name,
        "last_name": row.billing_last_name,
        "address1": row.billing_address_1,
        "address2": row.billing_address_2,
        "city": row.billing_city,
        "province_code": row.billing_state,
        "zip": row.billing_postcode,
        "country": row.billing_country,
        "country_code": row.billing_country_code,
        "company": row.billing_company
    };
    delete row.billing_first_name;
    delete row.billing_last_name;
    delete row.billing_address_1;
    delete row.billing_address_2;
    delete row.billing_city;
    delete row.billing_state;
    delete row.billing_postcode;
    delete row.billing_country;
    delete row.billing_country_code;
    delete row.billing_company;

    row.shipping_address = {
        "first_name": row.shipping_first_name,
        "last_name": row.shipping_last_name,
        "address1": row.shipping_address_1,
        "address2": row.shipping_address_2,
        "city": row.shipping_city,
        "province_code": row.shipping_state,
        "zip": row.shipping_postcode,
        "country": row.shipping_country,
        "country_code": row.shipping_country_code,
        "company": row.shipping_company
    };
    delete row.shipping_first_name;
    delete row.shipping_last_name;
    delete row.shipping_address_1;
    delete row.shipping_address_2;
    delete row.shipping_city;
    delete row.shipping_state;
    delete row.shipping_postcode;
    delete row.shipping_country;
    delete row.shipping_country_code;
    delete row.shipping_company;

    var line_item_ids = row.line_items_ids.split('|'),
        line_item_titles = row.line_items_titles.split('|'),
        line_item_variant_ids = row.line_items_variant_ids.split('|'),
        line_item_prices = row.line_items_prices.split('|'),
        line_item_quantities = row.line_items_quantities.split('|');

    row.line_items = [];
    for (i in line_item_titles) {
        row.line_items.push({
            "id": line_item_ids[i],
            "title": line_item_titles[i],
            "variant_id": line_item_variant_ids[i],
            "price": line_item_prices[i],
            "quantity": line_item_quantities[i]
        });
    }
    delete row.line_items_ids;
    delete row.line_items_titles;
    delete row.line_items_variant_ids;
    delete row.line_items_prices;

    row.shipping_lines = [
        {
            "price": row.shipping_lines_price,
            "title": row.shipping_lines_title
        }
    ];
    delete row.shipping_lines_price;
    delete row.shipping_lines_title;

    row.customer = {
        "id": row.customer_id
    };
    delete row.customer_id;

    return row;
}

/**
 * Send order data to Shopify API
 * @param   {object} orderDataObject object containing order data
 * @returns {JSON}   response from Shopify API
 */
var sendOrderDataToAPI = function(orderDataObject) {
    Shopify.post('/admin/orders.json', orderDataObject, function(error, data, headers) {
        if (error) {
            eventEmitter.emit('shopifyOtherError', orderDataObject, data);
        } else {
            console.info('added to Shopify: '+data.order.id);
            eventEmitter.emit('shopifyAdded', orderDataObject, data.order);
        }
    });
}

/**
 * Update order data in local database
 * @param {object} orderDataObject order data from MySQL
 * @param {object} shopifyData     order data from Shopify
 */
 var updateLocalOrderData = function(orderDataObject, shopifyData) {
    if (orderDataObject && shopifyData) {
        var woocommerceOrderId = orderDataObject.order.woocommerce_order_id,
            shopifyId = shopifyData.id;

        localDatabase.getConnection(function (error, updateConnection) {
            var updateOrder = updateConnection.query('UPDATE `infusionsoft_orders` SET `shopify_id` = "'+shopifyId+'" WHERE `woocommerce_order_id` = "'+woocommerceOrderId+'"');
            updateOrder.on('error', function(error) {
                console.error(error);
            });
            updateOrder.on('result', function(row) {
                console.log('Order '+woocommerceOrderId+' updated with Shopify ID '+shopifyId+'.');
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
 * @param {object} orderDataObject order data from MySQL
 * @param {object} shopifyData     order data from Shopify
 */
 var addShopifyErrorNote = function(orderDataObject, shopifyData) {
    console.log('error note: ');console.log(JSON.stringify(shopifyData));
    if (orderDataObject && shopifyData) {
        var woocommerceOrderId = orderDataObject.order.woocommerce_order_id,
            updateOrder = localDatabase.query('UPDATE `infusionsoft_orders` SET `shopify_notes` = "'+localDatabase.escape(JSON.stringify(shopifyData))+'" WHERE `woocommerce_order_id` = "'+woocommerceOrderId+'"');
        updateOrder.on('error', function(error) {
            console.error(error);
        });
        updateOrder.on('result', function(row) {
            console.log('Order '+woocommerceOrderId+' updated with Shopify error notes.');
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

getOrders(localDatabase);
eventEmitter.on('shopifyAdded', function(orderDataObject, shopifyData) {
    updateLocalOrderData(orderDataObject, shopifyData)
});
eventEmitter.on('shopifyOtherError', function(orderDataObject, data) {
    addShopifyErrorNote(orderDataObject, data);
});

process.on('exit', exitHandler.bind(null, {cleanup: true}));
