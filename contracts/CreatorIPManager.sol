// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ILicensingModule } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@story-protocol/protocol-core/contracts/lib/PILFlavors.sol";

/// @title CreatorDAO
/// @notice Manager for a specific IP Asset.
contract CreatorIPManager is Ownable, ERC721Holder {
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;

    address public immutable ipId;
    address public immutable revenueToken;
    address public immutable governanceToken;

    constructor(
        address _initialOwner,
        address _ipId,
        address _licensingModule,
        address _pilTemplate,
        address _revenueToken,
        address _governanceToken
    ) Ownable(_initialOwner) {
        ipId = _ipId;
        revenueToken = _revenueToken;
        governanceToken = _governanceToken;
        LICENSING_MODULE = ILicensingModule(_licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(_pilTemplate);
    }

    function CreateTermsAndAttach(uint256 mintingFee, uint32 commercialRevShare, address royaltyPolicy) external onlyOwner {
        uint256 licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee : mintingFee,
                commercialRevShare : commercialRevShare,
                royaltyPolicy : royaltyPolicy,
                currencyToken: revenueToken
            })
        );

        // attach the license terms to the IP Asset
        LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);
    }
}