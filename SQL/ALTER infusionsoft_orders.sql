UPDATE infusionsoft_orders SET `Order Total` = REPLACE(`Order Total`, '$', '');
UPDATE infusionsoft_orders SET `Order Date` = STR_TO_DATE(`Order Date`, '%c/%e/%Y');

ALTER TABLE infusionsoft_orders
    CHANGE `Order Date` `Order Date` date DEFAULT NULL
    CHANGE `Order Total` `Order Total` float(6,2) DEFAULT NULL,
    ADD COLUMN `shopify_id` BIGINT(20) DEFAULT NULL AFTER Id;
