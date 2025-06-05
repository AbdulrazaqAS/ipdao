// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ILicensingModule } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@story-protocol/protocol-core/contracts/lib/PILFlavors.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ICoreMetadataViewModule } from "@story-protocol/protocol-core/contracts/interfaces/modules/metadata/ICoreMetadataViewModule.sol";
import { IIPAssetRegistry } from "@story-protocol/protocol-core/contracts/interfaces/registries/IIPAssetRegistry.sol";
import { ISPGNFT } from "@story-protocol/protocol-periphery/contracts/interfaces/ISPGNFT.sol";
import { IRegistrationWorkflows } from "@story-protocol/protocol-periphery/contracts/interfaces/workflows/IRegistrationWorkflows.sol";
import { WorkflowStructs } from "@story-protocol/protocol-periphery/contracts/lib/WorkflowStructs.sol";

contract IPAManager is Ownable, ERC721Holder {
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    ICoreMetadataViewModule public immutable CORE_METADATA_VIEW_MODULE;
    IRegistrationWorkflows public immutable REGISTRATION_WORKFLOWS;
    ISPGNFT public immutable SPG_NFT;

    address[] public assets;
    address public revenueToken;

    event AssetAdded(address assetId);
    event AssetTransferred(address assetId, address collection, address to, uint256 tokenId);
    event TermsAttached(address indexed assetId, uint256 licenseTermsId);
    event NFTReceived(address collection, address from, uint256 tokenId);
    event RevenueTokenUpdated(address newRevenueToken);
    event DerivativeAssetCreated(address indexed childIpId, address[] parentIpIds, uint256[] licenseTermsIds);

    constructor(
        address _initialOwner,
        address _ipAssetRegistry,
        address _licensingModule,
        address _pilTemplate,
        address _coreMetadataViewModule,
        address _registrationWorkflows,
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
        string memory _nftMetadataHash,
        uint256 _licenseTermsId
    ) external onlyOwner returns (address ipId, uint256 tokenId){
        (ipId, tokenId) = REGISTRATION_WORKFLOWS.mintAndRegisterIp(
            address(SPG_NFT),
            address(this),  // receiver
            WorkflowStructs.IPMetadata({
                ipMetadataURI: _ipMetadataURI,
                ipMetadataHash: _ipMetadataHash,
                nftMetadataURI: _nftMetadataURI,
                nftMetadataHash: _nftMetadataHash
            }),
            true  // ??
        );

        addAsset(ipId);
        attachLicenseTerms(ipId, _licenseTermsId);
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
    function registerDerivative(
        address[] calldata parentIpIds,
        uint256[] calldata licenseTermsIds,
        string memory metadataURI
    ) external onlyOwner returns (uint256 childTokenId, address childIpId) {
        childTokenId = SPG_NFT.safeMint(address(this), metadataURI);
        childIpId = IP_ASSET_REGISTRY.register(block.chainid, address(Token_Collection), childTokenId);

        LICENSING_MODULE.registerDerivative({
        childIpId: childIpId,
        parentIpIds: parentIpIds,
        licenseTermsIds: licenseTermsIds,
        licenseTemplate: address(PIL_TEMPLATE),
        royaltyContext: "", // empty for PIL
        maxMintingFee: 0,
        maxRts: 0,
        maxRevenueShare: 100
        });

        emit DerivativeAssetCreated(childIpId, parentIpIds, licenseTermsIds);
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
