import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),kind:text('kind').notNull(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull(),revision:integer('revision').notNull().default(1)});
export const audit=sqliteTable('audit',{id:text('id').primaryKey(),action:text('action').notNull(),recordId:text('record_id').notNull(),at:text('at').notNull(),payload:text('payload').notNull()});
