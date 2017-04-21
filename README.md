# Introduction

A helper utility to copy Infusionsoft contacts and orders history to Shopify.

It also optionally pulls info from a WooCommerce installation, as long as the same database contains these fields:

- `wp_posts`
- `wp_postmeta`
- `wp_woocommerce_order_items`
- `wp_woocommerce_order_itemmeta`

# Requirements

- Infusionsoft
- Shopify
- MySQL
- Node.JS

# Getting Started

0. Create the products in Shopify with variants and SKUs as appropriate
1. Export all contacts, orders, and products from Infusionsoft
2. Import into MySQL
    a. Run all the `CREATE…` SQL files; modify custom field names as needed
    b. Import the CSV files exported from Infusionsoft
    c. Run all the `ALTER…` SQL files to clean up the data a bit
3. Copy `config.js.example` to `config.js` and add your Shopify API information
4. Create a private app in your Shopify account and grant it these permissions *at a minimum*:
    1. Read and write
        1. Customer details and customer groups
        1. Orders, transactions and fulfillments
        1. Draft orders
    2. Read only
        1. Home
        1. Product information
        1. Products, variants and collections
        1. Shipping rates, countries and provinces
        1. Store content like articles, blogs, comments, pages, and redirects
5. Run `$ npm install` to set up all the dependencies
6. Run `$ node products.js` to match up your Infusionsoft products with Shopify products
7. Run `$ node customers.js` to start the customer import
    - Optionally, run the `woocommerce.sql` SQL file if you have WooCommerce products to add, and then manually add the WooCommerce product and variation IDs to the `infusionsoft_products` table.

# Notes

Due to this being my first Node project, there are a few quirks that I know of, and possibly (likely) some of which I’m unaware.

- The files do not exit when finished with all operations; they just stop and there’s no more output. Press control-C to stop and re-run as necessary.
