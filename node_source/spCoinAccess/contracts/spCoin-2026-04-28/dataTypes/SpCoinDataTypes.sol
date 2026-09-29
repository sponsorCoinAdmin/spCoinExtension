// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
/// @title ERC20 Contract
// import "./KYC.sol";

contract SpCoinDataTypes {
    uint256 internal defaultTSPCoinSupply = 1000000000;
    string  internal defaultName          = "sponsorCoin";
    string  internal defaultSymbol        = "SPCT";
    uint256 internal defaultDecimals      = 18;
    uint256 internal decimalMultiplier    = 10**defaultDecimals;
    uint256 internal defaultTotalSupply   = defaultTSPCoinSupply * decimalMultiplier;

    address[] internal masterAccountList;
    address burnAddress = 0x0000000000000000000000000000000000000000;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // **Standard ERC20 contract Variables
    string  public name;
    string  public symbol;
    string  internal defaultVersion     = "_V001";
    string  public version;
    uint256 public decimals;
    uint256 internal initialTotalSupply = defaultTSPCoinSupply * (10 ** defaultDecimals);
    uint256 public totalSupply;
    uint    internal annualInflation = 10;
    uint256 internal lowerRecipientRate = 20;
    uint256 internal upperRecipientRate = 100;
    uint256 internal lowerAgentRate = 2;
    uint256 internal upperAgentRate = 10;
    uint    public creationTime = block.timestamp;
    uint256 public totalStakedSPCoins = 0; // Coins Owned but steaked to recipients
    uint256 public totalStakingRewards = 0; // Coins not owned but Recipiented
    uint256 public totalUnstakedSpCoins = 0;
    // totalUnstakedSpCoins = totalSupply - totalStakedSPCoins;

    // Keep track balances and allowances approved
    // Events - fire events on state changes etc
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TransactionAdded(
        uint256 indexed transactionId,
        address indexed sponsorKey,
        address indexed recipientKey,
        address agentKey,
        bytes32 rateTransactionSetKey,
        uint256 recipientRateKey,
        uint256 agentRateKey,
        uint256 stakingRewards
    );

    function totalInitialSupply() external view returns (uint256) {
        return initialTotalSupply;
    }

    // Recipiented Coins
    uint256 stakedSPCoins;

    mapping(address => AccountStruct) accountMap;
    mapping(address => mapping(bytes32 => bool)) internal accountHasRecipientRateTransactionSetKey;
    mapping(address => mapping(bytes32 => bool)) internal accountHasAgentRateTransactionSetKey;

    uint UNDEFINED = 0;
    uint SPONSOR = 2;
    uint RECIPIENT = 3;
    uint AGENT = 4;
    bytes32 internal constant RECIPIENT_RATE_TRANSACTION_SET_DOMAIN = keccak256("RECIPIENT_RATE");
    bytes32 internal constant AGENT_RATE_TRANSACTION_SET_DOMAIN = keccak256("AGENT_RATE");

    struct AccountStruct {
        address accountKey;
        uint256 balanceOf;
        uint256 creationTime;
        uint256 stakedSPCoins; // Coins Owned but steaked to recipients
        uint256 accountTypes;  // Coins Owned but steaked to recipients
        bool inserted;
        address[] recipientKeys;           // If Sponsor List of Recipient Accounts
        address[] sponsorKeys;             // If Recipient ? List of Sponsor Accounts
        address[] agentKeys;               // If Recipient? List of Agent Accounts
        address[] parentRecipientKeys; // If Agent? List of Agents Sponsor Accounts
        bytes32[] recipientRateTransactionSetKeys;
        bytes32[] agentRateTransactionSetKeys;
        mapping(address => RecipientStruct) recipientMap;
        // STAKING REWARDS MAPPINGS
        uint256 stakingRewards; // Coins not owned but Recipiented
        mapping(string  => RewardTypeStruct) rewardsMap;
    }

    /// STRUCTURE DESIGN SECTION SECTION ////////////////////////////////////////////////////////////////////
    // Each Account has a map of Recipient and an array of recipientRate structures
    struct RecipientStruct {
        address sponsorKey;
        address recipientKey;
        uint256 creationTime;
        uint256 stakedSPCoins; // Coins not owned but Recipiented
        uint256[] recipientRateKeys;
        mapping(uint256 => RecipientRateStruct) recipientRateMap;
        bool inserted;
    }
 
    struct RecipientRateStruct {
        uint256 recipientRate;
        uint256 creationTime;
        uint256 lastUpdateTime;
        uint256 stakedSPCoins; // Coins not owned
        RecipientTransactionSetStruct recipientTransactionSet;
        uint256[] recipientTransactionIdKeys;
        address[] agentKeys;
        mapping(address => AgentStruct) agentMap;
        StakingTransactionStruct[] transactionList;
        bool inserted;
    }

    // Each Recipient has a map of Agent and an array of agentRate structures
    struct AgentStruct {
        address sponsorKey;
        address recipientKey;
        address agentKey;
        uint256 creationTime;
        uint256 stakedSPCoins; // Coins not owned but Recipiented
        uint256[] agentRateKeys;
        mapping(uint256 => AgentRateStruct) agentRateMap;
        bool inserted;
    }
 
    struct AgentRateStruct {
        uint256 agentRate;
        uint256 creationTime;
        uint256 lastUpdateTime;
        uint256 stakedSPCoins; // Coins not owned but Recipiented
        AgentTransactionSetStruct agentTransactionSet;
        uint256[] agentTransactionIdKeys;
        StakingTransactionStruct[] transactionList;
        bool inserted;
    }

/////////////// END TWO PREVIOUSLY DELETED RECORDS
/////////////// PREVIOUS RECORDS

    struct StakingTransactionStruct {
        uint256 insertionTime;
        uint256 stakingRewards;
    }

    // New transaction-set storage scaffolding.
    // This is intentionally additive for now so the existing transactionList-based
    // behavior keeps working while we prepare the contract for the new design.
    uint256 internal nextTransactionId = 1;

    struct RecipientTransactionSetStruct {
        uint256 lastUpdateTransactionDate;
        uint256 totalStaked;
        uint256 transactionCount;
    }

    struct AgentTransactionSetStruct {
        uint256 lastUpdateTransactionDate;
        uint256 totalStaked;
        uint256 transactionCount;
    }

    struct RateTransactionSetStruct {
        bytes32 setKey;
        uint256 rate;
        uint256 lastUpdateTransactionDate;
        uint256 totalStaked;
        uint256 transactionCount;
        uint256[] transactionIds;
        bool inserted;
    }

    struct TransactionRecordStruct {
        uint256 transactionId;
        uint256 insertionTime;
        uint256 stakingRewards;
        address sponsorKey;
        address recipientKey;
        uint256 recipientRateKey;
        address agentKey;
        uint256 agentRateKey;
        bool inserted;
    }

    mapping(uint256 => TransactionRecordStruct) internal masterTransactionIdMap;
    mapping(bytes32 => RateTransactionSetStruct) internal rateTransactionSetMap;

    /// STAKING REWARDS SECTION ////////////////////////////////////////////////////////////////////

    struct RewardTypeStruct {
        uint256 stakingRewards;
        mapping(address => RewardAccountStruct) rewardsMap;   // contains Sponsrr, Recipient Keys
    }

    struct RewardAccountStruct {
        uint256 stakingRewards;
        uint256[] rewardRateList;
        mapping(uint256 => RewardRateStruct) rewardRateMap;
    }

    struct RewardRateStruct {
        uint256 rate;
        uint256 effectiveRate;
        uint256 stakingRewards;
        RewardsTransactionStruct[] rewardTransactionList;
    }

    struct RewardsTransactionStruct {
        uint256 updateTime;
        uint256 stakingRewards;
    }

   /// STAKING REWARDS SECTION ////////////////////////////////////////////////////////////////////

    function reserveTransactionId() internal returns (uint256 transactionId) {
        transactionId = nextTransactionId;
        nextTransactionId += 1;
    }
        
    function getAccountTypeString(uint _accountType) internal view returns (string memory strAccountType) {
        if (_accountType == SPONSOR)
            return "SPONSOR";
        else if (_accountType == RECIPIENT)
            return "RECIPIENT";
        else if (_accountType == AGENT)
            return "AGENT";
        return "UNKNOWN ACCOUNT TYPE"; 
    }

    function getRewardSourceType(uint _accountType) internal view returns (uint rewardSourceType) {
        if (_accountType == SPONSOR)
            return RECIPIENT;
        else
        if (_accountType == RECIPIENT)
            return SPONSOR;
        else
        if (_accountType == AGENT)
            return RECIPIENT;
        return 99; 
    }

    function ifAccountOfType(uint _accountType, uint _accountTypes)
    internal pure returns (bool) {
        return (_accountType & _accountTypes) != 0; 
    }

    // function getRewardSourceTypeString(uint _accountType) internal view returns (string memory rewardSourceTypeString) {
    //     return getAccountTypeString(getRewardSourceType(_accountType)); 
    // }
}

    // Keep track of account insertions
    // Record relationship rules as Follows:
    // 1. Every Account is the root of a mapping tree in the diagram below:
    // 2. Every Account can be a Sponsor, And/or Recipient, and/or Agent
    //    - A Sponsor is the, primary steak Holder of the "Recipient Coin" token.
    //        The primary purpose of holding "Recipient Coins" is to share "Proof of Stake"
    //        percentage earnings with the selected sopnsor(s).
    //    - A Recipient is considered to be a child of one or more Sponsors with the purposes
    //      of sharing "Proof of Stake" Sponsor rewards.
    //    - An Agent finds Sponsor(s) for any specific recipient and receives a share of the 
    //      "Proof of Stake" reward allocation for this effort. 
    // 3. Every Account can be a Patrion, Recipient and/or agent to one or more mutually 
    //    exclusive account(s).
    // 4. Every Recipient can have a number of Sponsor(s), Recipient(s) and/or Agent(s)
    // 5. Every Recipient has an array of recipientRate structures
    // 6. Every Agent has an array of agentRate structures
    // 7. Every Rate Structure has an array of Transactions
    // 8. Each Sponsor/Recipient/Agent "MUST BE" mutually exclusive
    //    - This implies no two accounts can be the same for each account structure
    //
    //  The following is a brief diagram of the contractural structure.
    //
    //              |                          |-/Agent(s)/Rate(s)/Transaction(s)
    // Account(s) =>| Sponsor(s)/Recipient(s)/ =>|
    //              |                          |-/Rate(s)/Transaction(s)

    // **Additional Recipient Coin Variables
