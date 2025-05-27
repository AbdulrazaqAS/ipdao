// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CreatorIPManager} from "./CreatorIPManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CreatorDAOFactory
/// @notice Deploys new CreatorDAO instances linked to a specific IP Asset.
contract CreatorDaoFactory is Ownable {

    /// @notice Emitted when a new CreatorDAO is created.
    event DaoCreated(address indexed managerAddress, address indexed owner);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function createDao(
        address _initialOwner,
        address _ipId,
        address _licensingModule,
        address _pilTemplate,
        address _revenueToken,
        address _governanceToken
    ) external onlyOwner {
        CreatorIPManager manager = new CreatorIPManager(
            _initialOwner,
            _ipId,
            _licensingModule,
            _pilTemplate,
            _revenueToken,
            _governanceToken
        );

        emit DaoCreated(
            address(manager),
            _initialOwner
        );
    }
}