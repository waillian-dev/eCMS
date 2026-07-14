import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Permission } from '../models/Permission';
import { Role } from '../models/Role';
import { Department } from '../models/Department';
import { ComplaintCategory } from '../models/ComplaintCategory';
import { User } from '../models/User';
import { logger } from '../config/logger';

const permissionsToSeed = [
  { name: 'CREATE_COMPLAINT', description: 'Can create a complaint' },
  { name: 'READ_COMPLAINT_OWN', description: 'Can view own complaints' },
  { name: 'READ_COMPLAINT_ALL', description: 'Can view all complaints' },
  { name: 'UPDATE_COMPLAINT_STATUS', description: 'Can update complaint status' },
  { name: 'ASSIGN_COMPLAINT', description: 'Can assign complaints' },
  { name: 'ESCALATE_COMPLAINT', description: 'Can escalate complaints' },
  { name: 'MANAGE_USERS', description: 'Can manage other users' },
  { name: 'MANAGE_SYSTEM', description: 'Can manage system settings, categories, departments' },
];

const departmentsToSeed = [
  { name: 'Safety & Security', code: 'SAFE', description: 'Reckless driving, passenger safety, physical disputes and threats.' },
  { name: 'Billing & Fares', code: 'FARE', description: 'Overcharging, meter tampering, wrong fee calculation and refund requests.' },
  { name: 'Driver Relations', code: 'DRIV', description: 'Rude behavior, refusal to carry, route deviation and service feedback.' },
  { name: 'Vehicle Maintenance', code: 'VEHI', description: 'Unclean vehicles, air conditioning failure, broken seats and warning lights.' },
  { name: 'Lost & Found', code: 'LOST', description: 'Retrieval of items left behind in cabs during trips.' },
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecms';
    logger.info(`Seeding database at ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // Clear existing data (optional, but good for reset/seed)
    await Permission.deleteMany({});
    await Role.deleteMany({});
    await Department.deleteMany({});
    await ComplaintCategory.deleteMany({});
    await User.deleteMany({});

    logger.info('Cleaned database.');

    // 1. Seed Permissions
    const seededPermissions = await Permission.insertMany(permissionsToSeed);
    logger.info(`Seeded ${seededPermissions.length} permissions.`);

    // Helper to get permission IDs by name
    const getPermIds = (names: string[]) => {
      return seededPermissions
        .filter((p) => names.includes(p.name))
        .map((p) => p._id);
    };

    // 2. Seed Roles
    const citizenRole = new Role({
      name: 'CITIZEN',
      description: 'Public citizens filing complaints',
      permissions: getPermIds(['CREATE_COMPLAINT', 'READ_COMPLAINT_OWN']),
    });

    const officerRole = new Role({
      name: 'SUPPORT_OFFICER',
      description: 'Support staff resolving tickets',
      permissions: getPermIds(['READ_COMPLAINT_ALL', 'UPDATE_COMPLAINT_STATUS']),
    });

    const managerRole = new Role({
      name: 'DEPT_MANAGER',
      description: 'Department heads assigning and escalating tickets',
      permissions: getPermIds(['READ_COMPLAINT_ALL', 'UPDATE_COMPLAINT_STATUS', 'ASSIGN_COMPLAINT', 'ESCALATE_COMPLAINT']),
    });

    const adminRole = new Role({
      name: 'SUPER_ADMIN',
      description: 'System administrators with complete control',
      permissions: seededPermissions.map((p) => p._id),
    });

    const roles = await Role.insertMany([citizenRole, officerRole, managerRole, adminRole]);
    logger.info(`Seeded ${roles.length} roles.`);

    // 3. Seed Departments
    const seededDepts = await Department.insertMany(departmentsToSeed);
    logger.info(`Seeded ${seededDepts.length} departments.`);

    // Helper to get department ID by code
    const getDeptId = (code: string) => {
      const dept = seededDepts.find((d) => d.code === code);
      if (!dept) throw new Error(`Department with code ${code} not found`);
      return dept._id;
    };

    const categoriesToSeed = [
      { name: 'Reckless Driving', description: 'Driver speeding, violating traffic rules or driving dangerously.', defaultDepartmentId: getDeptId('SAFE'), defaultPriority: 'High' },
      { name: 'Overcharging & Fare Disputes', description: 'Driver demanding extra money or meter tampering.', defaultDepartmentId: getDeptId('FARE'), defaultPriority: 'Medium' },
      { name: 'Rude & Unprofessional Behavior', description: 'Driver using offensive language or exhibiting aggressive behavior.', defaultDepartmentId: getDeptId('DRIV'), defaultPriority: 'Medium' },
      { name: 'Vehicle Uncleanliness', description: 'Unpleasant odors, trash, or dirty seating in the vehicle.', defaultDepartmentId: getDeptId('VEHI'), defaultPriority: 'Low' },
      { name: 'Lost Items Recovery', description: 'Recovering luggage, wallets, or phones left in the cab.', defaultDepartmentId: getDeptId('LOST'), defaultPriority: 'Medium' },
      { name: 'Assault / Safety Threats', description: 'Physical threats or sexual harassment by the driver.', defaultDepartmentId: getDeptId('SAFE'), defaultPriority: 'Critical' },
      { name: 'Refusal to Carry Passenger', description: 'Driver refusing trip booking or refusing to drive to location.', defaultDepartmentId: getDeptId('DRIV'), defaultPriority: 'Low' },
      { name: 'AC Malfunction', description: 'Air conditioning is broken or driver refuses to turn it on.', defaultDepartmentId: getDeptId('VEHI'), defaultPriority: 'Low' },
    ];

    const seededCategories = await ComplaintCategory.insertMany(categoriesToSeed);
    logger.info(`Seeded ${seededCategories.length} categories.`);

    // 5. Seed Users
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('AdminPassword123', salt);
    const managerPassword = await bcrypt.hash('ManagerPassword123', salt);
    const officerPassword = await bcrypt.hash('OfficerPassword123', salt);
    const citizenPassword = await bcrypt.hash('CitizenPassword123', salt);

    const superAdminRole = roles.find((r) => r.name === 'SUPER_ADMIN')!;
    const deptManagerRole = roles.find((r) => r.name === 'DEPT_MANAGER')!;
    const supportOfficerRole = roles.find((r) => r.name === 'SUPPORT_OFFICER')!;
    const customerRole = roles.find((r) => r.name === 'CITIZEN')!;

    const usersToSeed = [
      {
        name: 'System Administrator',
        email: 'admin@ecms.gov',
        passwordHash: adminPassword,
        roleId: superAdminRole._id,
        status: 'Active',
      },
      {
        name: 'John Driver Manager',
        email: 'manager@ecms.gov',
        passwordHash: managerPassword,
        roleId: deptManagerRole._id,
        departmentId: getDeptId('DRIV'),
        status: 'Active',
      },
      {
        name: 'Sarah Safety Officer',
        email: 'officer@ecms.gov',
        passwordHash: officerPassword,
        roleId: supportOfficerRole._id,
        departmentId: getDeptId('SAFE'),
        status: 'Active',
      },
      {
        name: 'Jane Citizen',
        email: 'citizen@ecms.gov',
        passwordHash: citizenPassword,
        roleId: customerRole._id,
        status: 'Active',
      },
    ];

    const seededUsers = await User.insertMany(usersToSeed);
    logger.info(`Seeded ${seededUsers.length} users.`);

    logger.info('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database: %O', error);
    process.exit(1);
  }
};

seed();
