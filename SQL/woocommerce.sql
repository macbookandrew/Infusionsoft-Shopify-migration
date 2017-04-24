ALTER TABLE `infusionsoft_products`
    ADD COLUMN `woocommerce_product_id` INT(11) DEFAULT NULL AFTER `shopify_variant_id`,
    ADD COLUMN `woocommerce_variant_id` INT(11) DEFAULT NULL AFTER `woocommerce_product_id`;

ALTER TABLE `infusionsoft_orders` ADD COLUMN woocommerce_order_id INT(11) DEFAULT NULL AFTER `id`;

CREATE TABLE `infusionsoft_woo_order_matching` (
    `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
    `infusionsoft_id` int(11) DEFAULT NULL,
    `woocommerce_id` int(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/* NOTE: change your WP prefix if necessary in `wp_postmeta` and `wp_posts` */
INSERT INTO `infusionsoft_woo_order_matching` (`infusionsoft_id`, `woocommerce_id`)
    SELECT `meta_value`, `post_id`
    FROM `wp_postmeta` `meta`
    JOIN `wp_posts` `posts` ON `posts`.`ID` = `meta`.`post_id`
    WHERE `posts`.`post_type` = 'shop_order' AND `meta`.`meta_key` = 'infusionsoft_order_id';

/* NOTE: change your WP prefix if necessary in `wp_postmeta` and `wp_posts` */
UPDATE `infusionsoft_orders` `orders`, `infusionsoft_woo_order_matching` `match`
SET `woocommerce_order_id` = `match`.`woocommerce_id`
WHERE `match`.`infusionsoft_id` = `orders`.`id`;
