# Introduction

A helper utility to copy Infusionsoft contacts and their order history to Shopify. It ignores Infusionsoft contacts who do not have orders associated with their contact ID.

It also optionally pulls info from a WooCommerce installation, as long as the same database contains these fields:

- `wp_posts`
- `wp_postmeta`
- `wp_woocommerce_order_items`
- `wp_woocommerce_order_itemmeta`

# Requirements

- Infusionsoft
- Shopify
- Local MySQL installation
- Node.JS

# Getting Started

0. Create the products in Shopify with variants and SKUs as appropriate
1. Export all contacts, orders, and products from Infusionsoft
2. Import into MySQL
    1. Run all the `SQL/CREATE…` SQL files; modify custom field names as needed
    2. Import the CSV files exported from Infusionsoft
    3. Run all the `SQL/ALTER…` SQL files to clean up the data a bit
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
    - Optionally, run the `woocommerce.sql` SQL file if you have WooCommerce products to add, and then manually add the WooCommerce product and variation IDs to the `infusionsoft_products` table.
7. Run `$ node customers.js` to start importing customers. I recommend you keep the `config.general.queryLimit` parameter fairly low (5–10) and run the script once or twice and double-check the results. Then bump it up to a few hundred or thousand and run as many times as necessary to finish importing all your contacts.
8. Go back through the `infusionsoft_contacts` database and fix everything you can in the `shopify_notes` field, and then re-run `$ node customers.js` to finish importing customers.
    - Take a look at `SQL/suggested-cleanup.sql` as for some suggested cleanup actions, and then manually fix other issues you see in your database.
9. If importing WooCommerce data, run `$ node orders-woocommerce.js` first to start the order import (don’t forget to run the `woocommerce.sql` file first…)
10. Run `$ node orders.js` to import the orders
11. Run `SQL/wrapup.sql` to prepare the `infusionsoft_contacts` table
12. Run `$ node wrapup.js` to update cutomer info with the last order ID and total dollar amount spent

# Notes

Due to this being my first Node project, there are a few quirks that I know of, and possibly (likely) some of which I’m unaware.

- Use at your own risk. I cannot offer any support for this utility or anything it may do to your Shopify store or local database.
- The files do not exit cleanly when finished with all operations; they just stop with no more output. However, `node`’s CPU usage will drop to 0 when finished, so you can verify that it is finished. Press control-C to kill the script and then re-run as necessary.
- Bumping `config.general.queryLimit` up to 10000 causes “too many files open on the system” errors. 5000 seems to be a workable number.
