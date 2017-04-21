ALTER TABLE `infusionsoft_products`
    ADD COLUMN `woocommerce_product_id` INT(11) DEFAULT NULL AFTER `shopify_variant_id`,
    ADD COLUMN `woocommerce_variant_id` INT(11) DEFAULT NULL AFTER `woocommerce_product_id`;

ALTER TABLE `infusionsoft_orders` ADD COLUMN woocommerce_order_id INT(11) DEFAULT NULL AFTER `id`;

/* NOTE: change your WP prefix if necessary in `wp_postmeta` and `wp_posts` */
UPDATE `infusionsoft_orders` `orders`, `wp_postmeta` `meta`, `wp_posts` `posts`
SET `orders`.`woocommerce_order_id` = `meta`.`post_id`
WHERE `meta`.`meta_value` = `orders`.`id`
  AND `meta`.`post_id` = `posts`.`ID`
  AND `posts`.`post_type` = 'shop_order';
