// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ICoreMetadataViewModule } from "@storyprotocol/core/interfaces/modules/metadata/ICoreMetadataViewModule.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ISPGNFT } from "@storyprotocol/periphery/interfaces/ISPGNFT.sol";
import { IRegistrationWorkflows } from "@storyprotocol/periphery/interfaces/workflows/IRegistrationWorkflows.sol";
import { IDerivativeWorkflows } from "@storyprotocol/periphery/interfaces/workflows/IDerivativeWorkflows.sol";
import { WorkflowStructs } from "@storyprotocol/periphery/lib/WorkflowStructs.sol";

contract IPAManager is Ownable, ERC721Holder {
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    ICoreMetadataViewModule public immutable CORE_METADATA_VIEW_MODULE;
    IRegistrationWorkflows public immutable REGISTRATION_WORKFLOWS;
    IDerivativeWorkflows public immutable DERIVATIVE_WORKFLOWS;
    ISPGNFT public immutable SPG_NFT;

    address[] public assets;
    address public revenueToken;

    event AssetAdded(address assetId);
    event AssetTransferred(address assetId, address collection, address to, uint256 tokenId);
    event TermsAttached(address indexed assetId, uint256 licenseTermsId);
    event NFTReceived(address collection, address from, uint256 tokenId);
    event RevenueTokenUpdated(address newRevenueToken);
    event DerivativeAssetCreated(address childIpId, uint256 childTokenId, address[] parentIpIds, uint256[] licenseTermsIds);

    constructor(
        address _initialOwner,
        address _ipAssetRegistry,
        address _licensingModule,
        address _pilTemplate,
        address _coreMetadataViewModule,
        address _registrationWorkflows,
        address _derivativeWorkflows,
        address _revenueToken,
        string memory _spgName,
        string memory _spgSymbol
    ) Ownable(_initialOwner) {
        revenueToken = _revenueToken;
        IP_ASSET_REGISTRY = IIPAssetRegistry(_ipAssetRegistry);
        LICENSING_MODULE = ILicensingModule(_licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(_pilTemplate);
        CORE_METADATA_VIEW_MODULE = ICoreMetadataViewModule(_coreMetadataViewModule);
        REGISTRATION_WORKFLOWS = IRegistrationWorkflows(_registrationWorkflows);
        DERIVATIVE_WORKFLOWS = IDerivativeWorkflows(_derivativeWorkflows);

        SPG_NFT = ISPGNFT(
            REGISTRATION_WORKFLOWS.createCollection(
                ISPGNFT.InitParams({
                    name: _spgName,
                    symbol: _spgSymbol,
                    baseURI: "",
                    contractURI: "",
                    maxSupply: 10000,
                    mintFee: 0,
                    mintFeeToken: address(0),
                    mintFeeRecipient: address(this),
                    owner: address(this),
                    mintOpen: true,
                    isPublicMinting: false
                })
            )
        );
    }

    // For adding already registered assets
    function addAsset(address assetId) public onlyOwner {
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

    function createAssetFromNFT(
        address tokenCollection,
        uint256 tokenId,
        uint256 licenseTermsId
    ) external onlyOwner returns (address ipId) {
        // require(IERC721(tokenCollection).ownerOf(tokenId) == address(this), "Contract must own the NFT");
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(tokenCollection), tokenId);  // Checks for ownership
        addAsset(ipId);
        attachLicenseTerms(ipId, licenseTermsId);
    }

    /// @notice Mint an NFT and register it in the same call via the Story Protocol Gateway.
    function createAsset(
        string memory _ipMetadataURI,
        string memory _ipMetadataHash,
        string memory _nftMetadataURI,
        string memory _nftMetadataHash
    ) external onlyOwner returns (address ipId, uint256 tokenId){
        (ipId, tokenId) = REGISTRATION_WORKFLOWS.mintAndRegisterIp(
            address(SPG_NFT),
            address(this),  // receiver
            WorkflowStructs.IPMetadata({
                ipMetadataURI: _ipMetadataURI,
                ipMetadataHash: bytes32(bytes(_ipMetadataHash)),
                nftMetadataURI: _nftMetadataURI,
                nftMetadataHash: bytes32(bytes(_nftMetadataHash))
            }),
            true  // allow duplicates with same metadata
        );

        addAsset(ipId);
    }

    function transferAsset(address assetId, address collection, address to, uint256 tokenId) external onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");
        require(to != address(0), "Invalid recipient address");

        IERC721(collection).safeTransferFrom(address(this), to, tokenId);

        // Remove the asset from the manager
        _removeAsset(assetId);
        emit AssetTransferred(assetId, collection, to, tokenId);
    }

    function attachLicenseTerms(address assetId, uint256 licenseTermsId) public onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");
        LICENSING_MODULE.attachLicenseTerms(assetId, address(PIL_TEMPLATE), licenseTermsId);
        emit TermsAttached(assetId, licenseTermsId);
    }

    // For owner to mint custom licnese tokens only. Not for public use.
    function mintLicenseTokens(
        address licensorIpId,
        uint256 licenseTermsId,
        uint256 amount,
        address receiver
    ) external onlyOwner returns (uint256 startLicenseTokenId) {
        require(hasAsset(licensorIpId), "Asset does not exist");

        startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens(
            licensorIpId,
            address(PIL_TEMPLATE),
            licenseTermsId,
            amount,
            receiver,
            "",
            0,
            100 // Won't hurt because this is only for owner
        );
    }

    // For owner to create derivatives.
    function mintAndRegisterAndMakeDerivative(
        address[] calldata _parentIpIds,
        uint256[] calldata _licenseTermsIds,
        string memory _ipMetadataURI,
        string memory _ipMetadataHash,
        string memory _nftMetadataURI,
        string memory _nftMetadataHash
    ) external onlyOwner {
        (address childIpId, uint256 childTokenId) = DERIVATIVE_WORKFLOWS.mintAndRegisterIpAndMakeDerivative(
            address(SPG_NFT),
            WorkflowStructs.MakeDerivative({
                parentIpIds: _parentIpIds,
                licenseTemplate: address(PIL_TEMPLATE),
                licenseTermsIds: _licenseTermsIds,
                royaltyContext: "",
                maxMintingFee: 0,
                maxRts: 0,
                maxRevenueShare: 30
            }),
            WorkflowStructs.IPMetadata({
                ipMetadataURI: _ipMetadataURI,
                ipMetadataHash: bytes32(bytes(_ipMetadataHash)),
                nftMetadataURI: _nftMetadataURI,
                nftMetadataHash: bytes32(bytes(_nftMetadataHash))
            }),
            address(this),
            false  // allow duplicates
        );

        emit DerivativeAssetCreated(childIpId, childTokenId, _parentIpIds, _licenseTermsIds);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        // Ensure the contract is receiving an NFT
        require(IERC721(msg.sender).ownerOf(tokenId) == address(this), "NFT not owned by this contract");
        emit NFTReceived(msg.sender, from, tokenId);

        return this.onERC721Received.selector;
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
