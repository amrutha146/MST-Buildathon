// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedicalConsent
 * @notice Patient-controlled access governance and tamper-evident audit layer on MST Blockchain.
 * @dev Stores only cryptographic hashes, permissions, and audit events. Zero PII stored on-chain.
 */
contract MedicalConsent {
    address public owner;

    enum RequestStatus { Pending, Granted, Denied, Revoked }

    struct MedicalRecord {
        bytes32 fileHash;          // SHA-256 hash of the encrypted file
        string storagePointer;     // Off-chain URI / storage reference (e.g. encrypted-bucket-key or IPFS CID)
        address patient;           // Owner of the record
        uint256 registeredAt;      // Block timestamp of registration
        bool exists;
    }

    struct AccessRequest {
        bytes32 recordId;
        address provider;
        string purpose;            // Reason for requesting access (e.g. "Clinical Cardiology Review")
        uint256 durationSeconds;   // Requested validity period
        uint256 requestedAt;
        RequestStatus status;
    }

    struct AccessGrant {
        bool isGranted;
        uint256 expiryTimestamp;   // Enforced via block.timestamp < expiry
    }

    // recordId => MedicalRecord
    mapping(bytes32 => MedicalRecord) public records;

    // provider address => isRegistered
    mapping(address => bool) public registeredProviders;

    // patient address => delegate address
    mapping(address => address) public delegates;

    // requestId => AccessRequest
    uint256 public requestCounter;
    mapping(uint256 => AccessRequest) public accessRequests;

    // recordId => provider address => AccessGrant
    mapping(bytes32 => mapping(address => AccessGrant)) public recordGrants;

    // --- Events (Audit Trail on MST Blockchain) ---
    event ProviderRegistered(address indexed provider);
    event ProviderDeRegistered(address indexed provider);
    event DelegateSet(address indexed patient, address indexed delegate);
    event RecordRegistered(bytes32 indexed recordId, address indexed patient, bytes32 fileHash, string storagePointer, uint256 timestamp);
    event AccessRequested(uint256 indexed requestId, bytes32 indexed recordId, address indexed provider, string purpose, uint256 durationSeconds);
    event AccessGranted(uint256 indexed requestId, bytes32 indexed recordId, address indexed provider, uint256 expiryTimestamp);
    event AccessDenied(uint256 indexed requestId, bytes32 indexed recordId, address indexed provider);
    event AccessRevoked(bytes32 indexed recordId, address indexed provider, uint256 timestamp);
    event AccessLogged(bytes32 indexed recordId, address indexed provider, uint256 timestamp);
    event EmergencyAccessTriggered(bytes32 indexed recordId, address indexed provider, string reason, uint256 expiryTimestamp);

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "MedicalConsent: caller is not the owner");
        _;
    }

    modifier onlyRegisteredProvider() {
        require(registeredProviders[msg.sender], "MedicalConsent: caller is not a registered provider");
        _;
    }

    modifier onlyRecordController(bytes32 _recordId) {
        require(records[_recordId].exists, "MedicalConsent: record does not exist");
        address patient = records[_recordId].patient;
        require(
            msg.sender == patient || msg.sender == delegates[patient],
            "MedicalConsent: caller is neither patient nor authorized delegate"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        // The deployer is automatically a registered provider for testing ease
        registeredProviders[msg.sender] = true;
        emit ProviderRegistered(msg.sender);
    }

    // --- Provider Administration ---

    function registerProvider(address _provider) external onlyOwner {
        require(_provider != address(0), "MedicalConsent: invalid address");
        require(!registeredProviders[_provider], "MedicalConsent: provider already registered");
        registeredProviders[_provider] = true;
        emit ProviderRegistered(_provider);
    }

    function deregisterProvider(address _provider) external onlyOwner {
        require(registeredProviders[_provider], "MedicalConsent: provider not registered");
        registeredProviders[_provider] = false;
        emit ProviderDeRegistered(_provider);
    }

    // --- Patient Delegation ---

    function setDelegate(address _delegate) external {
        delegates[msg.sender] = _delegate;
        emit DelegateSet(msg.sender, _delegate);
    }

    // --- Record Registration ---

    function registerRecord(
        bytes32 _recordId,
        bytes32 _fileHash,
        string calldata _storagePointer
    ) external {
        require(_recordId != bytes32(0), "MedicalConsent: invalid recordId");
        require(_fileHash != bytes32(0), "MedicalConsent: invalid fileHash");
        require(!records[_recordId].exists, "MedicalConsent: record already registered");

        records[_recordId] = MedicalRecord({
            fileHash: _fileHash,
            storagePointer: _storagePointer,
            patient: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        emit RecordRegistered(_recordId, msg.sender, _fileHash, _storagePointer, block.timestamp);
    }

    // --- Access Governance Workflow ---

    function requestAccess(
        bytes32 _recordId,
        string calldata _purpose,
        uint256 _durationSeconds
    ) external onlyRegisteredProvider returns (uint256) {
        require(records[_recordId].exists, "MedicalConsent: record does not exist");
        require(_durationSeconds > 0 && _durationSeconds <= 30 days, "MedicalConsent: duration out of range (1s - 30d)");
        require(bytes(_purpose).length > 0, "MedicalConsent: purpose cannot be empty");

        requestCounter++;
        uint256 requestId = requestCounter;

        accessRequests[requestId] = AccessRequest({
            recordId: _recordId,
            provider: msg.sender,
            purpose: _purpose,
            durationSeconds: _durationSeconds,
            requestedAt: block.timestamp,
            status: RequestStatus.Pending
        });

        emit AccessRequested(requestId, _recordId, msg.sender, _purpose, _durationSeconds);
        return requestId;
    }

    function grantAccess(uint256 _requestId) external {
        AccessRequest storage req = accessRequests[_requestId];
        require(req.recordId != bytes32(0), "MedicalConsent: request does not exist");
        require(req.status == RequestStatus.Pending, "MedicalConsent: request not pending");

        address patient = records[req.recordId].patient;
        require(
            msg.sender == patient || msg.sender == delegates[patient],
            "MedicalConsent: caller not authorized to grant access"
        );

        uint256 expiry = block.timestamp + req.durationSeconds;
        recordGrants[req.recordId][req.provider] = AccessGrant({
            isGranted: true,
            expiryTimestamp: expiry
        });

        req.status = RequestStatus.Granted;

        emit AccessGranted(_requestId, req.recordId, req.provider, expiry);
    }

    function denyAccess(uint256 _requestId) external {
        AccessRequest storage req = accessRequests[_requestId];
        require(req.recordId != bytes32(0), "MedicalConsent: request does not exist");
        require(req.status == RequestStatus.Pending, "MedicalConsent: request not pending");

        address patient = records[req.recordId].patient;
        require(
            msg.sender == patient || msg.sender == delegates[patient],
            "MedicalConsent: caller not authorized to deny access"
        );

        req.status = RequestStatus.Denied;
        emit AccessDenied(_requestId, req.recordId, req.provider);
    }

    function revokeAccess(bytes32 _recordId, address _provider) external onlyRecordController(_recordId) {
        require(recordGrants[_recordId][_provider].isGranted, "MedicalConsent: no active grant for provider");
        
        recordGrants[_recordId][_provider].isGranted = false;
        recordGrants[_recordId][_provider].expiryTimestamp = 0;

        emit AccessRevoked(_recordId, _provider, block.timestamp);
    }

    // --- Emergency Access (Break-Glass Protocol) ---

    function emergencyAccess(
        bytes32 _recordId,
        string calldata _reason
    ) external onlyRegisteredProvider {
        require(records[_recordId].exists, "MedicalConsent: record does not exist");
        require(bytes(_reason).length > 0, "MedicalConsent: emergency reason required");

        // Emergency grants have a hardcoded 4-hour max window and distinct audit event
        uint256 emergencyDuration = 4 hours;
        uint256 expiry = block.timestamp + emergencyDuration;

        recordGrants[_recordId][msg.sender] = AccessGrant({
            isGranted: true,
            expiryTimestamp: expiry
        });

        emit EmergencyAccessTriggered(_recordId, msg.sender, _reason, expiry);
    }

    // --- Tamper-Evident Access Logging ---

    function logAccess(bytes32 _recordId) external {
        require(records[_recordId].exists, "MedicalConsent: record does not exist");
        require(hasAccess(_recordId, msg.sender), "MedicalConsent: caller does not have active access");

        emit AccessLogged(_recordId, msg.sender, block.timestamp);
    }

    // --- View Functions ---

    function hasAccess(bytes32 _recordId, address _provider) public view returns (bool) {
        if (!records[_recordId].exists) return false;
        // The patient always has access to their own record
        if (_provider == records[_recordId].patient) return true;
        // An authorized delegate also has access
        if (_provider == delegates[records[_recordId].patient]) return true;

        AccessGrant memory grant = recordGrants[_recordId][_provider];
        return (grant.isGranted && block.timestamp < grant.expiryTimestamp);
    }

    function verifyIntegrity(bytes32 _recordId, bytes32 _fileHash) external view returns (bool) {
        require(records[_recordId].exists, "MedicalConsent: record does not exist");
        return (records[_recordId].fileHash == _fileHash);
    }

    function getRecord(bytes32 _recordId) external view returns (
        bytes32 fileHash,
        string memory storagePointer,
        address patient,
        uint256 registeredAt,
        bool exists
    ) {
        MedicalRecord memory rec = records[_recordId];
        return (rec.fileHash, rec.storagePointer, rec.patient, rec.registeredAt, rec.exists);
    }
}
