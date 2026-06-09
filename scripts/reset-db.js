const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const dbJournalPath = path.join(__dirname, '..', 'prisma', 'dev.db-journal');

try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted dev.db');
  }
  if (fs.existsSync(dbJournalPath)) {
    fs.unlinkSync(dbJournalPath);
    console.log('Deleted dev.db-journal');
  }
  console.log('Database reset successful.');
} catch (err) {
  console.error('Failed to reset database:', err);
  process.exit(1);
}
