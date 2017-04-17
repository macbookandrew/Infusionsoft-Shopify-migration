UPDATE infusionsoft_products SET `Price` = REPLACE(`Price`, '$', '');

ALTER TABLE infusionsoft_products CHANGE `Price` `Price` float(6,2) DEFAULT NULL;
