import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import Invite from "../models/Invite.js";

export const getUserWorkspaces = async (req, res) => {
    try {
        const userId = req.userId;
        console.log("🔍 Getting workspaces for user:", userId);
        
        const workspaces = await Workspace.find({
            "members.userId": userId    
        });
        
        console.log("✅ Found", workspaces.length, "workspaces");
        res.json(workspaces);
    } catch (err) {
        console.error("❌ Error getting workspaces:", err);
        res.status(500).json({ message: "Error fetching workspaces" });
    }
};

export const createWorkspace = async (req, res) => {
    const { name } = req.body;

    const workspace = await Workspace.create({
        name,
        ownerId: req.userId,
        members: [{
            userId: req.userId, role: "OWNER"
        }],
    })

    res.status(201).json(workspace);
};

export const inviteToWorkspace = async (req, res) => {
    const { workspaceId } = req.params;
    const { email, role = "MEMBER" } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allowedRoles = ["MEMBER", "VIEWER"];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Worspace not found"});

    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
        const alreadyMember = workspace.members.some(
            (m) => m.userId.toString() === user._id.toString()
        );
        if (alreadyMember) {
            return res.status(400).json({ message: "User already in workspace" });
        }
    }

    const existingInvite = await Invite.findOne({
        workspaceId,
        email: normalizedEmail,
        status: "PENDING",
    });

    if (existingInvite) {
        return res.status(400).json({ message: "Invite already pending"});
    }

    const invite = await Invite.create({
        workspaceId,
        email: normalizedEmail,
        role,
        invitedBy: req.userId,
    });
    res.json(invite);
};


export const updateMemberRole = async (req, res) => {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if(!workspace) return res.status(404).json({ message: "Workspace not found"});

    const member = workspace.members.find(
        (m) => m.userId.toString() === memberId
    );

    if (!member) return res.status(404).json({ message: "Member not found"});

    const isSelf = memberId.toString() === req.userId.toString();
    if (isSelf && role !== "OWNER") {
        return res.status(400).json({ message: "Owner cannot change their own role" });
    }

    if (member.role === "OWNER" && role !== "OWNER") {
        const ownerCount = workspace.members.filter((m) => m.role === "OWNER").length;
        if (ownerCount <= 1) {
            return res.status(400).json({ message: "Workspace must have at least one OWNER" });
        }
    }

    member.role = role;
    await workspace.save();

    res.json({ message: "Role updated", member});
}


export const removeMember = async (req, res) => {
    const {workspaceId, memberId} = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if(!workspace) return res.status(404).json({message: "Workspace not found"});

    if (memberId.toString() === req.userId.toString()) {
        return res.status(400).json({ message: "Owner cannot remove themselves" });
    }

    const member = workspace.members.find(
        (m) => m.userId.toString() === memberId
    );
    if (!member) return res.status(404).json({ message: "Member not found" });

    if (member.role === "OWNER") {
        const ownerCount = workspace.members.filter((m) => m.role === "OWNER").length;
        if (ownerCount <= 1) {
            return res.status(400).json({ message: "Workspace must have at least one OWNER" });
        }
    }

    workspace.members = workspace.members.filter(
        (m) => m.userId.toString() !== memberId
    );

    await workspace.save();

    res.json({message: "member removed"});
};

export const getMyInvites = async (req, res) => {
    const invites = await Invite.find({
        email: req.user.email,
        status: "PENDING",
    }).populate("workspaceId", "name");
    res.json(invites);
};

export const acceptInvite = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Not authorized" });
        }
        const invite = await Invite.findById(req.params.inviteId);
        if (!invite || invite.status !== "PENDING") {
            return res.status(404).json({message: "Invite not found"});
        }

        const requesterEmail = String(req.user.email).toLowerCase();
        if (invite.email !== requesterEmail) {
            return res.status(403).json({ message: "Not allowed"});
        }

        const workspace = await Workspace.findById(invite.workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        const alreadyMember = workspace.members.some(
            (m) => m.userId.toString() === req.user._id.toString()
        );
        if (alreadyMember) {
            invite.status = "ACCEPTED";
            await invite.save();
            return res.json({ message: "Invite accepted" });
        }

        workspace.members.push({ userId: req.user._id, role: invite.role});
        await workspace.save();

        invite.status = "ACCEPTED";
        await invite.save();

        res.json({ message: "Invite accepted"});
    } catch (err) {
        console.error("ACCEPT INVITE ERROR:", err);
        res.status(500).json({ message: "Failed to accept invite", detail: err.message });
    }
}

export const declineInvite = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Not authorized" });
        }
        const invite = await Invite.findById(req.params.inviteId);

        if(!invite || invite.status !== "PENDING") {
            return res.status(404).json({message: "Invite not found"});
        }

        const requesterEmail = String(req.user.email).toLowerCase();
        if (invite.email !== requesterEmail) {
            return res.status(403).json({ message: "Not allowed"});
        }

        invite.status = "DECLINED";
        await invite.save();

        res.json({message: "Invite declined"})
    } catch (err) {
        console.error("DECLINE INVITE ERROR:", err);
        res.status(500).json({ message: "Failed to decline invite", detail: err.message });
    }
}
