const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MedicalConsent Protocol", function () {
  let medicalConsent;
  let owner, provider, patient, delegate, attacker;

  const mockRecordId = ethers.keccak256(ethers.toUtf8Bytes("PATIENT-RECORD-001"));
  const mockFileHash = ethers.sha256(ethers.toUtf8Bytes("EncryptedBloodReport2026Content"));
  const mockStoragePointer = "enc-bucket://records/rec-001.enc";

  beforeEach(async function () {
    [owner, provider, patient, delegate, attacker] = await ethers.getSigners();

    const MedicalConsentFactory = await ethers.getContractFactory("MedicalConsent");
    medicalConsent = await MedicalConsentFactory.deploy();
    await medicalConsent.waitForDeployment();

    // Register provider
    await medicalConsent.connect(owner).registerProvider(provider.address);
  });

  describe("Provider Registration & Roles", function () {
    it("should allow owner to register a provider", async function () {
      expect(await medicalConsent.registeredProviders(provider.address)).to.be.true;
    });

    it("should prevent non-owner from registering providers", async function () {
      await expect(
        medicalConsent.connect(attacker).registerProvider(attacker.address)
      ).to.be.revertedWith("MedicalConsent: caller is not the owner");
    });
  });

  describe("Record Registration", function () {
    it("should allow a patient to register their encrypted record hash", async function () {
      const tx = await medicalConsent.connect(patient).registerRecord(
        mockRecordId,
        mockFileHash,
        mockStoragePointer
      );

      await expect(tx)
        .to.emit(medicalConsent, "RecordRegistered")
        .withArgs(mockRecordId, patient.address, mockFileHash, mockStoragePointer, (val) => val > 0);

      const record = await medicalConsent.getRecord(mockRecordId);
      expect(record.exists).to.be.true;
      expect(record.patient).to.equal(patient.address);
      expect(record.fileHash).to.equal(mockFileHash);
      expect(record.storagePointer).to.equal(mockStoragePointer);
    });

    it("should reject registering duplicate recordIds", async function () {
      await medicalConsent.connect(patient).registerRecord(mockRecordId, mockFileHash, mockStoragePointer);
      await expect(
        medicalConsent.connect(patient).registerRecord(mockRecordId, mockFileHash, mockStoragePointer)
      ).to.be.revertedWith("MedicalConsent: record already registered");
    });

    it("should correctly verify record integrity", async function () {
      await medicalConsent.connect(patient).registerRecord(mockRecordId, mockFileHash, mockStoragePointer);
      expect(await medicalConsent.verifyIntegrity(mockRecordId, mockFileHash)).to.be.true;
      const fakeHash = ethers.sha256(ethers.toUtf8Bytes("TamperedData"));
      expect(await medicalConsent.verifyIntegrity(mockRecordId, fakeHash)).to.be.false;
    });
  });

  describe("Access Request & Grant Lifecycle", function () {
    beforeEach(async function () {
      await medicalConsent.connect(patient).registerRecord(mockRecordId, mockFileHash, mockStoragePointer);
    });

    it("should allow a registered provider to request access", async function () {
      const duration = 3600; // 1 hour
      const tx = await medicalConsent.connect(provider).requestAccess(
        mockRecordId,
        "Cardiology Clinical Review",
        duration
      );

      await expect(tx)
        .to.emit(medicalConsent, "AccessRequested")
        .withArgs(1, mockRecordId, provider.address, "Cardiology Clinical Review", duration);
    });

    it("should reject access requests from unregistered providers", async function () {
      await expect(
        medicalConsent.connect(attacker).requestAccess(mockRecordId, "Malicious snooping", 3600)
      ).to.be.revertedWith("MedicalConsent: caller is not a registered provider");
    });

    it("should allow the patient to grant access and verify active access", async function () {
      const duration = 3600;
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Cardiology Review", duration);

      const tx = await medicalConsent.connect(patient).grantAccess(1);
      await expect(tx).to.emit(medicalConsent, "AccessGranted");

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.true;
    });

    it("should reject grant from an unauthorized caller", async function () {
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Cardiology Review", 3600);

      await expect(
        medicalConsent.connect(attacker).grantAccess(1)
      ).to.be.revertedWith("MedicalConsent: caller not authorized to grant access");
    });

    it("should allow the patient to deny access", async function () {
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Cardiology Review", 3600);

      const tx = await medicalConsent.connect(patient).denyAccess(1);
      await expect(tx).to.emit(medicalConsent, "AccessDenied").withArgs(1, mockRecordId, provider.address);

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.false;
    });

    it("should correctly expire access when timestamp passes duration", async function () {
      const duration = 3600; // 1 hour
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Short consult", duration);
      await medicalConsent.connect(patient).grantAccess(1);

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.true;

      // Fast forward time by 3601 seconds
      await time.increase(3601);

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.false;
    });

    it("should allow the patient to revoke access before expiry", async function () {
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Consultation", 86400);
      await medicalConsent.connect(patient).grantAccess(1);

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.true;

      const tx = await medicalConsent.connect(patient).revokeAccess(mockRecordId, provider.address);
      await expect(tx).to.emit(medicalConsent, "AccessRevoked");

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.false;
    });
  });

  describe("Delegation & Emergency Access", function () {
    beforeEach(async function () {
      await medicalConsent.connect(patient).registerRecord(mockRecordId, mockFileHash, mockStoragePointer);
    });

    it("should allow authorized delegate to grant access", async function () {
      // Patient assigns delegate
      await medicalConsent.connect(patient).setDelegate(delegate.address);
      expect(await medicalConsent.delegates(patient.address)).to.equal(delegate.address);

      // Provider requests
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Emergency referral", 3600);

      // Delegate grants on behalf of patient
      const tx = await medicalConsent.connect(delegate).grantAccess(1);
      await expect(tx).to.emit(medicalConsent, "AccessGranted");

      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.true;
    });

    it("should allow registered provider to trigger break-glass emergency access", async function () {
      const tx = await medicalConsent.connect(provider).emergencyAccess(
        mockRecordId,
        "Patient unconscious in ER"
      );

      await expect(tx).to.emit(medicalConsent, "EmergencyAccessTriggered");
      expect(await medicalConsent.hasAccess(mockRecordId, provider.address)).to.be.true;
    });
  });

  describe("Tamper-Evident Access Audit Logging", function () {
    beforeEach(async function () {
      await medicalConsent.connect(patient).registerRecord(mockRecordId, mockFileHash, mockStoragePointer);
      await medicalConsent.connect(provider).requestAccess(mockRecordId, "Checkup", 3600);
      await medicalConsent.connect(patient).grantAccess(1);
    });

    it("should emit AccessLogged event when authorized provider accesses record", async function () {
      const tx = await medicalConsent.connect(provider).logAccess(mockRecordId);
      await expect(tx).to.emit(medicalConsent, "AccessLogged").withArgs(mockRecordId, provider.address, (val) => val > 0);
    });

    it("should prevent unauthorized entity from logging access", async function () {
      await expect(
        medicalConsent.connect(attacker).logAccess(mockRecordId)
      ).to.be.revertedWith("MedicalConsent: caller does not have active access");
    });
  });
});
