// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ILicensingModule } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@story-protocol/protocol-core/contracts/lib/PILFlavors.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract IPAManager is Ownable, ERC721Holder {
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;

    address[] public assets;
    address public immutable revenueToken;

    event AssetAdded(address indexed assetId);
    event AssetRemoved(address indexed assetId);

    constructor(
        address _initialOwner,
        address _licensingModule,
        address _pilTemplate,
        address _revenueToken
    ) Ownable(_initialOwner) {
        revenueToken = _revenueToken;
        LICENSING_MODULE = ILicensingModule(_licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(_pilTemplate);
    }

    function addAsset(address assetId, address tokenCollection, uint256 tokenId) external onlyOwner {
        require(assetId != address(0), "Invalid asset ID");
        require(!hasAsset(assetId), "Asset already exists");
        require(IERC721(tokenCollection).ownerOf(tokenId) == address(this), "Contract must own the asset");

        assets.push(assetId);
        emit AssetAdded(assetId);
    }

    function removeAsset(address assetId) external onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == assetId) {
                _removeAssetAtIndex(i);
                break;
            }
        }

        emit AssetRemoved(assetId);
    }

    function _removeAssetAtIndex(uint256 index) internal {
        require(index < assets.length, "Index out of bounds");
        assets[index] = assets[assets.length - 1];
        assets.pop();
    }

    function CreateTermsAndAttach(address asset, uint256 mintingFee, uint32 commercialRevShare, address royaltyPolicy) external onlyOwner {
        uint256 licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee : mintingFee,
                commercialRevShare : commercialRevShare,
                royaltyPolicy : royaltyPolicy,
                currencyToken: revenueToken
            })
        );

        // attach the license terms to the IP Asset
        LICENSING_MODULE.attachLicenseTerms(asset, address(PIL_TEMPLATE), licenseTermsId);
    }

    function getAssets() external view returns (address[] memory) {
        return assets;
    }

    function hasAsset(address assetId) public view returns (bool) {
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == assetId) {
                return true;
            }
        }
        return false;
    }

    function getAssetCount() external view returns (uint256) {
        return assets.length;
    }
}