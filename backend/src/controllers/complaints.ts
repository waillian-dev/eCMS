import { Request, Response } from 'express';
import { Complaint } from '../models/Complaint';
import { ComplaintCategory } from '../models/ComplaintCategory';
import { ComplaintHistory } from '../models/ComplaintHistory';
import { Rating } from '../models/Rating';
import { AuditLog } from '../models/AuditLog';
import { ComplaintMessage } from '../models/ComplaintMessage';
import { uploadFile } from '../services/storageService';
import { estimatePriority, calculateSLADeadline } from '../utils/priority';
import { sendPushNotification } from '../services/notificationService';
import { logger } from '../config/logger';

export const createComplaint = async (req: Request, res: Response): Promise<void> => {
  const {
    title,
    description,
    categoryId,
    isAnonymous,
    longitude,
    latitude,
    address,
    driverName,
    licensePlate,
    tripId,
    bookingReference,
    routeFrom,
    routeTo,
  } = req.body;

  if (!title || !description || !categoryId || !longitude || !latitude || !address || !licensePlate) {
    res.status(400).json({ error: 'Title, description, category, longitude, latitude, address, and license plate are required.' });
    return;
  }

  try {
    const category = await ComplaintCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({ error: 'Complaint category not found.' });
      return;
    }

    const priority = estimatePriority(description, category.defaultPriority);
    const slaDeadline = calculateSLADeadline(priority);

    // Auto-generate Complaint Number (COMP-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Complaint.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    const complaintNumber = `COMP-${dateStr}-${seq}`;

    // Handle uploaded files
    const attachments: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try {
          const uploadRes = await uploadFile(file.path, file.originalname, file.mimetype);
          attachments.push(uploadRes);
        } catch (uploadErr) {
          logger.error('Failed to process attachment file %s: %O', file.originalname, uploadErr);
        }
      }
    }

    const complaint = new Complaint({
      complaintNumber,
      title,
      description,
      citizenId: req.user!.userId,
      categoryId,
      departmentId: category.defaultDepartmentId,
      priority,
      status: 'Submitted',
      driverName,
      licensePlate,
      tripId,
      bookingReference,
      routeFrom,
      routeTo,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address,
      },
      attachments,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      slaDeadline,
    });

    await complaint.save();

    // Create Initial History record
    const history = new ComplaintHistory({
      complaintId: complaint._id,
      changedBy: req.user!.userId,
      previousStatus: 'Draft',
      newStatus: 'Submitted',
      remarks: 'Complaint filed by customer.',
    });
    await history.save();

    // Create Audit Log
    const audit = new AuditLog({
      userId: req.user!.userId,
      action: 'CREATE_COMPLAINT',
      targetType: 'Complaint',
      targetId: complaint._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await audit.save();

    res.status(201).json(complaint);
  } catch (error) {
    logger.error('Error creating complaint: %O', error);
    res.status(500).json({ error: 'Internal server error while filing complaint.' });
  }
};

export const getComplaints = async (req: Request, res: Response): Promise<void> => {
  const { status, priority, categoryId, departmentId, search, page = 1, limit = 10 } = req.query;

  const query: any = {};

  // Role restriction: Citizens can only see their own tickets
  if (req.user!.role === 'CITIZEN') {
    query.citizenId = req.user!.userId;
  } else if (req.user!.role === 'SUPPORT_OFFICER') {
    // Officers might be restricted to their department or assigned tickets
    query.departmentId = req.user!.departmentId;
  }

  // Filter keys
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (categoryId) query.categoryId = categoryId;
  if (departmentId) query.departmentId = departmentId;

  // Search text mapping
  if (search) {
    query.$or = [
      { complaintNumber: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('citizenId', 'name email phone')
      .populate('categoryId', 'name')
      .populate('departmentId', 'name code')
      .populate('assignedOfficerId', 'name email');

    const total = await Complaint.countDocuments(query);

    res.status(200).json({
      data: complaints,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to get complaints list: %O', error);
    res.status(500).json({ error: 'Internal server error while fetching complaints.' });
  }
};

export const getComplaintById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const complaint = await Complaint.findById(id)
      .populate('citizenId', 'name email phone')
      .populate('categoryId', 'name')
      .populate('departmentId', 'name code')
      .populate('assignedOfficerId', 'name email');

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    // Citizen privacy check
    if (req.user!.role === 'CITIZEN' && complaint.citizenId._id.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Fetch tracking timeline history
    const history = await ComplaintHistory.find({ complaintId: id })
      .sort({ createdAt: 1 })
      .populate('changedBy', 'name email role');

    res.status(200).json({ complaint, history });
  } catch (error) {
    logger.error('Failed to get complaint detail: %O', error);
    res.status(500).json({ error: 'Internal server error while fetching complaint details.' });
  }
};

export const updateComplaint = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description, categoryId } = req.body;

  try {
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    // Verify ownership
    if (complaint.citizenId.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Only the author can update this complaint.' });
      return;
    }

    // Restrict edits if processing has already started
    if (!['Draft', 'Submitted'].includes(complaint.status)) {
      res.status(400).json({ error: 'Complaint cannot be edited once under review or assigned.' });
      return;
    }

    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (categoryId) {
      const category = await ComplaintCategory.findById(categoryId);
      if (!category) {
        res.status(404).json({ error: 'Invalid category ID.' });
        return;
      }
      complaint.categoryId = categoryId;
      complaint.departmentId = category.defaultDepartmentId;
    }

    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    logger.error('Error updating complaint: %O', error);
    res.status(500).json({ error: 'Failed to update complaint.' });
  }
};

export const updateComplaintStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, assignedOfficerId, remarks } = req.body;

  if (!status) {
    res.status(400).json({ error: 'New status is required.' });
    return;
  }

  try {
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const previousStatus = complaint.status;

    // RBAC validation logic on state transitions
    if (req.user!.role === 'CITIZEN') {
      const citizenAllowed = ['Closed', 'Reopened', 'Cancelled'];
      if (!citizenAllowed.includes(status)) {
        res.status(403).json({ error: 'Citizens cannot transition tickets to this state.' });
        return;
      }
      if (complaint.citizenId.toString() !== req.user!.userId) {
        res.status(403).json({ error: 'Unauthorized operation.' });
        return;
      }
    }

    // Apply updates
    complaint.status = status;

    if (assignedOfficerId) {
      complaint.assignedOfficerId = assignedOfficerId;
      // If assignment changes, make sure status is 'Assigned' if currently 'Submitted' or 'UnderReview'
      if (['Submitted', 'UnderReview'].includes(complaint.status)) {
        complaint.status = 'Assigned';
      }
    }

    await complaint.save();

    // Log tracking history
    const history = new ComplaintHistory({
      complaintId: complaint._id,
      changedBy: req.user!.userId,
      previousStatus,
      newStatus: complaint.status,
      remarks: remarks || `Status updated from ${previousStatus} to ${complaint.status}`,
    });
    await history.save();

    // Log Audit action
    const audit = new AuditLog({
      userId: req.user!.userId,
      action: 'STATUS_CHANGE',
      targetType: 'Complaint',
      targetId: complaint._id.toString(),
      previousState: { status: previousStatus },
      newState: { status: complaint.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await audit.save();

    // Trigger push notification to citizen
    sendPushNotification(
      complaint.citizenId.toString(),
      `Ticket Status Update (${complaint.complaintNumber})`,
      `Your complaint status has changed to "${complaint.status}".`,
      { complaintId: complaint._id.toString(), type: 'STATUS_UPDATE' }
    );

    res.status(200).json({ message: 'Complaint status updated.', complaint });
  } catch (error) {
    logger.error('Failed to change complaint status: %O', error);
    res.status(500).json({ error: 'Internal server error while changing status.' });
  }
};

export const rateResolution = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { ratingValue, resolutionQuality, officerBehavior, responseSpeed, overallExperience, comments } = req.body;

  if (!ratingValue || !resolutionQuality || !officerBehavior || !responseSpeed || !overallExperience) {
    res.status(400).json({ error: 'All rating parameters are required.' });
    return;
  }

  try {
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    // Verify rating authorization
    if (complaint.citizenId.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Only the submitting citizen can rate the resolution.' });
      return;
    }

    if (!['Resolved', 'Closed'].includes(complaint.status)) {
      res.status(400).json({ error: 'Complaints can only be rated once resolved or closed.' });
      return;
    }

    const rating = new Rating({
      complaintId: complaint._id,
      citizenId: req.user!.userId,
      ratingValue,
      feedback: {
        resolutionQuality,
        officerBehavior,
        responseSpeed,
        overallExperience,
        comments,
      },
    });

    await rating.save();

    // Mark ticket as Closed automatically if rated while Resolved
    if (complaint.status === 'Resolved') {
      complaint.status = 'Closed';
      await complaint.save();

      const history = new ComplaintHistory({
        complaintId: complaint._id,
        changedBy: req.user!.userId,
        previousStatus: 'Resolved',
        newStatus: 'Closed',
        remarks: 'Complaint closed automatically after citizen feedback.',
      });
      await history.save();
    }

    res.status(201).json({ message: 'Thank you for your rating!', rating });
  } catch (error) {
    logger.error('Error saving rating: %O', error);
    if ((error as any).code === 11000) {
      res.status(409).json({ error: 'This complaint has already been rated.' });
    } else {
      res.status(500).json({ error: 'Internal server error while saving rating.' });
    }
  }
};

export const getCategoriesPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await ComplaintCategory.find({});
    res.status(200).json(categories);
  } catch (error) {
    logger.error('Failed to fetch public categories: %O', error);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
};

export const getComplaintMessages = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const messages = await ComplaintMessage.find({ complaintId: id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name email role');
    res.status(200).json(messages);
  } catch (error) {
    logger.error('Failed to get complaint messages: %O', error);
    res.status(500).json({ error: 'Failed to retrieve message history.' });
  }
};

export const createComplaintMessage = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { messageText } = req.body;

  if (!messageText) {
    res.status(400).json({ error: 'Message content is required.' });
    return;
  }

  try {
    const message = new ComplaintMessage({
      complaintId: id,
      senderId: req.user!.userId,
      messageText,
    });

    await message.save();

    // Trigger push notification to other participant
    const complaint = await Complaint.findById(id);
    if (complaint) {
      const isCitizen = req.user!.role === 'CITIZEN';
      const recipientId = isCitizen ? complaint.assignedOfficerId : complaint.citizenId;
      if (recipientId) {
        sendPushNotification(
          recipientId.toString(),
          `New Message (${complaint.complaintNumber})`,
          `${req.user!.email.split('@')[0]}: ${messageText}`,
          { complaintId: id, type: 'CHAT_MESSAGE' }
        );
      }
    }

    res.status(201).json(message);
  } catch (error) {
    logger.error('Failed to create complaint message: %O', error);
    res.status(500).json({ error: 'Failed to save message.' });
  }
};

