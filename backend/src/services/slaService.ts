import { Complaint } from '../models/Complaint';
import { ComplaintHistory } from '../models/ComplaintHistory';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { logger } from '../config/logger';

export const checkSLABreaches = async (): Promise<void> => {
  const now = new Date();

  try {
    // Find complaints that are active, not resolved/closed/rejected/cancelled, and past their SLA deadline
    const breachedComplaints = await Complaint.find({
      status: { $nin: ['Resolved', 'Closed', 'Rejected', 'Cancelled'] },
      slaDeadline: { $lt: now },
    } as any);

    if (breachedComplaints.length === 0) {
      return;
    }

    logger.info(`SLA Service: Found ${breachedComplaints.length} overdue complaints.`);

    for (const complaint of breachedComplaints) {
      const oldStatus = complaint.status;
      const newEscalationLevel = complaint.escalationLevel + 1;

      // 1. Shift state to Escalated
      complaint.status = 'Escalated';
      complaint.escalationLevel = newEscalationLevel;

      // Extend deadline by another SLA duration to prevent immediate repeat triggers (e.g. add 8 hours)
      const extendedDeadline = new Date();
      extendedDeadline.setHours(extendedDeadline.getHours() + 8);
      complaint.slaDeadline = extendedDeadline;

      await complaint.save();

      // Get System Admin user for the audit trace
      const systemUser = await User.findOne({ email: 'admin@ecms.gov' });
      const systemUserId = systemUser ? systemUser._id : complaint.citizenId;

      // 2. Log status change history
      const history = new ComplaintHistory({
        complaintId: complaint._id,
        changedBy: systemUserId,
        previousStatus: oldStatus,
        newStatus: 'Escalated',
        remarks: `System: SLA breached at level ${newEscalationLevel}. Priority escalations triggered.`,
      });
      await history.save();

      // 3. Log Audit Log
      const audit = new AuditLog({
        userId: systemUserId,
        action: 'SLA_BREACH_ESCALATION',
        targetType: 'Complaint',
        targetId: complaint._id.toString(),
        previousState: { status: oldStatus, escalationLevel: complaint.escalationLevel - 1 },
        newState: { status: 'Escalated', escalationLevel: newEscalationLevel },
        details: `SLA timer breached. Auto escalated to level ${newEscalationLevel}.`,
      });
      await audit.save();

      // 4. Send notification to department manager or officer
      let recipientId = complaint.assignedOfficerId;

      // If no officer assigned, or if escalated again, notify the department manager or system admin
      if (!recipientId || newEscalationLevel > 1) {
        // Find department manager
        const manager = await User.findOne({
          departmentId: complaint.departmentId,
          roleId: await getRoleIdByName('DEPT_MANAGER'),
        });
        if (manager) {
          recipientId = manager._id;
        } else {
          // Default to system admin
          const admin = await User.findOne({ email: 'admin@ecms.gov' });
          if (admin) recipientId = admin._id;
        }
      }

      if (recipientId) {
        const notif = new Notification({
          recipientId,
          title: `CRITICAL: SLA Breached (${complaint.complaintNumber})`,
          message: `Complaint titled "${complaint.title}" has breached SLA deadline. Auto escalated to level ${newEscalationLevel}.`,
          complaintId: complaint._id,
          type: 'SLA_BREACH',
        });
        await notif.save();
        logger.info(`SLA Alert notification sent to user ID ${recipientId}`);
      }
    }
  } catch (error) {
    logger.error('Error checking SLA breaches in background service: %O', error);
  }
};

// Helper to get Role ID
const getRoleIdByName = async (roleName: string): Promise<any> => {
  const Role = (await import('../models/Role')).Role;
  const role = await Role.findOne({ name: roleName });
  return role ? role._id : null;
};

// Start periodic checks
export const startSLAService = (intervalMs: number = 60 * 1000): NodeJS.Timeout => {
  logger.info(`SLA Escalation service started. Periodic scanning every ${intervalMs / 1000}s.`);
  return setInterval(checkSLABreaches, intervalMs);
};
