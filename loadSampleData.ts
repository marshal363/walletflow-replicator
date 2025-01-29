import { readFileSync } from 'fs';
import { ConvexHttpClient } from 'convex/browser';

const JSONL_FILES = [
  'users.jsonl',
  'accounts.jsonl',
  'wallets.jsonl',
  'transactions.jsonl',
  'messages.jsonl',
  'contacts.jsonl',
  'notifications.jsonl',
  'activityLogs.jsonl'
];

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.error('Please set NEXT_PUBLIC_CONVEX_URL environment variable');
  process.exit(1);
}

async function loadData() {
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

  for (const file of JSONL_FILES) {
    console.log(`Loading data from ${file}...`);
    
    try {
      const content = readFileSync(file, 'utf-8');
      const records = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      const tableName = file.replace('.jsonl', '');
      
      for (const record of records) {
        try {
          await client.mutation(`${tableName}:create`, record);
          console.log(`Created record in ${tableName}`);
        } catch (error) {
          console.error(`Error creating record in ${tableName}:`, error);
        }
      }

      console.log(`Successfully processed ${records.length} records from ${file}`);
    } catch (error) {
      console.error(`Error loading data from ${file}:`, error);
    }
  }

  console.log('Data loading complete!');
  process.exit(0);
}

loadData().catch(console.error); 
