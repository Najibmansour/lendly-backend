-- Seed 100 demo listings for Lendly
-- Uses the first existing user as owner

INSERT INTO listings (
  id,
  "ownerId",
  title,
  description,
  category,
  city,
  latitude,
  longitude,
  address,
  condition,
  tags,
  images,
  "imageUrl",
  "hourlyRate",
  "dailyRate",
  "weeklyRate",
  status,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM users LIMIT 1),
  item.title,
  item.description,
  item.category,
  item.city,
  item.latitude,
  item.longitude,
  item.address,
  item.condition,
  item.tags,
  item.images,
  item.images[1],
  item.hourly_rate,
  item.daily_rate,
  item.weekly_rate,
  'ACTIVE',
  now(),
  now()
FROM (
  SELECT
    gs,
    CASE (gs % 10)
      WHEN 0 THEN 'Road Bike'
      WHEN 1 THEN 'Camping Tent'
      WHEN 2 THEN 'Power Drill'
      WHEN 3 THEN 'Projector'
      WHEN 4 THEN 'Camera Kit'
      WHEN 5 THEN 'Electric Scooter'
      WHEN 6 THEN 'Gaming Laptop'
      WHEN 7 THEN 'Sound Speaker'
      WHEN 8 THEN 'Surfboard'
      ELSE 'Lawn Mower'
    END || ' #' || gs AS title,

    'This is a high-quality rental item in very good condition, perfect for short-term use, weekend projects, trips, events, or testing before buying.' AS description,

    CASE (gs % 10)
      WHEN 0 THEN 'bikes'
      WHEN 1 THEN 'camping'
      WHEN 2 THEN 'tools'
      WHEN 3 THEN 'electronics'
      WHEN 4 THEN 'photography'
      WHEN 5 THEN 'mobility'
      WHEN 6 THEN 'computers'
      WHEN 7 THEN 'audio'
      WHEN 8 THEN 'sports'
      ELSE 'garden'
    END AS category,

    CASE (gs % 5)
      WHEN 0 THEN 'Paris'
      WHEN 1 THEN 'Berlin'
      WHEN 2 THEN 'Lyon'
      WHEN 3 THEN 'Marseille'
      ELSE 'Nice'
    END AS city,

    CASE (gs % 5)
      WHEN 0 THEN 48.8566 + (random() / 100)
      WHEN 1 THEN 52.5200 + (random() / 100)
      WHEN 2 THEN 45.7640 + (random() / 100)
      WHEN 3 THEN 43.2965 + (random() / 100)
      ELSE 43.7102 + (random() / 100)
    END AS latitude,

    CASE (gs % 5)
      WHEN 0 THEN 2.3522 + (random() / 100)
      WHEN 1 THEN 13.4050 + (random() / 100)
      WHEN 2 THEN 4.8357 + (random() / 100)
      WHEN 3 THEN 5.3698 + (random() / 100)
      ELSE 7.2620 + (random() / 100)
    END AS longitude,

    'Demo address ' || gs || ', city center' AS address,

    CASE (gs % 4)
      WHEN 0 THEN 'Like New'
      WHEN 1 THEN 'Good'
      WHEN 2 THEN 'Used'
      ELSE 'Excellent'
    END AS condition,

    ARRAY[
      'demo',
      'rental',
      CASE (gs % 3)
        WHEN 0 THEN 'popular'
        WHEN 1 THEN 'budget'
        ELSE 'premium'
      END
    ] AS tags,

    ARRAY[
      'https://picsum.photos/seed/lendly-' || gs || '-1/800/600',
      'https://picsum.photos/seed/lendly-' || gs || '-2/800/600'
    ] AS images,

    ROUND((5 + random() * 20)::numeric, 2) AS hourly_rate,
    ROUND((20 + random() * 80)::numeric, 2) AS daily_rate,
    ROUND((100 + random() * 400)::numeric, 2) AS weekly_rate

  FROM generate_series(1, 100) AS gs
) AS item;