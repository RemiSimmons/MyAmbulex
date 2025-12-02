/**
 * Migration Script: Move documents from local filesystem to Supabase Storage
 * 
 * This script:
 * 1. Reads all documents from local filesystem
 * 2. Uploads them to Supabase Storage
 * 3. Updates database file paths
 * 4. Verifies migration success
 * 
 * Usage: node migrate-to-supabase-storage.js
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import 'dotenv/config';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

async function migrateDocuments() {
  // Dynamic import for ES modules
  const { supabaseStorage } = await import('./server/utils/supabase-storage.js');
  try {
    console.log('🚀 Starting migration to Supabase Storage...\n');

    // Check if Supabase Storage is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
      process.exit(1);
    }

    // Get all documents from database
    const documentsResult = await pool.query(`
      SELECT id, user_id, document_type, filename, file_path, mime_type
      FROM documents
      WHERE file_path NOT LIKE 'user_%/%'  -- Only migrate local filesystem paths
      ORDER BY id
    `);

    const documents = documentsResult.rows;
    console.log(`📊 Found ${documents.length} documents to migrate\n`);

    if (documents.length === 0) {
      console.log('✅ No documents to migrate. All documents are already in Supabase Storage.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const doc of documents) {
      try {
        console.log(`\n📄 Migrating document ${doc.id}: ${doc.filename}`);
        console.log(`   Current path: ${doc.file_path}`);

        // Check if file exists locally
        if (!fs.existsSync(doc.file_path)) {
          console.log(`   ⚠️  File not found locally, skipping...`);
          errors.push({
            id: doc.id,
            filename: doc.filename,
            error: 'File not found locally'
          });
          errorCount++;
          continue;
        }

        // Read file
        const fileBuffer = await readFile(doc.file_path);
        console.log(`   ✅ File read: ${fileBuffer.length} bytes`);

        // Extract document type from filename or use from database
        const documentType = doc.document_type || doc.filename.split('-')[0];
        
        // Extract just the filename (without path)
        const filename = path.basename(doc.file_path);

        // Upload to Supabase Storage
        const uploadResult = await supabaseStorage.uploadDocument(
          fileBuffer,
          doc.user_id,
          documentType,
          filename,
          doc.mime_type || 'application/octet-stream'
        );

        console.log(`   ✅ Uploaded to Supabase Storage: ${uploadResult.path}`);

        // Update database with new storage path
        await pool.query(
          `UPDATE documents SET file_path = $1 WHERE id = $2`,
          [uploadResult.path, doc.id]
        );

        console.log(`   ✅ Database updated`);

        // Optionally delete local file (uncomment if you want to remove local files after migration)
        // await unlink(doc.file_path);
        // console.log(`   ✅ Local file deleted`);

        successCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating document ${doc.id}:`, error.message);
        errors.push({
          id: doc.id,
          filename: doc.filename,
          error: error.message
        });
        errorCount++;
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📄 Total documents: ${documents.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`   - Document ${err.id} (${err.filename}): ${err.error}`);
      });
    }

    console.log('\n✅ Migration complete!');
    console.log('\n⚠️  Note: Local files are still present. Review the migration and delete them manually if desired.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateDocuments();

