// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract QuizManager is AccessControl{
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    struct Quiz {
        uint8 maxTrials;
        uint8 minScore;
        bool exists;
        uint256 winners;
        uint256 maxWinners;
        uint256 createdAt;
        uint256 deadline;
        uint256 prizeAmount;
        address prizetoken;
        string metadataURI;
    }

    uint256 public totalQuizzes;
    address public immutable ipaManager;
    
    mapping(uint256 => Quiz) public quizzes;
    mapping(address user => mapping(uint256 quizId => uint8 trials)) public userTrials;
    mapping(address user => mapping(uint256 quizId => bool)) public canClaim;
    mapping(address user => mapping(uint256 quizId => bool)) public hasClaimed;

    event QuizCreated(uint256 indexed quizId, address creator, uint8 maxTrials, uint8 minScore, uint256 deadline, uint256 prizeAmount, string metadataURI);
    event PrizeClaimed(uint256 indexed quizId, address indexed user);
    event QuizWon(uint256 indexed quizId, address indexed user);

    constructor(address _admin, address _creator, address _updater, address _ipaManager) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(CREATOR_ROLE, _creator);
        _grantRole(UPDATER_ROLE, _updater);

        ipaManager = _ipaManager;
    }

    function createQuiz(
        uint8 maxTrials,
        uint8 minScore,
        uint256 deadline,
        uint256 prizeAmount,
        uint256 maxWinners,
        address prizetoken,
        string calldata metadataURI
    ) external onlyRole(CREATOR_ROLE) returns (uint256) {
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(maxTrials > 0, "Max trials must be greater than 0");
        require(minScore > 0, "Min score must be greater than 0");

        uint256 quizId = totalQuizzes;
        quizzes[quizId] = Quiz({
            maxTrials: maxTrials,
            minScore: minScore,
            maxWinners: maxWinners,
            prizetoken: prizetoken,
            createdAt: block.timestamp,
            winners: 0,
            deadline: deadline,
            metadataURI: metadataURI,
            prizeAmount: prizeAmount,
            exists: true
        });
        
        totalQuizzes++;

        emit QuizCreated(quizId, msg.sender, maxTrials, minScore, deadline, prizeAmount, metadataURI);
        return quizId;
    }

    function setHasTried(address user, uint8 score, uint256 quizId) external onlyRole(UPDATER_ROLE) {
        Quiz storage quiz = quizzes[quizId];
        uint8 trials = userTrials[user][quizId];

        require(quiz.exists, "Quiz not found");
        require(block.timestamp <= quiz.deadline, "Quiz expired");
        require(quiz.winners < quiz.maxWinners, "Max winners reached");
        require(trials < quiz.maxTrials, "Max trials reached");
        require(!hasClaimed[user][quizId], "Already claimed");
        userTrials[user][quizId]++;

        if (score >= quiz.minScore) {
            canClaim[user][quizId] = true;
            quiz.winners++;
            emit QuizWon(quizId, user);
        }
    }

    function claimPrize(uint256 quizId) external {
        Quiz memory quiz = quizzes[quizId];
        require(quiz.exists, "Quiz not found");
        require(block.timestamp <= quiz.deadline, "Quiz expired");
        require(canClaim[msg.sender][quizId], "User can't claim");
        require(!hasClaimed[msg.sender][quizId], "Already claimed");

        hasClaimed[msg.sender][quizId] = true;
        IERC20(quiz.prizetoken).transferFrom(ipaManager, msg.sender, quiz.prizeAmount);

        emit PrizeClaimed(quizId, msg.sender);
    }

    function getQuizMetadataURI(uint256 quizId) external view returns (string memory) {
        require(quizzes[quizId].exists, "Quiz not found");
        return quizzes[quizId].metadataURI;
    }
}
