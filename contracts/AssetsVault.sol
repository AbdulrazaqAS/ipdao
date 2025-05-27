// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title AssetsVault
/// @notice A vault for managing all organization's assets.
contract AssetsVault is ERC721Holder{
    /// @notice The address of the IP Asset.
    address public immutable ipAsset;

    /// @notice The address of the revenue token.
    address public immutable revenueToken;

    /// @notice The address of the governance token.
    address public immutable governanceToken;

    constructor (address _ipAsset, address _revenueToken, address _governanceToken){
        ipAsset
    }
}