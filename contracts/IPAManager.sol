// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ILicensingModule } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@story-protocol/protocol-core/contracts/lib/PILFlavors.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ICoreMetadataViewModule } from "@story-protocol/protocol-core/contracts/interfaces/modules/metadata/ICoreMetadataViewModule.sol";

contract IPAManager is Ownable, ERC721Holder {
    ILicensingModule public LICENSING_MODULE;
    IPILicenseTemplate public PIL_TEMPLATE;
    ICoreMetadataViewModule public CORE_METADATA_VIEW_MODULE;

    address[] public assets;
    address public revenueToken;

    event AssetAdded(address indexed assetId);
    event AssetTransferred(address indexed assetId, address collection, address to, uint256 tokenId);
    event NFTReceived(address collection, address from, uint256 tokenId);
    event LicensingModuleUpdated(address indexed newLicensingModule);
    event PILTemplateUpdated(address indexed newPILTemplate);
    event CoreMetadataViewModuleUpdated(address indexed newCoreMetadataViewModule);
    event TermsAttached(address indexed assetId, uint256 licenseTermsId);
    event RevenueTokenUpdated(address indexed newRevenueToken);

    constructor(
        address _initialOwner,
        address _licensingModule,
        address _pilTemplate,
        address _coreMetadataViewModule,
        address _revenueToken
    ) Ownable(_initialOwner) {
        revenueToken = _revenueToken;
        LICENSING_MODULE = ILicensingModule(_licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(_pilTemplate);
        CORE_METADATA_VIEW_MODULE = ICoreMetadataViewModule(_coreMetadataViewModule);
    }

    function addAsset(address assetId) external onlyOwner {
        require(assetId != address(0), "Invalid asset ID");
        require(!hasAsset(assetId), "Asset already exists");
        require(CORE_METADATA_VIEW_MODULE.getOwner(assetId) == address(this), "Contract must own the asset");

        assets.push(assetId);
        emit AssetAdded(assetId);
    }

    function _removeAsset(address assetId) internal {
        require(hasAsset(assetId), "Asset does not exist");

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == assetId) {
                _removeAssetAtIndex(i);
                break;
            }
        }
    }

    function _removeAssetAtIndex(uint256 index) internal {
        require(index < assets.length, "Index out of bounds");
        assets[index] = assets[assets.length - 1];
        assets.pop();
    }

    function transferAsset(address assetId, address collection, address to, uint256 tokenId) external onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");
        require(to != address(0), "Invalid recipient address");

        IERC721(collection).safeTransferFrom(address(this), to, tokenId);

        // Remove the asset from the manager
        _removeAsset(assetId);
        emit AssetTransferred(assetId, collection, to, tokenId);
    }

    function attachLicenseTerms(address assetId, uint256 licenseTermsId) external onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");
        LICENSING_MODULE.attachLicenseTerms(assetId, address(PIL_TEMPLATE), licenseTermsId);
        emit TermsCreatedAndAttached(assetId, licenseTermsId);
    }

    // For owner to mint custom licnese tokens only. Not for public use.
    function mintLicenseTokens(
        address licensorIpId,
        uint256 licenseTermsId,
        uint256 amount,
        address receiver,
        bytes calldata royaltyContext
    ) external onlyOwner returns (uint256 startLicenseTokenId) {
        require(hasAsset(licensorIpId), "Asset does not exist");

        startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens(
            licensorIpId,
            address(PIL_TEMPLATE),
            licenseTermsId,
            amount,
            receiver,
            royaltyContext,
            0,
            100 // Won't hurt because this is only for owner
        );
    }

    function onERC721Received(
        address collection,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        // Ensure the contract is receiving an NFT
        require(IERC721(msg.sender).ownerOf(tokenId) == address(this), "NFT not owned by this contract");
        emit NFTReceived(collection, from, tokenId);

        return this.onERC721Received.selector;
    }

    function setLicensingModule(address licensingModule) external onlyOwner {
        require(licensingModule != address(0), "Invalid address");
        LICENSING_MODULE = ILicensingModule(licensingModule);
        emit LicensingModuleUpdated(licensingModule);
    }

    function setPILTemplate(address pilTemplate) external onlyOwner {
        require(pilTemplate != address(0), "Invalid address");
        PIL_TEMPLATE = IPILicenseTemplate(pilTemplate);
        emit PILTemplateUpdated(pilTemplate);
    }

    function setCoreMetadataViewModule(address coreMetadataViewModule) external onlyOwner {
        require(coreMetadataViewModule != address(0), "Invalid address");
        CORE_METADATA_VIEW_MODULE = ICoreMetadataViewModule(coreMetadataViewModule);
        emit CoreMetadataViewModuleUpdated(coreMetadataViewModule);
    }

    function setRevenueToken(address newRevenueToken) external onlyOwner {
        require(newRevenueToken != address(0), "Invalid address");
        revenueToken = newRevenueToken;
        emit RevenueTokenUpdated(newRevenueToken);
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
