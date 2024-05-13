// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract V4Token is ERC20 {
    constructor() ERC20("V4", "V4Tokens") {
        _mint(msg.sender, 10**25);
    }
}
