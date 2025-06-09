// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface MintableERC20 is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract QuizManager is AccessControl{
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    MintableERC20 public immutable TOKEN;

    struct Quiz {
        uint8 maxTrials;
        uint8 minScore;
        bool exists;
        uint256 winners;
        uint256 deadline;
        uint256 prizeAmount;
        string metadataURI;
    }

    uint256 public totalQuizzes;
    mapping(uint256 => Quiz) public quizzes;
    mapping(address user => mapping(uint256 quizId => uint8 trials)) public userTrials;
    mapping(address user => mapping(uint256 quizId => bool)) public canClaim;
    mapping(address user => mapping(uint256 quizId => bool)) public hasClaimed;

    event QuizCreated(uint256 indexed quizId, address creator, uint8 maxTrials, uint8 minScore, uint256 deadline, uint256 prizeAmount, string metadataURI);
    event PrizeClaimed(uint256 indexed quizId, address indexed user);
    event QuizWon(uint256 indexed quizId, address indexed user);

    constructor(address admin, address token) {
        TOKEN = MintableERC20(token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createQuiz(
        uint8 maxTrials,
        uint8 minScore,
        uint256 deadline,
        uint256 prizeAmount,
        string calldata metadataURI
    ) external onlyRole(CREATOR_ROLE) returns (uint256) {
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(maxTrials > 0, "Max trials must be greater than 0");
        require(minScore > 0, "Min score must be greater than 0");

        uint256 quizId = totalQuizzes;
        quizzes[quizId] = Quiz({
            maxTrials: maxTrials,
            minScore: minScore,
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
        TOKEN.mint(msg.sender, quiz.prizeAmount);

        emit PrizeClaimed(quizId, msg.sender);
    }
}
