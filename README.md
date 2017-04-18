# Introduction

A helper utility to copy Infusionsoft contacts and orders history to Shopify.

# Requirements

- Infusionsoft
- Shopify
- MySQL
- Node.JS

# Getting Started

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
5. In your console, run `node index.js` to start the import
