// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable-4.5/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-4.5/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-4.5/governance/extensions/GovernorSettingsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-4.5/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-4.5/governance/extensions/GovernorPreventLateQuorumUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-4.5/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable-4.5/proxy/utils/UUPSUpgradeable.sol";
import "./GovVotes.sol";
import "./GovVotesQuorumFraction.sol";

contract Gov is Initializable, GovernorUpgradeable, GovernorSettingsUpgradeable, GovernorCountingSimpleUpgradeable, GovVotes, GovVotesQuorumFraction, GovernorTimelockControlUpgradeable, GovernorPreventLateQuorumUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 public constant POWER_CHANGER_ROLE = keccak256("POWER_CHANGER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    function initialize(
        ERC20VotesUpgradeable _token,
        TimelockControllerUpgradeable _timelock,
        uint256 initVotingDelay,
        uint256 initVotingPeriod,
        uint256 initProposalThreshold,
        uint256 initQuorumNumberator,
        uint64 initLateQuorumBlocks
    ) public initializer {
        __Governor_init("Gov");
        __GovernorSettings_init(initVotingDelay, initVotingPeriod, initProposalThreshold);
        __GovernorCountingSimple_init();
        __GovVotes_init(_token);
        __GovVotesQuorumFraction_init(initQuorumNumberator);
        __GovernorTimelockControl_init(_timelock);
        __GovernorPreventLateQuorum_init(initLateQuorumBlocks);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function quorum(uint256 blockNumber)
    public
    view
    override(IGovernorUpgradeable, GovVotesQuorumFraction)
    returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function votingDelay()
    public
    view
    override(IGovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
    public
    view
    override(IGovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
    {
        return super.votingPeriod();
    }

    function getVotes(address account, uint256 blockNumber)
    public
    view
    override(IGovernorUpgradeable, GovVotes)
    returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
    public
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
    public
    override(GovernorUpgradeable, IGovernorUpgradeable)
    returns (uint256)
    {
        return super.propose(targets, values, calldatas, description);
    }

    function proposalThreshold()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
    {
        return super.proposalThreshold();
    }

    function proposalDeadline(uint256 proposalId)
    public
    view
    virtual
    override(GovernorUpgradeable, IGovernorUpgradeable, GovernorPreventLateQuorumUpgradeable)
    returns (uint256) {
        return super.proposalDeadline(proposalId);
    }

    function addFT(ERC20VotesUpgradeable token, uint256 multiplier) public onlyRole(POWER_CHANGER_ROLE) {
        super._addFT(token, multiplier);
    }

    function setFTMultiplier(uint256 id, uint256 multiplier) public onlyRole(POWER_CHANGER_ROLE)  {
        super._setFTMultiplier(id, multiplier);
    }

    function addNFT(ERC721VotesUpgradeable token, uint256 multiplier) public onlyRole(POWER_CHANGER_ROLE) {
        super._addNFT(token, multiplier);
    }

    function setNFTMultiplier(uint256 id, uint256 multiplier) public onlyRole(POWER_CHANGER_ROLE)  {
        super._setNFTMultiplier(id, multiplier);
    }

    function cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
    public
    onlyRole(MODERATOR_ROLE)
    returns (uint256)
    {
        return _cancel(targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
    internal
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason
    ) internal virtual override(GovernorUpgradeable, GovernorPreventLateQuorumUpgradeable) returns (uint256) {
        return super._castVote(proposalId, account, support, reason);
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
    internal
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executor()
    internal
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable, AccessControlUpgradeable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {
        // solhint-disable-previous-line no-empty-blocks
    }
}
