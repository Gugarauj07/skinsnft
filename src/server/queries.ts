import { getDb } from "./db";
import { getOwnerOf, getListingOnChain } from "./blockchain";

export function getAllSkins() {
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
        s.metadata_uri AS metadataUri
      FROM skins s
      ORDER BY s.token_id ASC
    `,
    )
    .all() as {
    id: string;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    metadataUri: string | null;
  }[];
}

export async function getSkinWithOwner(tokenId: number) {
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
        s.metadata_uri AS metadataUri
      FROM skins s
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
        metadataUri: string | null;
      }
    | undefined;

  if (!skin) return null;

  const ownerAddress = await getOwnerOf(tokenId);
  const listing = await getListingOnChain(tokenId);

  const ownerUser = ownerAddress ? db.prepare("SELECT id, email FROM users WHERE wallet_address = ?").get(ownerAddress) as { id: string; email: string } | undefined : undefined;

  return {
    skin: {
      id: skin.id,
      tokenId: skin.tokenId,
      name: skin.name,
      rarity: skin.rarity,
      attributes: JSON.parse(skin.attributesJson) as unknown,
      imageSvg: skin.imageSvg,
      metadataUri: skin.metadataUri,
      owner: ownerUser ? { id: ownerUser.id, email: ownerUser.email, address: ownerAddress } : { address: ownerAddress },
    },
    listing: listing
      ? {
          price: listing.price.toString(),
          seller: listing.seller,
          active: listing.active,
        }
      : null,
  };
}

export async function getActiveListingsFromChain() {
  const db = getDb();
  const skins = getAllSkins();
  const activeListings: Array<{
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    price: string;
    sellerAddress: string;
    sellerEmail: string | null;
  }> = [];

  for (const skin of skins) {
    const listing = await getListingOnChain(skin.tokenId);
    if (listing && listing.active) {
      const sellerUser = db.prepare("SELECT email FROM users WHERE wallet_address = ?").get(listing.seller) as { email: string } | undefined;
      activeListings.push({
        tokenId: skin.tokenId,
        name: skin.name,
        rarity: skin.rarity,
        imageSvg: skin.imageSvg,
        price: listing.price.toString(),
        sellerAddress: listing.seller,
        sellerEmail: sellerUser?.email ?? null,
      });
    }
  }

  return activeListings;
}

export async function getMySkins(walletAddress: string) {
  const db = getDb();
  const skins = getAllSkins();
  const mySkins: Array<{
    id: string;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    listingPrice: string | null;
  }> = [];

  for (const skin of skins) {
    const owner = await getOwnerOf(skin.tokenId);
    if (owner?.toLowerCase() === walletAddress.toLowerCase()) {
      const listing = await getListingOnChain(skin.tokenId);
      mySkins.push({
        id: skin.id,
        tokenId: skin.tokenId,
        name: skin.name,
        rarity: skin.rarity,
        imageSvg: skin.imageSvg,
        listingPrice: listing?.active ? listing.price.toString() : null,
      });
    }
  }

  return mySkins;
}

export function getSkinByTokenId(tokenId: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM skins WHERE token_id = ?").get(tokenId) as {
    id: string;
    token_id: number;
    name: string;
    rarity: string;
    attributes_json: string;
    image_svg: string;
    metadata_uri: string | null;
  } | undefined;
}
