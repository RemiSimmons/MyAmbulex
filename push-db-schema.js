import { exec } from 'child_process';

// Run the schema migration with the "create table" option selected
exec('echo "0" | npm run db:push', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log('Schema pushed successfully');
});