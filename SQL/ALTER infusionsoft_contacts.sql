UPDATE infusionsoft_contacts
SET
  `Date Created` = STR_TO_DATE(`Date Created`, '%c/%e/%Y %h:%m %p'),
  `Last Updated` = STR_TO_DATE(`Last Updated`, '%c/%e/%Y %h:%m %p'),
  `Date Added` = STR_TO_DATE(`Date Added`, '%m/%d/%y %H:%i:%s'),
  `Dateof Last Followup` = STR_TO_DATE(`Dateof Last Followup`, '%m/%d/%y %H:%i:%s'),
  `Date Entered` = STR_TO_DATE(`Date Entered`, '%m/%d/%Y %H:%i:%s');

UPDATE infusionsoft_contacts SET `Date Entered` = NULL WHERE `Date Entered` = '0000-00-00 00:00:00';

ALTER TABLE infusionsoft_contacts
    CHANGE `Date Created` `Date Created` DATETIME DEFAULT NULL,
    CHANGE `Last Updated` `Last Updated` DATETIME DEFAULT NULL,
    CHANGE `Date Added` `Date Added` DATETIME DEFAULT NULL,
    CHANGE `Dateof Last Followup` `Dateof Last Followup` DATETIME DEFAULT NULL,
    CHANGE `Date Entered` `Date Entered` DATETIME DEFAULT NULL;
