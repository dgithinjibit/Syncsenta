import { expect } from "chai";
import { ethers } from "hardhat";
import { SyncSentaCredentials, SyncToken, ApprovalRegistry, ContentRegistry } from "../typechain-types";

describe("SyncSenta Smart Contracts", function () {
  let credentials: SyncSentaCredentials;
  let token: SyncToken;
  let registry: ApprovalRegistry;
  let content: ContentRegistry;
  let owner: any;
  let learner: any;
  let issuer: any;

  beforeEach(async function () {
    [owner, learner, issuer] = await ethers.getSigners();

    const Credentials = await ethers.getContractFactory("SyncSentaCredentials");
    credentials = await Credentials.deploy();

    const Token = await ethers.getContractFactory("SyncToken");
    token = await Token.deploy();

    const Registry = await ethers.getContractFactory("ApprovalRegistry");
    registry = await Registry.deploy();

    const Content = await ethers.getContractFactory("ContentRegistry");
    content = await Content.deploy();
  });

  // ─── SyncSentaCredentials Tests ──────────────────────────────────────────

  describe("SyncSentaCredentials", function () {
    it("Should mint a credential NFT", async function () {
      const tx = await credentials.mintCredential(
        learner.address,
        "CBC/Math/Grade5/Numbers",
        "QmTestCID123"
      );
      await tx.wait();

      const [valid, credLearner, skillId] = await credentials.verifyCredential(0);
      expect(valid).to.be.true;
      expect(credLearner).to.equal(learner.address);
      expect(skillId).to.equal("CBC/Math/Grade5/Numbers");
    });

    it("Should revoke a credential", async function () {
      await credentials.mintCredential(learner.address, "CBC/Math/Grade5", "QmCID");
      await credentials.revokeCredential(0);

      const [valid] = await credentials.verifyCredential(0);
      expect(valid).to.be.false;
    });

    it("Should not allow non-issuers to mint", async function () {
      await expect(
        credentials.connect(learner).mintCredential(learner.address, "skill", "cid")
      ).to.be.revertedWith("Not an authorized issuer");
    });

    it("Should track total minted credentials", async function () {
      await credentials.mintCredential(learner.address, "skill1", "cid1");
      await credentials.mintCredential(learner.address, "skill2", "cid2");
      expect(await credentials.totalMinted()).to.equal(2);
    });
  });

  // ─── SyncToken Tests ─────────────────────────────────────────────────────

  describe("SyncToken", function () {
    it("Should mint tokens on milestone", async function () {
      const amount = ethers.parseEther("100");
      await token.mint(learner.address, amount);
      expect(await token.balanceOf(learner.address)).to.equal(amount);
    });

    it("Should burn tokens on redemption", async function () {
      const amount = ethers.parseEther("100");
      await token.mint(learner.address, amount);

      await token.connect(learner).burn(ethers.parseEther("50"));
      expect(await token.balanceOf(learner.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should not exceed max supply", async function () {
      const maxSupply = ethers.parseEther("1000000000");
      await expect(token.mint(learner.address, maxSupply + 1n)).to.be.revertedWith(
        "Exceeds max supply"
      );
    });

    it("Should not allow non-minters to mint", async function () {
      await expect(
        token.connect(learner).mint(learner.address, 100)
      ).to.be.revertedWith("Not an authorized minter");
    });
  });

  // ─── ApprovalRegistry Tests ──────────────────────────────────────────────

  describe("ApprovalRegistry", function () {
    it("Should record an approval decision", async function () {
      const tx = await registry.recordApproval(
        learner.address,
        owner.address,
        "teacher",
        true,
        ""
      );
      const receipt = await tx.wait();
      expect(await registry.totalRecords()).to.equal(1);
    });

    it("Should record a rejection with reason", async function () {
      await registry.recordApproval(
        learner.address,
        owner.address,
        "school_admin",
        false,
        "Incomplete documentation"
      );
      expect(await registry.totalRecords()).to.equal(1);
    });

    it("Should check approval status", async function () {
      await registry.recordApproval(learner.address, owner.address, "teacher", true, "");
      const approved = await registry.isApproved(learner.address, "teacher");
      expect(approved).to.be.true;
    });
  });

  // ─── ContentRegistry Tests ───────────────────────────────────────────────

  describe("ContentRegistry", function () {
    it("Should register content with IPFS CID", async function () {
      const tx = await content.registerContent(
        "QmTestContentCID",
        learner.address,
        "lesson",
        "CBC/Math/Grade5/Numbers"
      );
      await tx.wait();
      expect(await content.totalContent()).to.equal(1);
    });

    it("Should track content by creator", async function () {
      await content.registerContent("QmCID1", learner.address, "lesson", "CBC/Math");
      await content.registerContent("QmCID2", learner.address, "scheme", "CBC/Science");

      const creatorContent = await content.getCreatorContent(learner.address);
      expect(creatorContent.length).to.equal(2);
    });

    it("Should deactivate content", async function () {
      const tx = await content.registerContent("QmCID", learner.address, "lesson", "CBC/Math");
      const receipt = await tx.wait();

      // Get contentId from event
      const event = receipt?.logs[0];
      // Deactivate using the content ID
      const contentId = await content.allContentIds(0);
      await content.deactivateContent(contentId);

      const record = await content.content(contentId);
      expect(record.active).to.be.false;
    });
  });
});
