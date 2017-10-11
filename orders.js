// set up variables and MySQL
var config = require('./config'),
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	mysql = require('mysql'),
	localDatabase = mysql.createPool(config.mysql),
	shopifyAPI = require('shopify-node-api'),
	Shopify = new shopifyAPI(config.shopify),
	orderDataQueryString = 'SELECT \
		`orders`.`id`, \
		CONCAT("Infusionsoft order ", `orders`.`id`) AS note, \
		"fulfilled" AS fulfillment_status, \
		DATE_FORMAT(`Order Date`, "%Y-%m-%dT%T'+config.general.timezone+'") AS created_at, \
		DATE_FORMAT(`Order Date`, "%Y-%m-%dT%T'+config.general.timezone+'") AS closed_at, \
		DATE_FORMAT(`Order Date`, "%Y-%m-%dT%T'+config.general.timezone+'") AS processed_at, \
		(SELECT shopify_id FROM infusionsoft_contacts `contacts` WHERE `contacts`.`id` = `orders`.`ContactId`) AS customer_id, \
		(SELECT `Email` FROM infusionsoft_contacts `contacts` WHERE `contacts`.`id` = `orders`.`ContactId`) AS email, \
		(SELECT `Email` FROM infusionsoft_contacts `contacts` WHERE `contacts`.`id` = `orders`.`ContactId`) AS billing_email, \
		`First Name` AS billing_first_name, \
		`Last Name` AS billing_last_name, \
		`Co Name` AS billing_company, \
		`Street Address 1` AS billing_address_1, \
		`Street Address 2` AS billing_address_2, \
		`City` AS billing_city, \
		`State` AS billing_state, \
		`Postal Code` AS billing_postcode, \
		`Country` AS billing_country, \
		`First Name` AS shipping_first_name, \
		`Last Name` AS shipping_last_name, \
		`Co Name` AS shipping_company, \
		`Street Address 1` AS shipping_address_1, \
		`Street Address 2` AS shipping_address_2, \
		`City` AS shipping_city, \
		`State` AS shipping_state, \
		`Postal Code` AS shipping_postcode, \
		`Country` AS shipping_country, \
		`Order Total` AS total_price, \
		"USD" AS currency, \
		`Product Name` AS line_items_titles \
	FROM `infusionsoft_orders` `orders` \
	WHERE \
		`orders`.`shopify_id` IS NULL AND \
		`orders`.`shopify_notes` IS NULL \
	LIMIT '+config.general.queryLimit;

/**
 * Get order data
 * @param {object} MySQL database object
 */
var getOrders = function(localDatabase) {
	var pool = localDatabase.getConnection(function(error, orderDataConnection) {
		var orderDataQuery = orderDataConnection.query(orderDataQueryString);
		orderDataQuery.on('error', function(error) {
			console.error(error);
		});
		orderDataQuery.on('result', function(row) {
			formatOrderData(row, function(orderJSON) {
				orderDataObject = {
					"order": orderJSON
				};
				sendOrderDataToAPI(orderDataObject);
			});
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
var formatOrderData = function(row, callback) {
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

	row.line_items = [];

	row.customer = {
		"id": row.customer_id
	};
	delete row.customer_id;

	getInfusionsoftProductIds(row, callback);
}

/**
 * Get Infusionsoft product data by product name
 * @param {string}   string   string of product names
 * @param {function} callback callback function
 */
var getInfusionsoftProductIds = function(row, callback) {
	localDatabase.getConnection(function(error, productDataConnection) {
		var lineItemsArray = [],
			productData = productDataConnection.query('SELECT shopify_product_id AS `id`, shopify_variant_id AS `variant_id`, `Price` as `price`, `Product Name` as `title` FROM infusionsoft_products WHERE `Product Name` IN ("'+row.line_items_titles.toString('utf-8').replace(';', '","')+'");');
		productData.on('error', function(error) {
			console.error(error);
		});
		productData.on('result', function(productRow) {
			row.line_items.push({
				"id": productRow.id,
				"title": productRow.title,
				"variant_id": productRow.variant_id,
				"price": productRow.price
			});
		});
		productData.on('end', function() {
			delete row.line_items_titles;
			callback(row);
			productDataConnection.release();
			if (error) {
				throw error;
			}
		})
	});
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
		var orderId = orderDataObject.order.id,
			shopifyId = shopifyData.id;

		localDatabase.getConnection(function (error, updateConnection) {
			var updateOrder = updateConnection.query('UPDATE `infusionsoft_orders` SET `shopify_id` = "'+shopifyId+'" WHERE `id` = "'+orderId+'"');
			updateOrder.on('error', function(error) {
				console.error(error);
			});
			updateOrder.on('result', function(row) {
				console.log('Order '+orderId+' updated with Shopify ID '+shopifyId+'.');
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
	var errorMessage = JSON.stringify(shopifyData),
		orderId = orderDataObject.order.id;
	console.log('error note for order '+orderId+': ');console.log(errorMessage);
	if (orderDataObject && shopifyData) {
		if (typeof errorMessage === 'undefined') {
			errorMessage = 'undefined error';
		}
		var updateOrder = localDatabase.query('UPDATE `infusionsoft_orders` SET `shopify_notes` = "'+localDatabase.escape(errorMessage)+'" WHERE `id` = "'+orderId+'"');
		updateOrder.on('error', function(error) {
			console.error(error);
		});
		updateOrder.on('result', function(row) {
			console.log('Order '+orderId+' updated with Shopify error notes.');
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
