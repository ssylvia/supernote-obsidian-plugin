const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
  });
  
  readline.question('Have you changed the version in manifest-beta.json? (y/n): ', answer => {
	readline.close();
	if (answer.toLowerCase() !== 'y') {
	  process.exit(1);
	}
  });
