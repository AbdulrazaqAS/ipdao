// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CreatorDAO
/// @notice Manager for a specific IP Asset.
contract CreatorIPManager is Ownable {
    /// @notice The address of the IP Asset.
    address public immutable ipAsset;

    /// @notice The address of the Licensing Module.
    address public immutable licensingModule;

    /// @notice The address of the PIL License Template.
    address public immutable pilTemplate;

    /// @notice The address of the Royalty Policy LAP.
    address public immutable royaltyPolicyLAP;

    constructor(
        address _initialOwner,
        address _ipAsset,
        address _licensingModule,
        address _pilTemplate,
        address _royaltyPolicyLAP,
        address _revenueToken,
        address _governanceToken
    ) Ownable(_initialOwner) {
        ipAsset = _ipAsset;
        licensingModule = _licensingModule;
        pilTemplate = _pilTemplate;
        royaltyPolicyLAP = _royaltyPolicyLAP;
        revenueToken = _revenueToken;
        governanceToken = _governanceToken;
    }
}