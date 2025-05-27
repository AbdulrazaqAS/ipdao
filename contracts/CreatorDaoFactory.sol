// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CreatorIPManager} from "./CreatorDao.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CreatorDAOFactory
/// @notice Deploys new CreatorDAO instances linked to a specific IP Asset.
contract CreatorDaoFactory is Ownable {

    /// @notice Emitted when a new CreatorDAO is created.
    event DaoCreated(address indexed daoAddress, address indexed creator);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function createDao(
        address _ipAsset,
        address _licensingModule,
        address _pilTemplate,
        address _royaltyPolicyLAP,
        address _token
    ) external onlyOwner {
        CreatorIPManager manager = new CreatorIPManager(
            _ipAsset,
            _licensingModule,
            _pilTemplate,
            _royaltyPolicyLAP,
            _token
        );

        emit DaoCreated(
            address(dao),
            msg.sender
        );
    }
}