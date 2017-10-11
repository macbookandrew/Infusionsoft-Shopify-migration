UPDATE infusionsoft_products SET `Price` = REPLACE(`Price`, '$', '');

ALTER TABLE infusionsoft_products
    CHANGE `Price` `Price` float(6,2) DEFAULT NULL,
    ADD COLUMN `shopify_product_id` BIGINT(20) DEFAULT NULL AFTER `id`,
    ADD COLUMN `shopify_variant_id` BIGINT(20) DEFAULT NULL AFTER `shopify_product_id`;
