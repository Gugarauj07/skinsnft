import { ensureSeeded, getDb } from "./db";

export function getAllSkins() {
  ensureSeeded();
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        s.id AS id,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg,
        u.email AS ownerEmail,
        u.id AS ownerId
      FROM skins s
      JOIN users u ON u.id = s.owner_id
      ORDER BY s.token_id ASC
    `,
    )
    .all() as {
    id: string;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    ownerEmail: string;
    ownerId: string;
  }[];
}

export function getSkinWithListingByTokenId(tokenId: number) {
  ensureSeeded();
  const db = getDb();
  const skin = db
    .prepare(
      `
      SELECT
        s.id AS id,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.attributes_json AS attributesJson,
        s.image_svg AS imageSvg,
        u.email AS ownerEmail,
        u.id AS ownerId
      FROM skins s
      JOIN users u ON u.id = s.owner_id
      WHERE s.token_id = ?
      LIMIT 1
    `,
    )
    .get(tokenId) as
    | {
        id: string;
        tokenId: number;
        name: string;
        rarity: string;
        attributesJson: string;
        imageSvg: string;
        ownerEmail: string;
        ownerId: string;
      }
    | undefined;

  if (!skin) return null;

  const listing = db
    .prepare(
      `
      SELECT
        l.id AS id,
        l.price AS price,
        l.status AS status,
        l.seller_id AS sellerId,
        su.email AS sellerEmail
      FROM listings l
      JOIN users su ON su.id = l.seller_id
      WHERE l.skin_id = ? AND l.status = 'ACTIVE'
      LIMIT 1
    `,
    )
    .get(skin.id) as
    | { id: string; price: number; status: string; sellerId: string; sellerEmail: string }
    | undefined;

  return {
    skin: {
      id: skin.id,
      tokenId: skin.tokenId,
      name: skin.name,
      rarity: skin.rarity,
      attributes: JSON.parse(skin.attributesJson) as unknown,
      imageSvg: skin.imageSvg,
      owner: { id: skin.ownerId, email: skin.ownerEmail },
    },
    listing: listing
      ? { id: listing.id, price: listing.price, status: listing.status, seller: { id: listing.sellerId, email: listing.sellerEmail } }
      : null,
  };
}

export function getActiveListings() {
  ensureSeeded();
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        l.id AS id,
        l.price AS price,
        l.created_at AS createdAt,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg,
        su.email AS sellerEmail,
        su.id AS sellerId
      FROM listings l
      JOIN skins s ON s.id = l.skin_id
      JOIN users su ON su.id = l.seller_id
      WHERE l.status = 'ACTIVE'
      ORDER BY l.created_at DESC
    `,
    )
    .all() as {
    id: string;
    price: number;
    createdAt: string;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    sellerEmail: string;
    sellerId: string;
  }[];
}

export function getMySkinsWithActiveListing(ownerId: string) {
  ensureSeeded();
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        s.id AS id,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg,
        l.id AS listingId,
        l.price AS listingPrice
      FROM skins s
      LEFT JOIN listings l
        ON l.skin_id = s.id
       AND l.status = 'ACTIVE'
      WHERE s.owner_id = ?
      ORDER BY s.token_id ASC
    `,
    )
    .all(ownerId) as {
    id: string;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    listingId: string | null;
    listingPrice: number | null;
  }[];
}

export function getMyListings(sellerId: string) {
  ensureSeeded();
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        l.id AS id,
        l.price AS price,
        l.status AS status,
        l.created_at AS createdAt,
        l.sold_at AS soldAt,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg,
        bu.email AS buyerEmail
      FROM listings l
      JOIN skins s ON s.id = l.skin_id
      LEFT JOIN users bu ON bu.id = l.buyer_id
      WHERE l.seller_id = ?
      ORDER BY l.created_at DESC
    `,
    )
    .all(sellerId) as {
    id: string;
    price: number;
    status: "ACTIVE" | "SOLD" | "CANCELLED" | string;
    createdAt: string;
    soldAt: string | null;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    buyerEmail: string | null;
  }[];
}


