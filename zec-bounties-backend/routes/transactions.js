const express = require("express");
const prisma = require("../prisma/client");
const router = express.Router();
const axios = require("axios");
const { authenticate, isAdmin } = require("../middleware/auth");
const executeZingoQuickSend = require("../utils/zingo/zingoLibQuickSend.js");
const { findDueBounties } = require("../helpers/db-query.js");
const {
  buildPaymentList,
  updateDueBounties,
  storeTransactions,
} = require("../helpers/db-query.js");
const { initZcashOnce } = require("../zcash/init");
const executeZingoCli = require("../utils/zingo/zingoLib.js");
const executeZingoCliTransactions = require("../utils/zingo/zingoLibTransactions.js");
const executeZingoCheckBalance = require("../utils/zingo/zingoLibCheckBalance.js");
const executeZingoCliAddresses = require("../utils/zingo/zingoLibAddresses.js");
const {
  getLatestZcashParams,
  getDefaultZcashParams,
} = require("../helpers/zcash/zcashHelper.js");
const executeZingoParseAddress = require("../utils/zingo/zingoLibParseAddress.js");
const executeZingoCliSync = require("../utils/zingo/zingoLibSync.js");
const executeZingoCliRescan = require("../utils/zingo/zingoLibRescan.js");
const executeZingoCliRecoveryInfo = require("../utils/zingo/zingoLibRecoveryInfo.js");
const executeZingoCliQuit = require("../utils/zingo/zingoLibQuit.js");
const executeZingoCliBalance = require("../utils/zingo/zingoLibBalance.js");
const { resolvePayingWallet } = require("../helpers/zcash/resolvePayingWallet");
const { buildPaymentListGrouped } = require("../helpers/db-query");
const { delCache, deleteCacheByPattern } = require("../utils/cache");
const executeZingoCliInfo = require("../utils/zingo/zingoLibInfo");
const { sendRealtimeUpdate, sendToUser } = require("../middleware/websocket");
const path = require("path");

const invalidateBounty = async (bountyId) => {
  await Promise.all([
    delCache(`bounty:${bountyId}`),
    deleteCacheByPattern("bounties:*"),
  ]);
};

// List transactions (Admin)
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const params = await getDefaultZcashParams(req.user.id);
    const txs = await executeZingoCliTransactions(params);

    sendToUser(req.user.id, "transactions_fetched", { transactions: txs });

    res.json({
      success: true,
      transactions: txs,
      chain: params?.chain,
      serverUrl: params?.serverUrl,
    });
  } catch (err) {
    console.error("Transactions error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch transactions",
    });
  }
});

router.get("/rescan", authenticate, isAdmin, async (req, res) => {
  try {
    let params = await getDefaultZcashParams(req.user.id);
    console.log("Params for this request:", params);

    if (!params) {
      params = await initZcashOnce(req.user.id, "Main");
    }

    const result = await executeZingoCliRescan("rescan", params);

    res.json({
      success: true,
      message: "Rescan started successfully",
      result,
    });
  } catch (err) {
    console.error("Rescan error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to start rescan",
    });
  }
});

router.get("/sync-status", authenticate, isAdmin, async (req, res) => {
  try {
    let params = await getDefaultZcashParams(req.user.id);

    if (!params) {
      params = await initZcashOnce(req.user.id, "Main");
    }

    const data = await executeZingoCliSync("sync status", params);
    console.log("sync-status raw:", data);

    sendToUser(req.user.id, "sync_status", { data });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Sync status error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch sync status",
    });
  }
});

router.get("/balance", authenticate, isAdmin, async (req, res) => {
  try {
    let params = await getDefaultZcashParams(req.user.id);
    if (!params) {
      params = await initZcashOnce(req.user.id, "Main");
    }

    const parsed = await executeZingoCliBalance("balance", params);
    console.log("Parsed balance:", parsed);

    // Return flat object for frontend compatibility
    sendToUser(req.user.id, "balance_fetched", { balance: parsed });
    res.json(parsed);
  } catch (err) {
    console.error("Balance error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/accounts", authenticate, async (req, res) => {
  const { accountName } = req.body;
  if (!accountName) {
    return res.status(400).json({ error: "accountName is required" });
  }
  try {
    const params = await initZcashOnce(req.user.id, accountName);
    sendToUser(req.user.id, "account_created", { accountName, params });
    res.json({ message: `Account "${accountName}" initialized`, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/addresses", authenticate, isAdmin, async (req, res) => {
  try {
    const params = await getDefaultZcashParams(req.user.id);
    if (!params) {
      await initZcashOnce(req.user.id, "Main");
    }

    const addresses = await executeZingoCliAddresses("addresses", params);
    console.log("addresses raw:", addresses);

    sendToUser(req.user.id, "addresses_fetched", { addresses });
    res.json(addresses); // return array directly
  } catch (err) {
    console.error("Addresses error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/authorize-payment", authenticate, isAdmin, async (req, res) => {
  try {
    const { bountyIds } = req.body;
    if (!bountyIds || !Array.isArray(bountyIds) || bountyIds.length === 0) {
      return res.status(400).json({ error: "No bounties selected for payment" });
    }

    const adminWallet = await prisma.zcashParams.findFirst({
      where: {
        ownerId: req.user.id,
        isDefault: true,
      },
    });

    if (!adminWallet) {
      return res.status(400).json({
        error: "No default wallet configured. Please set a default wallet in settings before authorizing payments.",
      });
    }

    const bountyChainForWallet = adminWallet.chain === "mainnet" ? "MAIN" : "TEST";
    adminWallet.dataDir = path.join(
      process.cwd(),
      "wallets",
      req.user.id,
      adminWallet.accountName,
      adminWallet.chain,
    );

    const bounties = await prisma.bounty.findMany({
      where: {
        id: { in: bountyIds },
        status: "DONE",
        isPaid: false,
        isApproved: true,
      },
      include: {
        assigneeUser: {
          select: { id: true, name: true, z_address: true, UA_address: true },
        },
      },
    });

    const chainMismatches = bounties.filter((b) => b.chain !== bountyChainForWallet);
    if (chainMismatches.length > 0) {
      return res.status(400).json({
        error: `Chain mismatch: your default wallet is on ${adminWallet.chain} but ${chainMismatches.length} selected bounty/ies are on ${bountyChainForWallet === "MAIN" ? "testnet" : "mainnet"}.`,
        mismatched: chainMismatches.map((b) => ({ id: b.id, title: b.title, chain: b.chain })),
      });
    }

    if (bounties.length === 0) {
      return res.status(400).json({
        error: "None of the selected bounties are eligible for payment (must be DONE, approved, and unpaid)",
      });
    }

    const paymentList = [];
    const skipped = [];

    for (const bounty of bounties) {
      const payoutAddress = bounty.chain === "MAIN"
        ? bounty.assigneeUser?.UA_address
        : bounty.assigneeUser?.z_address;

      if (!payoutAddress) {
        skipped.push({
          id: bounty.id,
          title: bounty.title,
          reason: `Assignee has no ${bounty.chain === "MAIN" ? "UA address" : "z_address"}`,
        });
        continue;
      }

      paymentList.push({
        address: payoutAddress,
        amount: Math.round(bounty.bountyAmount * 1e8),
        memo: `Bounty: ${bounty.title} (ID: ${bounty.id})`,
        bountyId: bounty.id,
      });
    }

    if (paymentList.length === 0) {
      return res.status(400).json({
        error: "No payable bounties — all selected assignees are missing z_addresses",
        skipped,
      });
    }

    console.log(`💸 Paying ${paymentList.length} bounties from wallet "${adminWallet.accountName}"`);

    const sendResult = await executeZingoQuickSend(paymentList, adminWallet);

    if (sendResult.error) {
      return res.status(422).json({
        success: false,
        error: "Payment failed",
        details: sendResult.error,
      });
    }

    const txResult = sendResult[1];
    const paidBountyIds = paymentList.map((p) => p.bountyId);

    await prisma.bounty.updateMany({
      where: { id: { in: paidBountyIds } },
      data: {
        isPaid: true,
        paymentAuthorized: true,
        paidAt: new Date(),
      },
    });

    await Promise.all(paidBountyIds.map((id) => invalidateBounty(id)));

    sendRealtimeUpdate("payment_authorized", {
      result: txResult,
      paidCount: paidBountyIds.length,
      skippedCount: skipped.length,
      skipped,
      walletAccountName: adminWallet.accountName,
    }, req.user.id);

    res.json({
      success: true,
      result: txResult,
      paidCount: paidBountyIds.length,
      skipped,
    });
  } catch (error) {
    console.error("Error in authorize-payment:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/authorize-payment", authenticate, isAdmin, async (req, res) => {
  try {
    const { id: bountyId } = req.params;
    const { paymentAuthorized, paymentScheduled } = req.body;
    const userRole = req.user.role;

    if (userRole !== "ADMIN") {
      return res.status(403).json({ error: "Only administrators can authorize payments" });
    }

    const dueBounties = await findDueBounties();
    const paymentList = await buildPaymentList(dueBounties);

    const bounty = await prisma.bounty.findUnique({
      where: { id: bountyId },
      include: {
        assigneeUser: true,
        createdByUser: true,
      },
    });

    if (!bounty) {
      return res.status(404).json({ error: "Bounty not found" });
    }

    if (bounty.status !== "DONE" || !bounty.isApproved) {
      return res.status(400).json({
        error: "Bounty must be completed and approved before payment authorization",
      });
    }

    if (paymentScheduled?.type === "sunday_batch" && !bounty.assigneeUser?.z_address) {
      return res.status(400).json({
        error: "Assignee must have a Z-address configured for batch payments",
      });
    }

    const updatedBounty = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        paymentAuthorized: paymentAuthorized || true,
        paymentScheduled: paymentScheduled ? JSON.stringify(paymentScheduled) : null,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        assigneeUser: {
          select: { id: true, name: true, email: true, role: true, avatar: true, z_address: true },
        },
      },
    });

    const responseData = {
      ...updatedBounty,
      paymentScheduled: updatedBounty.paymentScheduled
        ? JSON.parse(updatedBounty.paymentScheduled)
        : null,
    };

    await invalidateBounty(bountyId);

    sendRealtimeUpdate("bounty_payment_authorized", responseData, req.user.id);
    res.json(responseData);
  } catch (error) {
    console.error("Error authorizing payment:", error);
    res.status(500).json({ error: "Failed to authorize payment", details: error.message });
  }
});

router.put("/:id/authorize-payment", authenticate, isAdmin, async (req, res) => {
  try {
    const { id: bountyId } = req.params;
    const { paymentAuthorized, paymentScheduled } = req.body;
    const userRole = req.user.role;

    if (userRole !== "ADMIN") {
      return res.status(403).json({ error: "Only administrators can authorize payments" });
    }

    const bounty = await prisma.bounty.findUnique({
      where: { id: bountyId },
      include: {
        assigneeUser: true,
        createdByUser: true,
      },
    });

    if (!bounty) {
      return res.status(404).json({ error: "Bounty not found" });
    }

    if (bounty.status !== "DONE" || !bounty.isApproved) {
      return res.status(400).json({
        error: "Bounty must be completed and approved before payment authorization",
      });
    }

    if (paymentScheduled?.type === "sunday_batch" && !bounty.assigneeUser?.z_address) {
      return res.status(400).json({
        error: "Assignee must have a Z-address configured for batch payments",
      });
    }

    const updatedBounty = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        paymentAuthorized: paymentAuthorized || true,
        paymentScheduled: paymentScheduled ? JSON.stringify(paymentScheduled) : null,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        assigneeUser: {
          select: { id: true, name: true, email: true, role: true, avatar: true, z_address: true },
        },
      },
    });

    const responseData = {
      ...updatedBounty,
      paymentScheduled: updatedBounty.paymentScheduled
        ? JSON.parse(updatedBounty.paymentScheduled)
        : null,
    };

    await invalidateBounty(bountyId);

    sendRealtimeUpdate("bounty_payment_authorized", responseData, req.user.id);
    res.json(responseData);
  } catch (error) {
    console.error("Error authorizing payment:", error);
    res.status(500).json({ error: "Failed to authorize payment", details: error.message });
  }
});

router.post("/process-batch-payments", authenticate, isAdmin, async (req, res) => {
  try {
    const { payments, batchTimestamp } = req.body;
    const userRole = req.user.role;

    if (userRole !== "ADMIN") {
      return res.status(403).json({ error: "Only administrators can process batch payments" });
    }

    if (!payments || !Array.isArray(payments)) {
      return res.status(400).json({ error: "Invalid payments data" });
    }

    if (payments.length === 0) {
      return res.json({ success: true, message: "No payments to process", processedCount: 0 });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("Processing batch payment:", {
      batchId,
      batchTimestamp,
      paymentCount: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      payments,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const processedPayments = payments.map((payment) => ({
      ...payment,
      status: "processed",
      transactionId: `tx_${Math.random().toString(36).substr(2, 9)}`,
    }));

    const result = {
      success: true,
      batchId,
      message: `Successfully processed ${payments.length} payments`,
      processedCount: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      payments: processedPayments,
      zcashPayload: payments,
    };

    sendRealtimeUpdate("batch_payment_processed", result, req.user.id);
    res.json(result);
  } catch (error) {
    console.error("Error processing batch payments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process batch payments",
      message: error.message,
    });
  }
});

router.post("/process-instant-payment", authenticate, isAdmin, async (req, res) => {
  try {
    const { address, amount, memo, bountyId } = req.body;
    const userRole = req.user.role;

    if (userRole !== "ADMIN") {
      return res.status(403).json({ error: "Only administrators can process payments" });
    }

    if (!address || !amount || !bountyId) {
      return res.status(400).json({ error: "Missing required fields: address, amount, bountyId" });
    }

    console.log("Processing instant payment:", {
      bountyId,
      address,
      amount,
      memo,
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const transactionId = `tx_instant_${Math.random().toString(36).substr(2, 9)}`;

    const result = {
      success: true,
      message: "Instant payment processed successfully",
      transactionId,
      amount,
      address,
      memo,
      bountyId,
    };

    sendRealtimeUpdate("instant_payment_processed", result, req.user.id);
    res.json(result);
  } catch (error) {
    console.error("Error processing instant payment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process instant payment",
      message: error.message,
    });
  }
});

router.put("/:id/mark-paid", authenticate, isAdmin, async (req, res) => {
  try {
    const { id: bountyId } = req.params;
    const { isPaid, paymentBatchId, paidAt } = req.body;
    const userRole = req.user.role;

    if (userRole !== "ADMIN") {
      return res.status(403).json({ error: "Only administrators can mark bounties as paid" });
    }

    const updatedBounty = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        isPaid: isPaid || true,
        paymentBatchId: paymentBatchId || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        assigneeUser: {
          select: { id: true, name: true, email: true, role: true, avatar: true, z_address: true },
        },
      },
    });

    await invalidateBounty(bountyId);

    sendRealtimeUpdate("bounty_marked_paid", updatedBounty, req.user.id);
    res.json(updatedBounty);
  } catch (error) {
    console.error("Error marking bounty as paid:", error);
    res.status(500).json({ error: "Failed to mark bounty as paid", details: error.message });
  }
});

router.post("/pay/:bountyId", authenticate, isAdmin, async (req, res) => {
  const bountyId = req.params.bountyId;
  const bounty = await prisma.bounty.findUnique({
    where: { id: bountyId },
    include: { assignee: true },
  });

  if (!bounty.approved) {
    return res.status(400).send("Bounty not approved");
  }

  if (!bounty.assignee?.zecAddress) {
    return res.status(400).send("Assignee has no address");
  }

  const rpcPayload = {
    jsonrpc: "1.0",
    id: "pay",
    method: "z_sendmany",
    params: [
      process.env.ADMIN_WALLET_ADDRESS,
      [{ address: bounty.assignee.zecAddress, amount: bounty.bountyAmountZec }],
    ],
  };

  try {
    const rpcRes = await axios.post(process.env.ZCASH_RPC_URL, rpcPayload, {
      auth: {
        username: process.env.ZCASH_RPC_USER,
        password: process.env.ZCASH_RPC_PASS,
      },
    });

    const txHash = rpcRes.data.result;

    await prisma.transaction.create({
      data: {
        bountyId,
        adminId: req.user.id,
        txHash,
        amountZec: bounty.bountyAmountZec,
      },
    });

    await invalidateBounty(bountyId);

    sendRealtimeUpdate("bounty_paid", {
      bountyId,
      txHash,
      amount: bounty.bountyAmountZec,
    }, req.user.id);

    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;