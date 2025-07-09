// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.26;

import {GovernorUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import {GovernorCountingSimpleUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import {GovernorSettingsUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import {GovernorStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorStorageUpgradeable.sol";
import {GovernorVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import {GovernorVotesQuorumFractionUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";

contract IPAGovernor is GovernorUpgradeable, GovernorSettingsUpgradeable, GovernorCountingSimpleUpgradeable, GovernorStorage, GovernorVotesUpgradeable, GovernorVotesQuorumFractionUpgradeable {
    uint256 public participationThreshold;  // Minimum participation threshold for non-proposal actions

    event ParticipationThresholdUpdated(uint256 newThreshold);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor () {
        _disableInitializers();
    }
    
    function initialize(
        string memory name,
        uint48 initialVotingDelay,
        uint32 initialVotingPeriod,
        uint256 initialProposalThreshold,
        uint256 quorumNumeratorValue,
        uint256 _participationThreshold,
        IVotes _token
    ) external initializer {
        __Governor_init(name);
        __GovernorSettings_init(initialVotingDelay, initialVotingPeriod, initialProposalThreshold);
        __GovernorVotes_init(_token);
        __GovernorVotesQuorumFraction_init(quorumNumeratorValue);
        
        participationThreshold = _participationThreshold;
        emit ParticipationThresholdUpdated(_participationThreshold);
    }

    function setParticipationThreshold(uint256 _participationThreshold) external onlyGovernance {
        participationThreshold = _participationThreshold;
        emit ParticipationThresholdUpdated(_participationThreshold);
    }

    // The following functions are overrides required by Solidity.

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description, address proposer)
        internal
        override(Governor, GovernorStorage)
        returns (uint256)
    {
        return super._propose(targets, values, calldatas, description, proposer);
    }
}
