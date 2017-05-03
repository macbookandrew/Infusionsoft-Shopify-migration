ALTER TABLE infusionsoft_contacts
	ADD COLUMN `wrapup_complete` TINYINT(1) DEFAULT NULL AFTER `shopify_notes`,
	ADD COLUMN `wrapup_notes` BLOB AFTER `wrapup_complete`;
