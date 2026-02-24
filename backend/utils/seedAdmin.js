require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true,
      onboardingCompleted: true,
      type: 'IIIT'
    });

    console.log('✅ Admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('⚠️  Change the password after first login!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
