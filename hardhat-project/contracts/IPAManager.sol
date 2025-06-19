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
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IIPAccount } from "@storyprotocol/core/interfaces/IIPAccount.sol";
import { IRoyaltyModule } from "@storyprotocol/core/interfaces/modules/royalty/IRoyaltyModule.sol";

contract IPAManager is Ownable, ERC721Holder {
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    ICoreMetadataViewModule public immutable CORE_METADATA_VIEW_MODULE;
    IRegistrationWorkflows public immutable REGISTRATION_WORKFLOWS;
    IDerivativeWorkflows public immutable DERIVATIVE_WORKFLOWS;
    IRoyaltyModule public immutable ROYALTY_MODULE;
    ISPGNFT public immutable SPG_NFT;

    address[] public assets;
    uint256 public daoRoyaltyTokens; // Royalty tokens to be given to DAO for each ipa

    event AssetAdded(address indexed assetId);
    event AssetTransferred(address indexed assetId, address collection, address to, uint256 tokenId);
    event TermsAttached(address indexed assetId, uint256 licenseTermsId);
    event NFTReceived(address indexed collection, address from, uint256 tokenId);
    event DerivativeAssetCreated(
        address indexed childIpId,
        uint256 childTokenId,
        address[] parentIpIds,
        uint256[] licenseTermsIds
    );
    event LicenseTokensMinted(address indexed licensorIpId, uint256 licenseTermsId, uint256 amount, address receiver);
    event RoyaltyTokensTransferred(address indexed ipId, address[] recipients, uint256[] amounts);
    event Execute(address indexed target, uint256 value, bytes data);
    event DaoRoyaltyTokensChanged(uint256 _amount);

    constructor(
        uint256 _daoRoyaltyTokens,
        address _initialOwner,
        address _ipAssetRegistry,
        address _licensingModule,
        address _pilTemplate,
        address _coreMetadataViewModule,
        address _registrationWorkflows,
        address _derivativeWorkflows,
        address _royaltyModule,
        string memory _spgName,
        string memory _spgSymbol
    ) Ownable(_initialOwner) {
        IP_ASSET_REGISTRY = IIPAssetRegistry(_ipAssetRegistry);
        LICENSING_MODULE = ILicensingModule(_licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(_pilTemplate);
        CORE_METADATA_VIEW_MODULE = ICoreMetadataViewModule(_coreMetadataViewModule);
        REGISTRATION_WORKFLOWS = IRegistrationWorkflows(_registrationWorkflows);
        DERIVATIVE_WORKFLOWS = IDerivativeWorkflows(_derivativeWorkflows);
        ROYALTY_MODULE = IRoyaltyModule(_royaltyModule);

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

        daoRoyaltyTokens = _daoRoyaltyTokens;
        emit DaoRoyaltyTokensChanged(_daoRoyaltyTokens);
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

    // Mint an NFT and register it in the same call via the Story Protocol Gateway.
    function createAsset(
        string memory _ipMetadataURI,
        string memory _ipMetadataHash,
        string memory _nftMetadataURI,
        string memory _nftMetadataHash
    ) external onlyOwner returns (address ipId, uint256 tokenId) {
        (ipId, tokenId) = REGISTRATION_WORKFLOWS.mintAndRegisterIp(
            address(SPG_NFT),
            address(this), // receiver
            WorkflowStructs.IPMetadata({
                ipMetadataURI: _ipMetadataURI,
                ipMetadataHash: bytes32(bytes(_ipMetadataHash)),
                nftMetadataURI: _nftMetadataURI,
                nftMetadataHash: bytes32(bytes(_nftMetadataHash))
            }),
            true // allow duplicates with same metadata
        );

        addAsset(ipId);
    }

    function createAssetFromNFT(
        address tokenCollection,
        uint256 tokenId
    ) external onlyOwner returns (address ipId) {
        require(IERC721(tokenCollection).ownerOf(tokenId) == address(this), "Contract must own the NFT");
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(tokenCollection), tokenId);
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

    function transferRoyaltyTokens(
        address ipId,
        address[] memory recipients,
        uint256[] memory amounts
    ) public onlyOwner {
        require(hasAsset(ipId), "Asset does not exist");
        require(recipients.length == amounts.length, "Recipients and amounts length mismatch");
        require(recipients.length > 0, "No recipients provided");

        address royaltyVaultAddress = ROYALTY_MODULE.ipRoyaltyVaults(ipId);
        bytes memory tranferData;
        for (uint256 i = 0; i < recipients.length; i++) {
            // Encode the transfer call data
            tranferData = abi.encodeWithSelector(IERC20.transfer.selector, recipients[i], amounts[i]);
            IIPAccount(payable(ipId)).execute(
                royaltyVaultAddress,
                0, // value: 0 ETH
                tranferData
            );
        }

        emit RoyaltyTokensTransferred(ipId, recipients, amounts);
    }

    // For owner to execute arbitrary calls.
    // Like giving allowance to QuizManager, transferring tokens, etc.
    function execute(address target, uint256 value, bytes calldata data) external onlyOwner {
        (bool success, bytes memory returnData) = target.call{ value: value }(data);
        require(success, "Execution failed");

        emit Execute(target, value, data);
    }

    function setDAORoyaltyToken(uint256 _amount) external onlyOwner {
        daoRoyaltyTokens = _amount;
        emit DaoRoyaltyTokensChanged(_amount);
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

    function getAssetsCount() external view returns (uint256) {
        return assets.length;
    }

    function getAssetVault(address assetId) external view returns (address) {
        return ROYALTY_MODULE.ipRoyaltyVaults(assetId);
    }
}
