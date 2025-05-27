// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPAManager} from "./IPAManager.sol";
import {IPGovernanceNoTimelock} from "./IPGovernorNoTimelock.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @title CreatorDAOFactory
/// @notice Deploys new CreatorDAO instances linked to a specific IP Asset.
contract IPDaoFactory is Ownable {

    /// @notice Emitted when a new CreatorDAO is created.
    event DaoCreated(address indexed governorAddress, address indexed managerAddress);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function createDao(
        address _ipId,
        address _licensingModule,
        address _pilTemplate,
        address _revenueToken,
        address _governor
    ) external onlyOwner {
        IPAManager manager = new IPAManager(
            _governor,
            _ipId,
            _licensingModule,
            _pilTemplate,
            _revenueToken
        );

        emit DaoCreated(
            address(_governor),
            address(manager)
        );
    }
}