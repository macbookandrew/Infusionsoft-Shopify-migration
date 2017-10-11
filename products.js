// set up variables and MySQL
var config = require('./config'),
    events = require('events'),
    eventEmitter = new events.EventEmitter(),
    mysql = require('mysql'),
    localDatabase = mysql.createConnection(config.mysql),
    shopifyAPI = require('shopify-node-api'),
    Shopify = new shopifyAPI(config.shopify),
    productQueryString = 'SELECT `products`.`id` AS infusionsoft_id, `products`.`Product Name` AS product_name, `products`.`Sku` AS sku FROM `infusionsoft_products` `products` WHERE `Product Status` LIKE "Active" AND `shopify_product_id` IS NULL AND `shopify_variant_id` IS NULL;';

/**
 * Get product data
 * @param {object} database MySQL database connection
 */
var getLocalProductData = function(database, shopifyProductData) {
    var productQuery = localDatabase.query(productQueryString);
    productQuery.on('error', function(error) {
        console.error(error);
    });
    productQuery.on('result', function(row) {
        if (global.shopifyProductData.length == undefined) {
            getShopifyProductData();
        }
        productObject = {
            "product": row
        };
        eventEmitter.emit('haveLocalProductData', productObject, shopifyProductData);
    });
}

/**
 * Get all Shopify product data
 */
var getShopifyProductData = function() {
    Shopify.get('/admin/products.json?fields=id,title,variants', function(error, data, headers) {
        if (error) {
            console.error(error);
        } else {
            global.shopifyProductData = data;
            eventEmitter.emit('haveShopifyProductData', data);
        }
    });
}

/**
 * Update product data in local database
 * @param {object} productObject product data from MySQL
 * @param {object} shopifyProductData product data from Shopify
 */
var updateLocalProductData = function(productObject, shopifyProductData) {
    var infusionsoftId = productObject.product.infusionsoft_id,
        infusionsoftSku = productObject.product.sku;
    for (i in shopifyProductData.products) {
        var thisProduct = shopifyProductData.products[i];
        for (j in thisProduct.variants) {
            var thisVariant = thisProduct.variants[j];
            if (thisVariant.sku === infusionsoftSku) {
                var updateProduct = localDatabase.query('UPDATE `infusionsoft_products` SET `shopify_product_id` = '+thisProduct.id+', `shopify_variant_id` = '+thisVariant.id+' WHERE `id` = '+infusionsoftId+';');
                updateProduct.on('error', function(error) {
                    console.error(error);
                })
                updateProduct.on('result', function(row) {
                    console.log('Product updated: '+thisProduct.title+': '+thisVariant.title);
                });
            }
        }
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

localDatabase.connect();
getShopifyProductData();
eventEmitter.on('haveShopifyProductData', function(data) {
    getLocalProductData(localDatabase, data);
});
eventEmitter.on('haveLocalProductData', function(data, shopifyProductData) {
    updateLocalProductData(data, shopifyProductData);
});

process.on('exit', exitHandler.bind(null, {cleanup: true}));
