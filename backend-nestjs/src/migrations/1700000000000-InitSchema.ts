import {
  MigrationInterface,
  TableColumn,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    const timeType = dbType === 'postgres' ? 'timestamp' : 'datetime';
    const nowExpr = dbType === 'postgres' ? 'now()' : 'CURRENT_TIMESTAMP';

    if (!(await queryRunner.hasTable('users'))) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'email',
              type: 'varchar',
              length: '120',
              isUnique: true,
            },
            {
              name: 'passwordHash',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'role',
              type: 'enum',
              enum: ['ADMIN', 'USER'],
              default: "'USER'",
            },
            {
              name: 'isBlacklisted',
              type: dbType === 'postgres' ? 'boolean' : 'tinyint',
              default: dbType === 'postgres' ? 'false' : '0',
            },
          ],
        }),
        true,
      );
    }
    if (await queryRunner.hasTable('users')) {
      if (!(await queryRunner.hasColumn('users', 'email'))) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'email',
            type: 'varchar',
            length: '120',
            isNullable: true,
          }),
        );
      }
      if (!(await queryRunner.hasColumn('users', 'passwordHash'))) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
        );
      }
    }

    if (!(await queryRunner.hasTable('messages'))) {
      await queryRunner.createTable(
        new Table({
          name: 'messages',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'content',
              type: 'text',
            },
            {
              name: 'type',
              type: 'enum',
              enum: ['TEXT', 'IMAGE'],
              default: "'TEXT'",
            },
            {
              name: 'senderId',
              type: 'int',
            },
            {
              name: 'receiverId',
              type: 'int',
            },
            {
              name: 'isRead',
              type: dbType === 'postgres' ? 'boolean' : 'tinyint',
              default: dbType === 'postgres' ? 'false' : '0',
            },
            {
              name: 'createdAt',
              type: timeType,
              default: nowExpr,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'messages',
        new TableForeignKey({
          columnNames: ['senderId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'messages',
        new TableForeignKey({
          columnNames: ['receiverId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createIndex(
        'messages',
        new TableIndex({
          name: 'IDX_MESSAGES_PEER_TIME',
          columnNames: ['senderId', 'receiverId', 'createdAt'],
        }),
      );
    }
    if (await queryRunner.hasTable('messages')) {
      if (!(await queryRunner.hasColumn('messages', 'isRead'))) {
        await queryRunner.addColumn(
          'messages',
          new TableColumn({
            name: 'isRead',
            type: dbType === 'postgres' ? 'boolean' : 'tinyint',
            default: dbType === 'postgres' ? 'false' : '0',
          }),
        );
      }
    }

    if (!(await queryRunner.hasTable('quick_phrases'))) {
      await queryRunner.createTable(
        new Table({
          name: 'quick_phrases',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'title',
              type: 'varchar',
              length: '100',
            },
            {
              name: 'content',
              type: 'text',
            },
          ],
        }),
        true,
      );
    }

    if (!(await queryRunner.hasTable('forbidden_words'))) {
      await queryRunner.createTable(
        new Table({
          name: 'forbidden_words',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'word',
              type: 'varchar',
              length: '100',
              isUnique: true,
            },
          ],
        }),
        true,
      );
    }

    if (!(await queryRunner.hasTable('mail_configs'))) {
      await queryRunner.createTable(
        new Table({
          name: 'mail_configs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'host',
              type: 'varchar',
              length: '120',
            },
            {
              name: 'port',
              type: 'int',
            },
            {
              name: 'secure',
              type: dbType === 'postgres' ? 'boolean' : 'tinyint',
              default: dbType === 'postgres' ? 'false' : '0',
            },
            {
              name: 'user',
              type: 'varchar',
              length: '120',
            },
            {
              name: 'pass',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'fromEmail',
              type: 'varchar',
              length: '120',
            },
          ],
        }),
        true,
      );
    }

    if (!(await queryRunner.hasTable('email_codes'))) {
      await queryRunner.createTable(
        new Table({
          name: 'email_codes',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'email',
              type: 'varchar',
              length: '120',
            },
            {
              name: 'code',
              type: 'varchar',
              length: '20',
            },
            {
              name: 'purpose',
              type: 'varchar',
              length: '30',
              default: "'REGISTER'",
            },
            {
              name: 'expiresAt',
              type: timeType,
            },
            {
              name: 'used',
              type: dbType === 'postgres' ? 'boolean' : 'tinyint',
              default: dbType === 'postgres' ? 'false' : '0',
            },
            {
              name: 'createdAt',
              type: timeType,
              default: nowExpr,
            },
          ],
        }),
        true,
      );
      await queryRunner.createIndex(
        'email_codes',
        new TableIndex({
          name: 'IDX_EMAIL_CODES_QUERY',
          columnNames: ['email', 'purpose', 'used'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('email_codes')) {
      await queryRunner.dropTable('email_codes');
    }
    if (await queryRunner.hasTable('mail_configs')) {
      await queryRunner.dropTable('mail_configs');
    }
    if (await queryRunner.hasTable('forbidden_words')) {
      await queryRunner.dropTable('forbidden_words');
    }
    if (await queryRunner.hasTable('quick_phrases')) {
      await queryRunner.dropTable('quick_phrases');
    }
    if (await queryRunner.hasTable('messages')) {
      await queryRunner.dropTable('messages');
    }
    if (await queryRunner.hasTable('users')) {
      await queryRunner.dropTable('users');
    }
  }
}
