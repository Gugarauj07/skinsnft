// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkinsNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event SkinMinted(uint256 indexed tokenId, address indexed to, string tokenURI);
    event SkinListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event SkinSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address initialOwner) ERC721("SkinsNFT", "SKIN") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit SkinMinted(tokenId, to, uri);
        return tokenId;
    }

    function mintBatch(address to, string[] memory uris) public onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](uris.length);
        for (uint256 i = 0; i < uris.length; i++) {
            tokenIds[i] = mint(to, uris[i]);
        }
        return tokenIds;
    }

    function listForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit SkinListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(listing.seller == msg.sender || owner() == msg.sender, "Not authorized");

        listing.active = false;
        emit ListingCancelled(tokenId, listing.seller);
    }

    function buy(uint256 tokenId) public payable {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(ownerOf(tokenId) == listing.seller, "Seller no longer owns");

        address seller = listing.seller;
        uint256 price = listing.price;

        listing.active = false;

        _transfer(seller, msg.sender, tokenId);

        (bool sent, ) = payable(seller).call{value: price}("");
        require(sent, "Transfer failed");

        if (msg.value > price) {
            (bool refund, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refund, "Refund failed");
        }

        emit SkinSold(tokenId, seller, msg.sender, price);
    }

    function getListing(uint256 tokenId) public view returns (address seller, uint256 price, bool active) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.active);
    }

    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}


