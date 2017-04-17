CREATE TABLE `infusionsoft_products` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `Product Name` varchar(150) DEFAULT NULL,
  `Sku` varchar(50) DEFAULT NULL,
  `Price` varchar(8) DEFAULT NULL,
  `Product Status` enum('Active','Inactive') DEFAULT NULL,
  `Product Category` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
