'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('AlbumTemplates', 'name_json', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE "AlbumTemplates"
      SET "name_json" = json_build_object(
        'pt', "name",
        'en', "name",
        'es', "name",
        'ita', "name",
        'ale', "name"
      )
    `);

    await queryInterface.removeColumn('AlbumTemplates', 'name');
    await queryInterface.renameColumn('AlbumTemplates', 'name_json', 'name');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('AlbumTemplates', 'name_str', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE "AlbumTemplates" SET "name_str" = "name"->>'pt'
    `);

    await queryInterface.removeColumn('AlbumTemplates', 'name');
    await queryInterface.renameColumn('AlbumTemplates', 'name_str', 'name');
  },
};
