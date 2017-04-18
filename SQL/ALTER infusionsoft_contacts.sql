UPDATE infusionsoft_contacts
SET
  `Date Created` = STR_TO_DATE(`Date Created`, '%c/%e/%Y %h:%m %p'),
  `Last Updated` = STR_TO_DATE(`Last Updated`, '%c/%e/%Y %h:%m %p'),
  `Date Added` = STR_TO_DATE(`Date Added`, '%m/%d/%y %H:%i:%s'),
  `Dateof Last Followup` = STR_TO_DATE(`Dateof Last Followup`, '%m/%d/%y %H:%i:%s'),
  `Date Entered` = STR_TO_DATE(`Date Entered`, '%m/%d/%Y %H:%i:%s');

UPDATE infusionsoft_contacts SET `Date Entered` = NULL WHERE `Date Entered` = '0000-00-00 00:00:00';
UPDATE infusionsoft_contacts SET `First Name` = NULL WHERE `First Name` = '';
UPDATE infusionsoft_contacts SET `Last Name` = NULL WHERE `Last Name` = '';
UPDATE infusionsoft_contacts SET `Phone 1` = NULL WHERE `Phone 1` = '';
UPDATE infusionsoft_contacts SET `Street Address 1` = NULL WHERE `Street Address 1` = '';
UPDATE infusionsoft_contacts SET `Street Address 2` = NULL WHERE `Street Address 2` = '';
UPDATE infusionsoft_contacts SET `City` = NULL WHERE `City` = '';
UPDATE infusionsoft_contacts SET `State` = NULL WHERE `State` = '';
UPDATE infusionsoft_contacts SET `Postal Code` = NULL WHERE `Postal Code` = '';
UPDATE infusionsoft_contacts SET `Country` = NULL WHERE `Country` = '';
UPDATE infusionsoft_contacts SET `Street Address 1 (Shipping)` = NULL WHERE `Street Address 1 (Shipping)` = '';
UPDATE infusionsoft_contacts SET `Street Address 2 (Shipping)` = NULL WHERE `Street Address 2 (Shipping)` = '';
UPDATE infusionsoft_contacts SET `City (Shipping)` = NULL WHERE `City (Shipping)` = '';
UPDATE infusionsoft_contacts SET `State (Shipping)` = NULL WHERE `State (Shipping)` = '';
UPDATE infusionsoft_contacts SET `Postal Code (Shipping)` = NULL WHERE `Postal Code (Shipping)` = '';
UPDATE infusionsoft_contacts SET `Country (Shipping)` = NULL WHERE `Country (Shipping)` = '';

ALTER TABLE infusionsoft_contacts
    CHANGE `Date Created` `Date Created` DATETIME DEFAULT NULL,
    CHANGE `Last Updated` `Last Updated` DATETIME DEFAULT NULL,
    CHANGE `Date Added` `Date Added` DATETIME DEFAULT NULL,
    CHANGE `Dateof Last Followup` `Dateof Last Followup` DATETIME DEFAULT NULL,
    CHANGE `Date Entered` `Date Entered` DATETIME DEFAULT NULL,
    ADD COLUMN `shopify_id` BIGINT(20) DEFAULT NULL AFTER Id;