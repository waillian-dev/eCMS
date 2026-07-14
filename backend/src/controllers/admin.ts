import { Request, Response } from 'express';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { ComplaintCategory } from '../models/ComplaintCategory';
import { Complaint } from '../models/Complaint';
import { Rating } from '../models/Rating';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../config/logger';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({}, '-passwordHash')
      .populate('roleId', 'name description')
      .populate('departmentId', 'name code');
    res.status(200).json(users);
  } catch (error) {
    logger.error('Failed to fetch admin users list: %O', error);
    res.status(500).json({ error: 'Failed to retrieve users list.' });
  }
};

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const depts = await Department.find({});
    res.status(200).json(depts);
  } catch (error) {
    logger.error('Failed to get departments: %O', error);
    res.status(500).json({ error: 'Failed to retrieve departments list.' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await ComplaintCategory.find({}).populate('defaultDepartmentId', 'name code');
    res.status(200).json(categories);
  } catch (error) {
    logger.error('Failed to get categories: %O', error);
    res.status(500).json({ error: 'Failed to retrieve categories list.' });
  }
};

export const getSystemAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Gather status distributions
    const statusAgg = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statuses = statusAgg.reduce((acc: any, cur: any) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    // 2. Priority distributions
    const priorityAgg = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const priorities = priorityAgg.reduce((acc: any, cur: any) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    // 3. Department distributions
    const deptAgg = await Complaint.aggregate([
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);
    const deptMapped = await Promise.all(
      deptAgg.map(async (item) => {
        const dept = await Department.findById(item._id);
        return {
          name: dept ? dept.name : 'Unknown',
          count: item.count,
        };
      })
    );

    // 4. Rating averages
    const ratingAgg = await Rating.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$ratingValue' },
          resolutionQuality: { $avg: '$feedback.resolutionQuality' },
          officerBehavior: { $avg: '$feedback.officerBehavior' },
          responseSpeed: { $avg: '$feedback.responseSpeed' },
          overallExperience: { $avg: '$feedback.overallExperience' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);
    const ratings = ratingAgg[0] || {
      avgRating: 0,
      resolutionQuality: 0,
      officerBehavior: 0,
      responseSpeed: 0,
      overallExperience: 0,
      totalRatings: 0,
    };

    // 5. Total volume
    const totalComplaints = await Complaint.countDocuments({});
    const totalUsers = await User.countDocuments({});

    // 6. Overdue tickets
    const totalOverdue = await Complaint.countDocuments({
      status: { $nin: ['Resolved', 'Closed', 'Rejected', 'Cancelled'] },
      slaDeadline: { $lt: new Date() },
    } as any);

    res.status(200).json({
      counts: {
        totalComplaints,
        totalUsers,
        totalOverdue,
      },
      statuses,
      priorities,
      departments: deptMapped,
      ratings,
    });
  } catch (error) {
    logger.error('Failed to calculate system analytics: %O', error);
    res.status(500).json({ error: 'Internal server error calculating analytics.' });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name email role');
    res.status(200).json(logs);
  } catch (error) {
    logger.error('Failed to get audit logs: %O', error);
    res.status(500).json({ error: 'Failed to retrieve system audit logs.' });
  }
};
