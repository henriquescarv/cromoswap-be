'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_OTPRequests_purpose" ADD VALUE IF NOT EXISTS 'change_email';`
    );
  },

  async down() {
    // PostgreSQL does not support removing values from an enum type.
    // To rollback, drop and recreate the enum manually if needed.
  },
};
