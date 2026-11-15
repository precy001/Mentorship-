-- Restore the original Lagos LGA / LCDA service areas.
--
-- Safe and repeatable: rows that already exist (matched on state + LGA + LCDA) are left exactly
-- as they are, so an administrator's enable/disable choices and edits are never overwritten, and
-- nothing is deleted. Running it on an empty table inserts every area; running it again inserts nothing.
-- Keep these rows in sync with prisma/data/service-areas.ts.
INSERT INTO "ServiceArea" ("id", "state", "lga", "lcda", "isActive", "createdAt", "updatedAt")
SELECT 'sa_' || substr(md5(v."state" || '|' || v."lga" || '|' || v."lcda"), 1, 24), v."state", v."lga", v."lcda", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Lagos', 'Agege', 'Orile Agege LCDA'),
  ('Lagos', 'Ajeromi-Ifelodun', 'Ifelodun LCDA'),
  ('Lagos', 'Alimosho', 'Agbado-Oke Odo LCDA'),
  ('Lagos', 'Alimosho', 'Ayobo-Ipaja LCDA'),
  ('Lagos', 'Alimosho', 'Egbe-Idimu LCDA'),
  ('Lagos', 'Alimosho', 'Mosan-Okunola LCDA'),
  ('Lagos', 'Alimosho', 'Igando-Ikotun LCDA'),
  ('Lagos', 'Amuwo-Odofin', 'Oriade LCDA'),
  ('Lagos', 'Apapa', 'Apapa Iganmu LCDA'),
  ('Lagos', 'Badagry', 'Olorunda LCDA'),
  ('Lagos', 'Badagry', 'Badagry West LCDA'),
  ('Lagos', 'Epe', 'Eredo LCDA'),
  ('Lagos', 'Epe', 'Ikosi-Ejirin LCDA'),
  ('Lagos', 'Eti-Osa', 'Ikoyi-Obalende LCDA'),
  ('Lagos', 'Eti-Osa', 'Iru/Victoria Island LCDA'),
  ('Lagos', 'Ibeju-Lekki', 'Lekki LCDA'),
  ('Lagos', 'Ifako-Ijaiye', 'Ojokoro LCDA'),
  ('Lagos', 'Ikeja', 'Onigbongbo LCDA'),
  ('Lagos', 'Ikeja', 'Ojodu LCDA'),
  ('Lagos', 'Ikorodu', 'Igbogbo-Baiyeku LCDA'),
  ('Lagos', 'Ikorodu', 'Ijede LCDA'),
  ('Lagos', 'Ikorodu', 'Imota LCDA'),
  ('Lagos', 'Ikorodu', 'Ikorodu North LCDA'),
  ('Lagos', 'Ikorodu', 'Ikorodu West LCDA'),
  ('Lagos', 'Kosofe', 'Agboyi-Ketu LCDA'),
  ('Lagos', 'Kosofe', 'Ikosi-Isheri LCDA'),
  ('Lagos', 'Lagos Island', 'Lagos Island East LCDA'),
  ('Lagos', 'Lagos Mainland', 'Yaba LCDA'),
  ('Lagos', 'Mushin', 'Odi-Olowo/Ojuwoye LCDA'),
  ('Lagos', 'Ojo', 'Iba LCDA'),
  ('Lagos', 'Ojo', 'Oto-Awori LCDA'),
  ('Lagos', 'Oshodi-Isolo', 'Ejigbo LCDA'),
  ('Lagos', 'Oshodi-Isolo', 'Isolo LCDA'),
  ('Lagos', 'Shomolu', 'Bariga LCDA'),
  ('Lagos', 'Surulere', 'Coker-Aguda LCDA'),
  ('Lagos', 'Surulere', 'Itire-Ikate LCDA'),
  ('Lagos', 'Other / not listed', 'Other LCDA')
) AS v("state", "lga", "lcda")
ON CONFLICT ("state", "lga", "lcda") DO NOTHING;

-- Retire (never delete) the two legacy options that were grouped under the wrong LGA.
UPDATE "ServiceArea" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "state" = 'Lagos' AND (
  ("lga" = 'Eti-Osa' AND "lcda" = 'Lekki LCDA') OR
  ("lga" = 'Lagos Mainland' AND "lcda" = 'Odi-Olowo/Ojuwoye LCDA')
) AND "isActive" = true;
