// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract V4NFT is ERC721 {
    constructor() ERC721("V4NFT", "MNFT") {}
    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
}
