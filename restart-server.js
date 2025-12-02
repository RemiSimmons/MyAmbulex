
const { exec } = require('child_process');

console.log('Checking for processes on port 5000...');

exec('lsof -ti:5000', (error, stdout, stderr) => {
  if (stdout.trim()) {
    const pids = stdout.trim().split('\n');
    console.log(`Found ${pids.length} process(es) on port 5000. Terminating...`);
    
    pids.forEach(pid => {
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`Terminated process ${pid}`);
      } catch (err) {
        console.log(`Process ${pid} already terminated or inaccessible`);
      }
    });
    
    setTimeout(() => {
      console.log('Starting server...');
      exec('npm run dev', (error, stdout, stderr) => {
        if (error) {
          console.error('Error starting server:', error);
          return;
        }
        console.log(stdout);
        if (stderr) console.error(stderr);
      });
    }, 2000);
  } else {
    console.log('Port 5000 is free. Starting server...');
    exec('npm run dev', (error, stdout, stderr) => {
      if (error) {
        console.error('Error starting server:', error);
        return;
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
    });
  }
});
