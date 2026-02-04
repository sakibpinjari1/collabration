import Workspace from "../models/Workspace.js";

export const requireWorkspaceMember = async (req, res, next) => {
   const { workspaceId} = req.params;
   const userId = req.userId;
   console.log("🔍 Checking workspace membership - userId:", userId);

   const workspace = await Workspace.findById(workspaceId);

   if(!workspace) {
    console.log("❌ Workspace not found:", workspaceId);
    return res.status(404).json({message: "Workspace not found"});
   }

   console.log("📋 Workspace members:", workspace.members.map(m => m.userId.toString()));
   const member = workspace.members.find(
    (m) => m.userId.equals(userId)
   );

   if(!member) {
    console.log("❌ User not a member of workspace");
    return res.status(403).json({message: "Access denied"});
   }

   console.log("✅ User is member with role:", member.role);
   req.workspace = workspace;
   req.workspaceRole = member.role;

   next();
}

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.workspaceRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};
